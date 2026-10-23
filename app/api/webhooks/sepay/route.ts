import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual, createHash } from 'crypto';
import { buildTxFingerprint, TX_FINAL_STATES } from '@/lib/payment-dedup';
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

// So sánh timing-safe 2 chuỗi
function safeEqual(a: string, b: string): boolean {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    return ba.length === bb.length && timingSafeEqual(ba, bb);
}

// Lấy key từ header "Authorization: Apikey <key>" theo chuẩn SePay
function extractApiKey(req: NextRequest): string | null {
    const header = req.headers.get('authorization');
    if (!header || !header.startsWith('Apikey ')) return null;
    return header.slice('Apikey '.length).trim() || null;
}

// Xác thực webhook:
//  - Ưu tiên key RIÊNG của tài khoản ngân hàng (admin cấp cho từng GV,
//    lưu dạng SHA-256 trong UserBankAccount.webhookApiKeyHash).
//  - Fallback key CHUNG trong env SEPAY_WEBHOOK_API_KEY (cho TK của admin
//    hoặc khi TK chưa được cấp key riêng).
function isAuthorizedWebhook(providedKey: string | null, bankAccount: { webhookApiKeyHash: string | null } | null): boolean {
    if (!providedKey) return false;
    if (bankAccount?.webhookApiKeyHash) {
        const providedHash = createHash('sha256').update(providedKey).digest('hex');
        return safeEqual(providedHash, bankAccount.webhookApiKeyHash);
    }
    const globalKey = process.env.SEPAY_WEBHOOK_API_KEY?.trim();
    if (!globalKey) return false;
    return safeEqual(providedKey, globalKey);
}

export async function POST(req: NextRequest) {
    let txRecordId: number | null = null;
    try {
        const body = await req.json();

        // 0. Xác thực — chặn request giả mạo kích hoạt miễn phí.
        // Cần accountNumber trước để biết dùng key riêng của TK nào.
        const providedKey = extractApiKey(req);
        const authAccount = body?.accountNumber
            ? await prisma.userBankAccount.findFirst({
                where: { accountNumber: String(body.accountNumber) },
                select: { id: true, userId: true, bankName: true, webhookApiKeyHash: true }
            })
            : null;
        if (!isAuthorizedWebhook(providedKey, authAccount)) {
            console.warn('⚠️ [SEPAY WEBHOOK] Unauthorized access attempt');
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

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

        // Dedup 2 lớp:
        //  - externalId (id của SePay): chống retry của chính SePay
        //  - fingerprint (nội dung + số tiền + ngày): chống trùng LIÊN KÊNH
        //    (cùng giao dịch đã được kênh email xử lý trước đó)
        const externalId = sepayId
            ? `sepay:${sepayId}`
            : `sepay:${createHash('sha256').update(`${accountNumber}|${transferAmount}|${content}|${transactionDate || ''}`).digest('hex')}`;
        const transferTime = transactionDate ? new Date(transactionDate) : null;
        const fingerprint = buildTxFingerprint({
            content: String(content),
            amount: Number(transferAmount),
            transferTime,
        });

        // Ghi nhận giao dịch trước khi xử lý để chống retry/trùng lặp (SePay retry tối đa 7 lần)
        let txRecord;
        const existingTx = await prisma.processedTransaction.findFirst({
            where: { OR: [{ externalId }, { fingerprint }] }
        });
        if (existingTx && TX_FINAL_STATES.includes(existingTx.status)) {
            // Đã xử lý (kênh này hoặc kênh email) — bỏ qua
            return NextResponse.json({ success: true, message: 'Duplicate transaction, already processed' }, { status: 200 });
        }
        if (existingTx) {
            // UNMATCHED | FAILED | DISMISSED → cho xử lý lại, tái sử dụng bản ghi
            txRecord = await prisma.processedTransaction.update({
                where: { id: existingTx.id },
                data: { status: 'PROCESSING', reason: null, source: 'SEPAY', externalId }
            });
        } else {
            try {
                txRecord = await prisma.processedTransaction.create({
                    data: {
                        source: 'SEPAY',
                        externalId,
                        fingerprint,
                        amount: Number(transferAmount),
                        accountNumber: String(accountNumber),
                        bankName: gateway || null,
                        content: String(content),
                        transferTime,
                        status: 'PROCESSING',
                    }
                });
            } catch (dupErr: any) {
                if (dupErr?.code === 'P2002') {
                    // Race: tiến trình/kênh khác vừa ghi nhận
                    return NextResponse.json({ success: true, message: 'Duplicate transaction, already processed' }, { status: 200 });
                }
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

        // 1. Tìm Teacher dựa trên accountNumber (đã tra ở bước xác thực → tái sử dụng)
        const bankAccount = authAccount;

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

                // Thông báo giống kênh AUTO_EMAIL (lib/auto-verify.ts): activity log
                // PAYMENT_VERIFIED + Telegram 'ACTIVATE' + email kích hoạt cho học viên.
                // Mỗi khối bọc try/catch riêng: lỗi thông báo KHÔNG được làm hỏng webhook.
                const notifyBankName = gateway || bankAccount.bankName || 'SePay';
                try {
                    const { logActivity } = await import('@/lib/activity-logger');
                    await logActivity({
                        userId: enrollment.userId,
                        action: 'PAYMENT_VERIFIED',
                        detail: `Xác minh thanh toán tự động: ${enrollment.course.name_lop} - ${Number(transferAmount).toLocaleString()}đ`,
                        metadata: { courseId: enrollment.courseId, enrollmentId: enrollment.id, amount: Number(transferAmount), bankName: notifyBankName },
                        createdAt: transactionDate ? new Date(transactionDate) : new Date(),
                    });
                } catch (logErr) {
                    console.error(`⚠️ [SEPAY] Không ghi được PAYMENT_VERIFIED cho HV ${enrollment.userId}:`, logErr);
                }

                try {
                    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://giautoandien.io.vn';
                    let refLink = '';
                    if (activationResult.referrerId) {
                        const affRef = await prisma.affiliateRef.findFirst({ where: { userId: activationResult.referrerId, isActive: true } });
                        const refCode = affRef?.refKey || String(activationResult.referrerId);
                        refLink = `🔗 Link ref: ${appUrl}/khoa-hoc/${enrollment.course.id_khoa}?ref=${refCode}\n`;
                    }
                    const brkPlacementMsg = activationResult.brkResult?.placement
                        ? `📍 Vị trí: Dưới <b>#${activationResult.brkResult.placement.parentId} ${activationResult.brkResult.placement.parentName}</b>\n` +
                            (activationResult.brkResult.placement.chain.length > 1
                                ? `🔗 Tuyến trên: ${activationResult.brkResult.placement.chain.slice(1).map((a: any) => `#${a.userId} ${a.name}`).join(' → ')}\n`
                                : '')
                        : '';
                    const msgAdmin = `✅ <b>KÍCH HOẠT TỰ ĐỘNG THÀNH CÔNG</b>\n\n` +
                        `👤 Thành viên: <b>${enrollment.user.name}</b> (#${enrollment.userId})\n` +
                        `📞 SĐT: ${enrollment.user.phone}\n` +
                        `🎓 Khóa học: <b>${enrollment.course.name_lop} (${enrollment.course.id_khoa})</b>\n` +
                        `${refLink}💰 Số tiền: ${Number(transferAmount).toLocaleString()}đ\n` +
                        `🏦 Ngân hàng: ${notifyBankName}\n` +
                        `📡 Nguồn: SePay\n` +
                        `📅 Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}\n` +
                        brkPlacementMsg;
                    const { sendTelegram } = await import('@/lib/notifications');
                    await sendTelegram(msgAdmin, 'ACTIVATE');
                } catch (teleErr) {
                    console.error(`⚠️ [SEPAY] Không gửi được Telegram kích hoạt cho HV ${enrollment.userId}:`, teleErr);
                }

                if (enrollment.user.email) {
                    try {
                        const { sendActivationEmail } = await import('@/lib/notifications');
                        await sendActivationEmail(
                            enrollment.user.email,
                            enrollment.user.name || 'Bạn',
                            enrollment.user.id,
                            enrollment.course.name_lop || enrollment.course.id_khoa,
                            null
                        );
                    } catch (mailErr) {
                        console.error(`⚠️ [SEPAY] Không gửi được email kích hoạt cho HV ${enrollment.userId}:`, mailErr);
                    }
                }

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
