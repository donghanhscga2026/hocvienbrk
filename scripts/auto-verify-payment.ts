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
  
  // Tìm nội dung chuyển khoản
  const contentMatch = text.match(/(?:Description|Nội dung)[\s\/]*(.+?)(?=\s{2,}|$)/i)
  const description = contentMatch ? contentMatch[1].trim() : ''
  
  // Format mới: SDT 123456 HV 8286 COC LS03
  // Tìm 6 số điện thoại cuối sau "SDT" (linh hoạt khoảng trống/kí tự đặc biệt)
  const phoneMatch = description.match(/SDT[\s\._]*(\d{6})/i)
  
  // Tìm mã học viên sau "HV" 
  const userIdMatch = description.match(/HV[\s\._]*(\d+)/i)
  
  // Tìm mã khóa học sau "COC"
  const courseCodeMatch = description.match(/COC[\s\._]*(\w+)/i)
  
  // Tìm số tiền - format: 386,868 VND
  const amountMatch = text.match(/(?:Transaction|Phát sinh)[\s:+]*([\d,\.]+)\s*VND/i)
  
  let amount = 0
  if (amountMatch) {
    const amountStr = amountMatch[1].replace(/\./g, '').replace(/,/g, '')
    amount = parseInt(amountStr) || 0
  }
  
  return {
    phone: phoneMatch ? phoneMatch[1] : null,
    userId: userIdMatch ? parseInt(userIdMatch[1]) : null,
    courseCode: courseCodeMatch ? courseCodeMatch[1].toUpperCase() : null,
    amount: amount,
    content: description,
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

async function processBankEmails() {
  console.log('🚀 Bắt đầu kiểm tra email ngân hàng...')

  const gmail = await getGmailClient()

  // Tìm email Sacombank trong 7 ngày gần nhất
  const response = await gmail.users.messages.list({
    userId: 'me',
    q: 'sacombank thong bao giao dich',
    maxResults: 10
  })

  const messages = response.data.messages || []
  console.log(`📧 Tìm thấy ${messages.length} email Sacombank`)

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

  for (const msg of messages) {
    const message = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id,
      format: 'full'
    })

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

    // Tìm enrollment khớp với userId hoặc phone + courseCode
    for (const enrollment of pendingEnrollments) {
      const userPhone = enrollment.user.phone?.replace(/\D/g, '') || ''
      const emailPhone = parsed.phone || ''
      
      // Khớp theo: userId + phone + courseCode
      const userIdMatch = parsed.userId && parsed.userId === enrollment.userId
      const phoneMatch = userPhone && emailPhone && userPhone.includes(emailPhone)
      const courseCodeMatch = parsed.courseCode && enrollment.course.id_khoa.toUpperCase().includes(parsed.courseCode)
      const amountMatch = parsed.amount >= enrollment.course.phi_coc
      
      // Cần khớp: (userId HOẶC phone) VÀ courseCode VÀ amount
      const matched = ((parsed.userId ? userIdMatch : phoneMatch) && courseCodeMatch && amountMatch)
      
      if (matched) {
        console.log(`✅ Tìm thấy khớp! Enrollment #${enrollment.id}`)
        console.log(`   User: ${enrollment.user.name}, Phone: ${enrollment.user.phone}, UserID: ${enrollment.userId}`)
        console.log(`   Course: ${enrollment.course.id_khoa}, Phi: ${enrollment.course.phi_coc}`)
        console.log(`   Parsed: phone=${parsed.phone}, userId=${parsed.userId}, courseCode=${parsed.courseCode}, amount=${parsed.amount}`)
        
        // Cập nhật payment và enrollment
        await prisma.payment.update({
          where: { enrollmentId: enrollment.id },
          data: {
            amount: parsed.amount,
            phone: parsed.phone,
            content: parsed.content,
            bankName: 'Sacombank',
            status: 'VERIFIED',
            verifiedAt: new Date(),
            verifyMethod: 'AUTO_EMAIL'
          }
        })

        await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: { status: 'ACTIVE' }
        })

        // [SYNC-YTB] Đồng bộ học viên vào hệ thống YTB nếu là khóa của teacher 327
        if (enrollment.course.teacherId === 327) {
          try {
            // Import logic directly here since it's a script
            const systemId = 3
            const userId = enrollment.userId
            
            // Tìm refSysId
            let currentId = userId
            let depth = 0
            let refSysId = 0
            while (currentId && depth < 50) {
                const existing = await prisma.system.findFirst({
                    where: { userId: currentId, onSystem: systemId }
                })
                if (existing && currentId !== 922) {
                    refSysId = currentId
                    break
                }
                const user = await prisma.user.findUnique({
                    where: { id: currentId },
                    select: { referrerId: true }
                })
                if (!user || !user.referrerId) break
                currentId = user.referrerId
                depth++
            }

            // Add to system
            const existingSys = await prisma.system.findFirst({ where: { userId, onSystem: systemId } })
            let sysRec
            if (existingSys) {
                sysRec = await prisma.system.update({ where: { autoId: existingSys.autoId }, data: { refSysId } })
            } else {
                sysRec = await prisma.system.create({ data: { userId, onSystem: systemId, refSysId } })
            }

            // Self closure
            await prisma.systemClosure.upsert({
                where: { ancestorId_descendantId_systemId: { ancestorId: sysRec.autoId, descendantId: sysRec.autoId, systemId } },
                update: { depth: 0 },
                create: { ancestorId: sysRec.autoId, descendantId: sysRec.autoId, depth: 0, systemId }
            }).catch(() => {})

            // Ancestor closures
            if (refSysId >= 0) {
                const upline = await prisma.system.findFirst({ where: { userId: refSysId, onSystem: systemId } })
                if (upline) {
                    const ancestors = await prisma.systemClosure.findMany({ where: { systemId, descendantId: upline.autoId } })
                    for (const anc of ancestors) {
                        await prisma.systemClosure.create({
                            data: { ancestorId: anc.ancestorId, descendantId: sysRec.autoId, depth: anc.depth + 1, systemId }
                        }).catch(() => {})
                    }
                }
            }
            console.log(`   🔗 Đã đồng bộ #${userId} vào hệ thống YTB (refSysId=${refSysId})`)
          } catch (syncErr) {
            console.error(`   ❌ Lỗi đồng bộ YTB:`, syncErr)
          }
        }

        console.log(`   ✅ Đã kích hoạt khóa học!`)
        
        // Đánh dấu đã đọc
        await gmail.users.messages.modify({
          userId: 'me',
          id: msg.id,
          requestBody: { removeLabelIds: ['UNREAD'] }
        })
      }
    }
  }

  await prisma.$disconnect()
}

processBankEmails().catch(console.error)
