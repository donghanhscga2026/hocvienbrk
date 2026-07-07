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
    if (error.code === 429 && retries > 0) {
      console.warn(`[GMAIL API] Rate Limit 429. Retrying in ${delayMs}ms... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return callGmailWithRetry(fn, retries - 1, delayMs * 2);
    }
    throw error;
  }
}

export async function processPaymentEmails() {
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

  // Query emails trong 7 ngày gần nhất (dùng Unix epoch seconds — Gmail API không chấp nhận ISO date string)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const afterEpoch = Math.floor(sevenDaysAgo.getTime() / 1000)

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
          const brkConfig = await prisma.autoVerifyConfig.findUnique({
            where: { courseId: enrollment.courseId }
          });
          if (brkConfig?.enabled && brkConfig.onSystem != null) {
            try {
              const { activateBrkMember } = await import("@/lib/brk/activation-service");
              await activateBrkMember(enrollment.userId, brkConfig.onSystem, enrollment.referrerId);
              console.log(`  ✅ BRK activated for user#${enrollment.userId} on system ${brkConfig.onSystem}`);
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
            `📅 Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`;
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
}
