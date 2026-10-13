import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual, createHash } from 'crypto';
import prisma from '@/lib/prisma';
import { isTestAccount } from '@/lib/test-account';
import { processEnrollmentActivation } from '@/lib/enrollment-activation';

function extractInfoFromDescription(description: string) {
    let phone = null;
    const phoneMatch = description.match(/SDT[\s\._]*(\d{6,11})/i);
    if (phoneMatch) {
        phone = phoneMatch[1];
    } else {
        const mobileMatch = description.match(/\b(0\d{9,10}|[1-9]\d{8,9})\b/);
        if (mobileMatch) {
            phone = mobileMatch[1];
        }
    }

    let userId = null;
    const userIdMatch = description.match(/HV[\s\._]*(\d+)/i);
    if (userIdMatch) {
        userId = parseInt(userIdMatch[1]);
    }

    let courseCode = null;
    const courseCodeMatch = description.match(/COC[\s\._]*(\w+)/i);
    if (courseCodeMatch) {
        courseCode = courseCodeMatch[1].toUpperCase();
    } else {
        if (/BRK/i.test(description)) {
            courseCode = 'BRK';
        } else if (/MB/i.test(description)) {
            courseCode = 'MB';
        }
    }

    return { phone, userId, courseCode };
}

// Xác thực webhook theo chuẩn SePay: header "Authorization: Apikey <key>"
// Key do user tự đặt khi tạo webhook trên SePay dashboard, lưu trong env SEPAY_WEBHOOK_API_KEY.
function isAuthorizedWebhook(req: NextRequest): boolean {
    const expected = process.env.SEPAY_WEBHOOK_API_KEY?.trim();
    if (!expected) return false;
    const header = req.headers.get('authorization');
    if (!header) return false;
    const a = Buffer.from(header);
    const b = Buffer.from(`Apikey ${expected}`);
    return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
    // 0. Xác thực — chặn request giả mạo kích hoạt miễn phí
    if (!isAuthorizedWebhook(req)) {
        console.warn('⚠️ [SEPAY WEBHOOK] Unauthorized access attempt');
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    let txRecordId: number | null = null;
    try {
        const body = await req.json();

        // SePay webhook format
        // https://docs.sepay.vn/tich-hop-he-thong/webhook
        const {
            id: sepayId,
            gateway,
            transactionDate,
            accountNumber,
            content,
            transferType,
            transferAmount
        } = body;

        console.log(`🔔 [SEPAY WEBHOOK] id=${sepayId || 'n/a'} amount=${transferAmount} type=${transferType}`);

        // Chỉ xử lý giao dịch nhận tiền
        if (transferType !== 'in' || !accountNumber || !transferAmount || !content) {
            return NextResponse.json({ success: true, message: 'Ignored or invalid payload' }, { status: 200 });
        }

        // Dedup key: ưu tiên id của SePay (docs khuyến nghị), fallback hash nội dung+số tiền+thời gian
        const externalId = sepayId
            ? `sepay:${sepayId}`
            : `sepay:${createHash('sha256').update(`${accountNumber}|${transferAmount}|${content}|${transactionDate || ''}`).digest('hex')}`;

        // Ghi nhận giao dịch trước khi xử lý để chống retry/trùng lặp (SePay retry tối đa 7 lần)
        let txRecord;
        try {
            txRecord = await prisma.processedTransaction.create({
                data: {
                    source: 'SEPAY',
                    externalId,
                    amount: Number(transferAmount),
                    accountNumber: String(accountNumber),
                    bankName: gateway || null,
                    content: String(content),
                    transferTime: transactionDate ? new Date(transactionDate) : null,
                    status: 'PROCESSING',
                }
            });
        } catch (dupErr: any) {
            if (dupErr?.code === 'P2002') {
                const existing = await prisma.processedTransaction.findUnique({ where: { externalId } });
                // Giao dịch từng thất bại thì cho phép retry xử lý lại
                if (existing && existing.status === 'FAILED') {
                    txRecord = existing;
                    txRecordId = existing.id;
                } else {
                    return NextResponse.json({ success: true, message: 'Duplicate transaction, already processed' }, { status: 200 });
                }
            } else {
                throw dupErr;
            }
        }
        txRecordId = txRecord.id;

        const markUnmatched = async (reason: string) => {
            await prisma.processedTransaction.update({
                where: { id: txRecord.id },
                data: { status: 'UNMATCHED', reason }
            });
        };

        // 1. Tìm Teacher dựa trên accountNumber
        const bankAccount = await prisma.userBankAccount.findFirst({
            where: { accountNumber: String(accountNumber) }
        });

        if (!bankAccount) {
            const reason = `Không tìm thấy tài khoản ngân hàng khớp với accountNumber: ${accountNumber}`;
            console.log(`❌ [SEPAY] ${reason}`);
            await markUnmatched(reason);
            return NextResponse.json({ success: true, message: 'Account not found' }, { status: 200 });
        }

        const teacherId = bankAccount.userId;

        // 2. Trích xuất thông tin từ nội dung chuyển khoản
        const parsed = extractInfoFromDescription(String(content));
        if (!parsed.userId && !parsed.phone) {
            const reason = `Không trích xuất được số điện thoại hoặc mã HV từ nội dung: ${content}`;
            console.log(`❌ [SEPAY] ${reason}`);
            await markUnmatched(reason);
            return NextResponse.json({ success: true, message: 'Missing user identifier in content' }, { status: 200 });
        }

        // 3. Tìm các Enrollments đang PENDING của khóa học do Teacher này dạy
        const pendingEnrollments = await prisma.enrollment.findMany({
            where: {
                status: 'PENDING',
                course: { teacherId: teacherId }
            },
            include: {
                course: {
                    select: {
                        id_khoa: true,
                        phi_coc: true,
                        name_lop: true,
                        autoVerifyConfig: { select: { alternativeCodes: true } }
                    }
                },
                user: { select: { id: true, name: true, phone: true, email: true, referrerId: true } }
            }
        });

        if (pendingEnrollments.length === 0) {
            const reason = `Không có enrollment PENDING nào của giảng viên #${teacherId} để khớp`;
            console.log(`❌ [SEPAY] ${reason}`);
            await markUnmatched(reason);
            return NextResponse.json({ success: true, message: 'No pending enrollments for this teacher' }, { status: 200 });
        }

        let matched = 0;

        // 4. Tìm kiếm Enrollment phù hợp và kích hoạt
        for (const enrollment of pendingEnrollments) {
            if (isTestAccount(enrollment.userId)) continue;

            const userPhone = enrollment.user.phone?.replace(/\D/g, '') || '';
            const emailPhone = parsed.phone || '';
            const userIdMatch = parsed.userId && parsed.userId === enrollment.userId;
            const phoneMatch = userPhone && emailPhone && userPhone.includes(emailPhone);
            const normalizeCode = (s: string) => s.replace(/[^A-Z0-9]/gi, '').toUpperCase();

            let courseCodeMatch = parsed.courseCode && normalizeCode(enrollment.course.id_khoa).includes(normalizeCode(parsed.courseCode));

            if (!courseCodeMatch && parsed.courseCode) {
                const altCodes: string[] = enrollment.course.autoVerifyConfig?.alternativeCodes
                    ? JSON.parse(enrollment.course.autoVerifyConfig.alternativeCodes)
                    : [];
                if (altCodes.some(code => parsed.courseCode === code)) {
                    courseCodeMatch = true;
                }
            }

            const amountMatch = transferAmount >= (enrollment.phi_coc || enrollment.course.phi_coc || 0);

            if (!((parsed.userId ? userIdMatch : phoneMatch) && courseCodeMatch && amountMatch)) continue;

            // Tiến hành kích hoạt
            console.log(`✅ [SEPAY] Khớp giao dịch! Tiến hành duyệt cho HV ${enrollment.userId}, khóa ${enrollment.course.id_khoa}`);

            const activationResult = await processEnrollmentActivation({
                enrollmentId: enrollment.id,
                method: 'AUTO_SEPAY',
                transferData: {
                    amount: transferAmount,
                    phone: parsed.phone,
                    courseCode: parsed.courseCode,
                    bankName: gateway || bankAccount.bankName || 'SePay',
                    accountNumber: String(accountNumber),
                    transferTime: transactionDate ? new Date(transactionDate) : new Date(),
                    content: String(content),
                }
            });

            if (activationResult.success) {
                matched++;
                await prisma.processedTransaction.update({
                    where: { id: txRecord.id },
                    data: { status: 'PROCESSED', enrollmentId: enrollment.id }
                });
                break; // Xử lý xong 1 enrollment, thoát khỏi loop (1 giao dịch = 1 khóa học)
            } else {
                console.error(`❌ [SEPAY] Lỗi khi kích hoạt: ${activationResult.error}`);
            }
        }

        if (matched === 0) {
            const reason = `Không khớp enrollment PENDING nào (định danh: ${parsed.userId ? 'HV ' + parsed.userId : 'SĐT ' + parsed.phone}, mã khóa: ${parsed.courseCode || 'không có'}, số tiền: ${Number(transferAmount).toLocaleString()}đ)`;
            await markUnmatched(reason);
        }

        return NextResponse.json({ success: true, matched, message: 'Processed webhook' }, { status: 200 });
    } catch (error: any) {
        console.error('❌ [SEPAY WEBHOOK ERROR]:', error);
        // Đánh dấu FAILED để lần retry sau của SePay được xử lý lại (SePay retry tối đa 7 lần)
        if (txRecordId) {
            try {
                await prisma.processedTransaction.update({
                    where: { id: txRecordId },
                    data: { status: 'FAILED', reason: error.message?.slice(0, 500) || 'Unknown error' }
                });
            } catch (markErr) {
                console.error('⚠️ [SEPAY] Không đánh dấu được FAILED:', markErr);
            }
        }
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
