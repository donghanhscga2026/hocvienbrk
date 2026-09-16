import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        console.log('🔔 [SEPAY WEBHOOK] Nhận được payload:', body);

        // SePay webhook format
        // https://docs.sepay.vn/tich-hop-he-thong/webhook
        const {
            gateway,
            transactionDate,
            accountNumber,
            content,
            transferType,
            transferAmount
        } = body;

        // Chỉ xử lý giao dịch nhận tiền
        if (transferType !== 'in' || !accountNumber || !transferAmount || !content) {
            return NextResponse.json({ success: true, message: 'Ignored or invalid payload' }, { status: 200 });
        }

        // 1. Tìm Teacher dựa trên accountNumber
        const bankAccount = await prisma.userBankAccount.findFirst({
            where: { accountNumber: accountNumber }
        });

        if (!bankAccount) {
            console.log(`❌ [SEPAY] Không tìm thấy tài khoản ngân hàng nào khớp với accountNumber: ${accountNumber}`);
            return NextResponse.json({ success: true, message: 'Account not found' }, { status: 200 });
        }

        const teacherId = bankAccount.userId;

        // 2. Trích xuất thông tin từ nội dung chuyển khoản
        const parsed = extractInfoFromDescription(content);
        if (!parsed.userId && !parsed.phone) {
            console.log(`❌ [SEPAY] Không trích xuất được số điện thoại hoặc mã HV từ nội dung: ${content}`);
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
                    accountNumber: accountNumber,
                    transferTime: transactionDate ? new Date(transactionDate) : new Date(),
                    content: content,
                }
            });

            if (activationResult.success) {
                matched++;
                break; // Xử lý xong 1 enrollment, thoát khỏi loop (1 giao dịch = 1 khóa học)
            } else {
                console.error(`❌ [SEPAY] Lỗi khi kích hoạt: ${activationResult.error}`);
            }
        }

        return NextResponse.json({ success: true, matched, message: 'Processed webhook' }, { status: 200 });
    } catch (error: any) {
        console.error('❌ [SEPAY WEBHOOK ERROR]:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
