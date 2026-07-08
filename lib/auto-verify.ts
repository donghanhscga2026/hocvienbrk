import { google } from 'googleapis';
import prisma from '@/lib/prisma';
import { sendTelegramAdmin, sendSuccessEmail } from './notifications';

function extractTextFromHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseSacombankEmail(htmlContent: string) {
  const text = extractTextFromHtml(htmlContent);
  const contentMatch = text.match(/(?:Description|Nội dung)[\s\/]*(.+?)(?=\s{2,}|$)/i);
  const description = contentMatch ? contentMatch[1].trim() : '';

  let phone = null;
  const phoneMatch = description.match(/SDT[\s\._]*(\d{6,11})/i);
  if (phoneMatch) {
    phone = phoneMatch[1];
  } else {
    // Fallback: Tìm số điện thoại di động Việt Nam dạng 9-11 chữ số
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
    // Fallback: Tự động phát hiện mã hệ thống MB hoặc BRK
    if (/BRK/i.test(description)) {
      courseCode = 'BRK';
    } else if (/MB/i.test(description)) {
      courseCode = 'MB';
    }
  }

  const amountMatch = text.match(/(?:Transaction|Phát sinh)[\s:+]*([\d,\.]+)\s*VND/i);

  let amount = 0;
  if (amountMatch) {
    const amountStr = amountMatch[1].replace(/\./g, '').replace(/,/g, '');
    amount = parseInt(amountStr) || 0;
  }

  let transferTime: Date | null = null
  const dateMatch = text.match(/(?:Ngày|Date)\s*\/?\s*[Dt]ate\s*[:\t\s]*(\d{2})[\/\-](\d{2})[\/\-](\d{4})\s+(\d{1,2}):(\d{2})/i)
  if (dateMatch) {
    const [, dd, mm, yyyy, hh, min] = dateMatch
    transferTime = new Date(`${yyyy}-${mm}-${dd}T${hh.padStart(2, '0')}:${min}:00+07:00`)
  }

  return {
    phone,
    userId,
    courseCode,
    amount: amount,
    content: description,
    transferTime,
  };
}

// Helper wrapper to safely call Gmail API with exponential backoff retry on 429
async function callGmailWithRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorMsg = error.message || '';
    const causeMsg = error.cause?.message || '';
    const fullMsg = `${errorMsg} ${causeMsg}`;

    if (error.code === 429) {
      // Trích xuất mốc phạt rate limit của Google
      const match = fullMsg.match(/Retry after\s+([^\s]+)/i);
      if (match) {
        const penaltyTimeStr = match[1];
        try {
          const { PrismaClient } = await import('@prisma/client');
          const prismaClient = new PrismaClient();
          await prismaClient.systemConfig.upsert({
            where: { key: 'gmail_rate_limit_until' },
            update: { value: penaltyTimeStr },
            create: { key: 'gmail_rate_limit_until', value: penaltyTimeStr }
          });
          console.log(`⏳ Đã ghi nhận mốc phạt Rate Limit của Google đến: ${penaltyTimeStr}`);
        } catch (dbErr) {
          console.error('⚠️ Lỗi ghi nhận mốc phạt vào DB:', dbErr);
        }
      }

      if (retries > 0) {
        console.warn(`[GMAIL API] Rate Limit 429. Retrying in ${delayMs}ms... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return callGmailWithRetry(fn, retries - 1, delayMs * 2);
      }
    }
    throw error;
  }
}

export async function processPaymentEmails() {
  // 1. Kiểm tra database penalty rate-limit để tránh bị Google cộng dồn hình phạt
  const penaltyKey = 'gmail_rate_limit_until';
  try {
    const existingPenalty = await prisma.systemConfig.findUnique({
      where: { key: penaltyKey }
    });
    if (existingPenalty && existingPenalty.value) {
      const penaltyTime = new Date(String(existingPenalty.value)).getTime();
      if (Date.now() < penaltyTime) {
        const diffSec = Math.ceil((penaltyTime - Date.now()) / 1000);
        console.log(`⏳ Gmail API is currently penalized by Google. Skipping scan for another ${diffSec} seconds to avoid penalty extension...`);
        return { processed: 0, matched: 0, locked: true, penalized: true, retryAfter: String(existingPenalty.value) };
      }
    }
  } catch (penaltyErr) {
    console.error('⚠️ Lỗi kiểm tra database penalty lock:', penaltyErr);
  }

  // 2. Kiểm tra database lock để tránh chạy song song trùng lặp (giới hạn 1 tiến trình chạy tại một thời điểm)
  const lockKey = 'gmail_scan_lock';
  const nowMs = Date.now();
  try {
    const existingLock = await prisma.systemConfig.findUnique({
      where: { key: lockKey }
    });
    
    if (existingLock && existingLock.value) {
      const lockTime = parseInt(String(existingLock.value));
      // Nếu lock được tạo cách đây dưới 30 giây, bỏ qua để tránh chạy song song
      if (nowMs - lockTime < 30000) {
        console.log('🔒 Gmail scan is locked by another active thread. Skipping to avoid 429 Rate Limit...');
        return { processed: 0, matched: 0, locked: true };
      }
    }
    
    // Tạo/Cập nhật lock mới
    await prisma.systemConfig.upsert({
      where: { key: lockKey },
      update: { value: nowMs.toString() },
      create: { key: lockKey, value: nowMs.toString() }
    });
  } catch (lockErr) {
    console.error('⚠️ Lỗi kiểm tra database lock:', lockErr);
  }

  try {
    const oAuth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      'http://localhost'
    );
    oAuth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

    const configs = await prisma.autoVerifyConfig.findMany({ where: { enabled: true } });
    if (configs.length === 0) return { processed: 0, matched: 0 };

    const emailQueries = configs.map(c => `from:${c.emailFrom} ${c.emailQuery}`).join(' OR ');

    // Query emails trong 2 ngày gần nhất để giảm thiểu quota sử dụng của Gmail API (dùng Unix epoch seconds)
    const scanDaysAgo = new Date()
    scanDaysAgo.setDate(scanDaysAgo.getDate() - 2)
    const afterEpoch = Math.floor(scanDaysAgo.getTime() / 1000)

    const response = await callGmailWithRetry(() => gmail.users.messages.list({
      userId: 'me',
      q: `(${emailQueries}) after:${afterEpoch}`,
      maxResults: 50
    }));

    const messages = response.data.messages || [];
    if (messages.length === 0) return { processed: 0, matched: 0 };

    let matchedCount = 0;
    const pendingEnrollments = await prisma.enrollment.findMany({
      where: { status: 'PENDING' },
      include: {
        course: { select: { id_khoa: true, phi_coc: true, name_lop: true } },
        user: { select: { id: true, name: true, phone: true, email: true } }
      }
    });

    if (pendingEnrollments.length === 0) return { processed: messages.length, matched: 0 };

    for (const msg of messages) {
      // Nghỉ 200ms giữa các email để giảm tải dồn dập cho API
      await new Promise(resolve => setTimeout(resolve, 200));
      try {
        const message = await callGmailWithRetry(() => gmail.users.messages.get({ userId: 'me', id: msg.id || '', format: 'full' }));
        let body = '';
        const payload = message.data.payload;
        if (payload?.body?.data) {
          body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
        } else if (payload?.parts) {
          for (const part of payload.parts) {
            if (part.mimeType === 'text/html' && part.body?.data) {
              body = Buffer.from(part.body.data, 'base64').toString('utf-8');
              break;
            }
          }
        }

        const parsed = parseSacombankEmail(body);
        if (!parsed.amount || (!parsed.userId && !parsed.phone)) continue;

        for (const enrollment of pendingEnrollments) {
          // Bỏ qua enrollment của tài khoản test hệ thống
          if (enrollment.userId === 2689) continue;
          try {
            const userPhone = enrollment.user.phone?.replace(/\D/g, '') || '';
            const emailPhone = parsed.phone || '';
            const userIdMatch = parsed.userId && parsed.userId === enrollment.userId;
            const phoneMatch = userPhone && emailPhone && userPhone.includes(emailPhone);
            const normalizeCode = (s: string) => s.replace(/[^A-Z0-9]/gi, '').toUpperCase();
            
            let courseCodeMatch = parsed.courseCode && normalizeCode(enrollment.course.id_khoa).includes(normalizeCode(parsed.courseCode));
            
            // Hỗ trợ đặc biệt cho khóa học #22 (Merit Bank / MB / BRK)
            if (!courseCodeMatch && enrollment.courseId === 22 && (parsed.courseCode === 'BRK' || parsed.courseCode === 'MB')) {
              courseCodeMatch = true;
            }

            const amountMatch = parsed.amount >= enrollment.course.phi_coc;

            if (!((parsed.userId ? userIdMatch : phoneMatch) && courseCodeMatch && amountMatch)) continue;

            // Tìm hoặc tạo Payment record (upsert — xử lý cả trường hợp payment chưa tồn tại)
            await prisma.payment.upsert({
              where: { enrollmentId: enrollment.id },
              create: {
                enrollmentId: enrollment.id,
                amount: parsed.amount,
                phone: parsed.phone,
                content: parsed.content,
                bankName: 'Sacombank',
                status: 'VERIFIED',
                verifiedAt: new Date(),
                verifyMethod: 'AUTO_EMAIL',
                transferTime: parsed.transferTime,
              },
              update: {
                amount: parsed.amount,
                phone: parsed.phone,
                content: parsed.content,
                bankName: 'Sacombank',
                status: 'VERIFIED',
                verifiedAt: new Date(),
                verifyMethod: 'AUTO_EMAIL',
                transferTime: parsed.transferTime,
              }
            });

            await prisma.enrollment.update({
              where: { id: enrollment.id },
              data: { status: 'ACTIVE' }
            });

            // [BRK ACTIVATION]
            let brkPlacementMsg = '';
            const brkConfig = await prisma.autoVerifyConfig.findUnique({
              where: { courseId: enrollment.courseId }
            });
            if (brkConfig?.enabled && brkConfig.onSystem != null) {
              try {
                const { activateBrkMember, getBrkPlacementChain } = await import("@/lib/brk/activation-service");
                const brkSystem = await activateBrkMember(enrollment.userId, brkConfig.onSystem, enrollment.referrerId);
                console.log(`  ✅ BRK activated for user#${enrollment.userId} on system ${brkConfig.onSystem}`);

                const placement = await getBrkPlacementChain(enrollment.userId, brkConfig.onSystem);
                if (placement.parentId) {
                  brkPlacementMsg = `📍 Vị trí: Dưới <b>#${placement.parentId} ${placement.parentName}</b>\n`;
                  if (placement.chain.length > 1) {
                    const upline = placement.chain.slice(1).map(a => `#${a.userId} ${a.name}`).join(' → ');
                    brkPlacementMsg += `🔗 Tuyến trên: ${upline}\n`;
                  }
                }
              } catch (err) {
                console.error(`  ⚠️ BRK activation failed for user#${enrollment.userId}:`, err);
              }
            }

            // Mark email as read
            await callGmailWithRetry(() => gmail.users.messages.modify({
              userId: 'me', id: msg.id || '',
              requestBody: { removeLabelIds: ['UNREAD'] }
            }));

            // Telegram admin notification
            const msgAdmin = `✅ <b>KÍCH HOẠT TỰ ĐỘNG THÀNH CÔNG</b>\n\n` +
              `👤 Học viên: <b>${enrollment.user.name}</b>\n` +
              `📞 SĐT: ${enrollment.user.phone}\n` +
              `🎓 Khóa học: <b>${enrollment.course.name_lop} (${enrollment.course.id_khoa})</b>\n` +
              `💰 Số tiền: ${parsed.amount.toLocaleString()}đ\n` +
              `🏦 Ngân hàng: Sacombank\n` +
              `📅 Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}\n` +
              brkPlacementMsg;
            await sendTelegramAdmin(msgAdmin);

            // Activation email
            if (enrollment.user.email) {
              const { sendActivationEmail } = await import("./notifications");
              await sendActivationEmail(
                enrollment.user.email,
                enrollment.user.name || 'Bạn',
                enrollment.user.id,
                enrollment.course.name_lop || enrollment.course.id_khoa,
                null
              );
            }

            matchedCount++;
            break; // Mỗi email chỉ match 1 enrollment
          } catch (innerErr) {
            console.error(`  ⚠️ Lỗi xử lý enrollment #${enrollment.id}:`, innerErr);
          }
        }
      } catch (msgErr) {
        console.error(`  ⚠️ Lỗi xử lý message ${msg.id}:`, msgErr);
      }
    }
    return { processed: messages.length, matched: matchedCount };
  } finally {
    // 2. Giải phóng database lock
    try {
      await prisma.systemConfig.update({
        where: { key: lockKey },
        data: { value: '' }
      });
      console.log('🔓 Released Gmail scan lock.');
    } catch (unlockErr) {
      console.error('⚠️ Lỗi giải phóng database lock:', unlockErr);
    }
  }
}
