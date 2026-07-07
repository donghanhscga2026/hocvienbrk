require('dotenv').config()
const { google } = require('googleapis')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

function extractTextFromHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseSacombankEmail(htmlContent: string) {
  const text = extractTextFromHtml(htmlContent)
  const contentMatch = text.match(/(?:Description|Nội dung)[\s\/]*(.+?)(?=\s{2,}|$)/i)
  const description = contentMatch ? contentMatch[1].trim() : ''
  
  let phone = null
  const phoneMatch = description.match(/SDT[\s\._]*(\d{6,11})/i)
  if (phoneMatch) {
    phone = phoneMatch[1]
  } else {
    // Fallback: Tìm số điện thoại di động Việt Nam dạng 9-11 chữ số
    const mobileMatch = description.match(/\b(0\d{9,10}|[1-9]\d{8,9})\b/)
    if (mobileMatch) {
      phone = mobileMatch[1]
    }
  }

  let userId = null
  const userIdMatch = description.match(/HV[\s\._]*(\d+)/i)
  if (userIdMatch) {
    userId = parseInt(userIdMatch[1])
  }

  let courseCode = null
  const courseCodeMatch = description.match(/COC[\s\._]*(\w+)/i)
  if (courseCodeMatch) {
    courseCode = courseCodeMatch[1].toUpperCase()
  } else {
    // Fallback: Tự động phát hiện mã hệ thống MB hoặc BRK
    if (/BRK/i.test(description)) {
      courseCode = 'BRK'
    } else if (/MB/i.test(description)) {
      courseCode = 'MB'
    }
  }

  const amountMatch = text.match(/(?:Transaction|Phát sinh)[\s:+]*([\d,\.]+)\s*VND/i)
  
  let amount = 0
  if (amountMatch) {
    const amountStr = amountMatch[1].replace(/\./g, '').replace(/,/g, '')
    amount = parseInt(amountStr) || 0
  }
  
  // Extract actual bank transaction time from "Ngày/Date dd/mm/yyyy HH:MM"
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
    rawText: text
  }
}

async function getGmailClient() {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'http://localhost'
  )

  oAuth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN
  })

  return google.gmail({ version: 'v1', auth: oAuth2Client })
}

// Helper wrapper to safely call Gmail API with exponential backoff retry on 429
async function callGmailWithRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 1000): Promise<T> {
  try {
    return await fn()
  } catch (error: any) {
    const errorMsg = error.message || ''
    const causeMsg = error.cause?.message || ''
    const fullMsg = `${errorMsg} ${causeMsg}`

    if (error.code === 429) {
      // Trích xuất mốc phạt rate limit của Google
      const match = fullMsg.match(/Retry after\s+([^\s]+)/i)
      if (match) {
        const penaltyTimeStr = match[1]
        try {
          await prisma.systemConfig.upsert({
            where: { key: 'gmail_rate_limit_until' },
            update: { value: penaltyTimeStr },
            create: { key: 'gmail_rate_limit_until', value: penaltyTimeStr }
          })
          console.log(`⏳ Đã ghi nhận mốc phạt Rate Limit của Google đến: ${penaltyTimeStr}`)
        } catch (dbErr) {
          console.error('⚠️ Lỗi ghi nhận mốc phạt vào DB:', dbErr)
        }
      }

      if (retries > 0) {
        console.warn(`[GMAIL API] Rate Limit 429. Retrying in ${delayMs}ms... (${retries} attempts left)`)
        await new Promise(resolve => setTimeout(resolve, delayMs))
        return callGmailWithRetry(fn, retries - 1, delayMs * 2)
      }
    }
    throw error
  }
}

async function processBankEmails() {
  // 1. Kiểm tra database penalty rate-limit để tránh bị Google cộng dồn hình phạt
  const penaltyKey = 'gmail_rate_limit_until'
  try {
    const existingPenalty = await prisma.systemConfig.findUnique({
      where: { key: penaltyKey }
    })
    if (existingPenalty && existingPenalty.value) {
      const penaltyTime = new Date(String(existingPenalty.value)).getTime()
      if (Date.now() < penaltyTime) {
        const diffSec = Math.ceil((penaltyTime - Date.now()) / 1000)
        console.log(`⏳ Gmail API is currently penalized by Google. Skipping scan for another ${diffSec} seconds to avoid penalty extension...`)
        return
      }
    }
  } catch (penaltyErr) {
    console.error('⚠️ Lỗi kiểm tra database penalty lock:', penaltyErr)
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
        return;
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
    console.log('🚀 Bắt đầu kiểm tra email ngân hàng...')

    const gmail = await getGmailClient()

    // Load tất cả cấu hình auto-verify đang enabled
    const configs = await prisma.autoVerifyConfig.findMany({ where: { enabled: true } })
    if (configs.length === 0) {
      console.log('📝 Không có cấu hình auto-verify nào.')
      return
    }

    const emailQueries = configs.map(c => `from:${c.emailFrom} ${c.emailQuery}`).join(' OR ')

    // Query emails chưa đọc trong 2 ngày gần nhất để tối ưu hóa quota (dùng Unix epoch seconds)
    const scanDaysAgo = new Date()
    scanDaysAgo.setDate(scanDaysAgo.getDate() - 2)
    const afterEpoch = Math.floor(scanDaysAgo.getTime() / 1000)

    const response = await callGmailWithRetry(() => gmail.users.messages.list({
      userId: 'me',
      q: `(${emailQueries}) is:unread after:${afterEpoch}`,
      maxResults: 20
    }))

    const messages = response.data.messages || []
    console.log(`📧 Tìm thấy ${messages.length} email Sacombank mới chưa đọc`)

    if (messages.length === 0) {
      console.log('✅ Không có email mới')
      return
    }

    // Lấy enrollment PENDING
    const pendingEnrollments = await prisma.enrollment.findMany({
      where: { status: 'PENDING' },
      include: {
        course: {
          select: { id_khoa: true, phi_coc: true, noidung_stk: true, name_lop: true }
        },
        user: {
          select: { id: true, phone: true, name: true, email: true }
        }
      }
    })

    console.log(`📝 Có ${pendingEnrollments.length} enrollment chờ xác nhận`)
    if (pendingEnrollments.length === 0) {
      return
    }

    for (const msg of messages) {
      // Nghỉ 200ms giữa các email để giảm tải dồn dập cho API
      await new Promise(resolve => setTimeout(resolve, 200))
      try {
        const message = await callGmailWithRetry(() => gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full'
        }))

        // Lấy body
        let body = ''
        if (message.data.payload?.body?.data) {
          body = Buffer.from(message.data.payload.body.data, 'base64').toString('utf-8')
        } else if (message.data.payload?.parts) {
          for (const part of message.data.payload.parts) {
            if (part.mimeType === 'text/html' && part.body?.data) {
              body = Buffer.from(part.body.data, 'base64').toString('utf-8')
              break
            }
          }
        }

        const parsed = parseSacombankEmail(body)
        console.log(`\n📱 Parsed: SĐT=${parsed.phone}, Tiền=${parsed.amount}, ND=${parsed.content}`)

        if (!parsed.amount || (!parsed.userId && !parsed.phone)) continue

        // Tìm enrollment khớp với userId hoặc phone + courseCode
        for (const enrollment of pendingEnrollments) {
          // Bỏ qua tài khoản test
          if (enrollment.userId === 2689) continue

          const userPhone = enrollment.user.phone?.replace(/\D/g, '') || ''
          const emailPhone = parsed.phone || ''
          
          // Khớp theo: userId + phone + courseCode
          const userIdMatch = parsed.userId && parsed.userId === enrollment.userId
          const phoneMatch = userPhone && emailPhone && userPhone.includes(emailPhone)
          
          const normalizeCode = (s: string) => s.replace(/[^A-Z0-9]/gi, '').toUpperCase()
          let courseCodeMatch = parsed.courseCode && normalizeCode(enrollment.course.id_khoa).includes(normalizeCode(parsed.courseCode))
          
          // Hỗ trợ đặc biệt cho khóa học #22 (Merit Bank / MB / BRK)
          if (!courseCodeMatch && enrollment.courseId === 22 && (parsed.courseCode === 'BRK' || parsed.courseCode === 'MB')) {
            courseCodeMatch = true
          }

          const amountMatch = parsed.amount >= enrollment.course.phi_coc
          
          // Cần khớp: (userId HOẶC phone) VÀ courseCode VÀ amount
          const matched = ((parsed.userId ? userIdMatch : phoneMatch) && courseCodeMatch && amountMatch)
          
          if (matched) {
            console.log(`✅ Tìm thấy khớp! Enrollment #${enrollment.id}`)
            console.log(`   User: ${enrollment.user.name}, Phone: ${enrollment.user.phone}, UserID: ${enrollment.userId}`)
            console.log(`   Course: ${enrollment.course.id_khoa}, Phi: ${enrollment.course.phi_coc}`)
            console.log(`   Parsed: phone=${parsed.phone}, userId=${parsed.userId}, courseCode=${parsed.courseCode}, amount=${parsed.amount}`)
            
            // Sử dụng upsert để an toàn
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
            })

            await prisma.enrollment.update({
              where: { id: enrollment.id },
              data: { status: 'ACTIVE' }
            })

            // [BRK ACTIVATION] Kiểm tra cấu hình auto-verify của khóa học
            try {
              const brkConfig = await prisma.autoVerifyConfig.findUnique({
                where: { courseId: enrollment.courseId }
              })
              if (brkConfig?.enabled && brkConfig.onSystem != null) {
                const { activateBrkMember } = await import('../lib/brk/activation-service')
                await activateBrkMember(enrollment.userId, brkConfig.onSystem, enrollment.referrerId)
                console.log(`   🔗 Đã kích hoạt BRK system #${brkConfig.onSystem} cho user #${enrollment.userId}`)
              }
            } catch (brkErr) {
              console.error(`   ❌ Lỗi kích hoạt BRK:`, brkErr)
            }

            console.log(`   ✅ Đã kích hoạt khóa học!`)
            
            // Đánh dấu đã đọc
            await callGmailWithRetry(() => gmail.users.messages.modify({
              userId: 'me',
              id: msg.id,
              requestBody: { removeLabelIds: ['UNREAD'] }
            }))
            break
          }
        }
      } catch (msgErr) {
        console.error(`  ⚠️ Lỗi xử lý message ${msg.id}:`, msgErr)
      }
    }
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
    await prisma.$disconnect()
  }
}

processBankEmails().catch(console.error)
