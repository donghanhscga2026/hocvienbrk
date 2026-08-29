import prisma from "../lib/prisma"
import { sendGmail } from "../lib/notifications"

async function generateOTP(): Promise<string> {
    return Math.floor(100000 + Math.random() * 900000).toString()
}

async function run() {
    const args = process.argv.slice(2)
    const execute = args.includes('--execute')
    const userIdStr = args.find(a => !a.startsWith('--'))

    if (!userIdStr) {
        console.error("Usage: npx tsx scripts/send-reset-link.ts <userId> [--execute]")
        process.exit(1)
    }

    const userId = parseInt(userIdStr)
    if (isNaN(userId)) {
        console.error("userId must be a number")
        process.exit(1)
    }

    const user = await prisma.user.findUnique({
        where: { id: userId }
    })

    if (!user) {
        console.error(`User with ID ${userId} not found`)
        process.exit(1)
    }

    if (!user.email) {
        console.error(`User with ID ${userId} does not have an email address`)
        process.exit(1)
    }

    console.log(`\n=== DRY RUN MODE: PREPARING PASSWORD RESET LINK ===`)
    console.log(`User ID: ${user.id}`)
    console.log(`Name: ${user.name}`)
    console.log(`Email: ${user.email}`)

    const otp = await generateOTP()
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour expiration for admin-generated link

    const resetLink = `https://hocvien.brk.vn/forgot-password?email=${encodeURIComponent(user.email)}&otp=${otp}`

    console.log(`\nWill generate OTP: ${otp}`)
    console.log(`Will send email to: ${user.email}`)
    console.log(`Reset Link: ${resetLink}`)
    
    if (!execute) {
        console.log(`\nThis was a DRY RUN. Run with --execute to actually create the token and send the email.`)
        process.exit(0)
    }

    console.log(`\n=== EXECUTING ===`)
    
    // Clear old tokens
    await prisma.passwordReset.deleteMany({ where: { userId: user.id } })

    // Create new token
    await prisma.passwordReset.create({
        data: {
            userId: user.id,
            token: otp,
            expiresAt
        }
    })
    console.log(`✅ Created password reset token in database.`)

    const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f97316;">CỘNG ĐỒNG MBC - KHÔI PHỤC MẬT KHẨU</h2>
            <p>Xin chào <b>${user.name}</b>,</p>
            <p>Theo yêu cầu của bạn, đây là liên kết để đặt lại mật khẩu cho tài khoản học viên của bạn. Vui lòng bấm vào nút bên dưới để tiến hành đổi mật khẩu mới:</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}" style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Đặt lại mật khẩu</a>
            </div>

            <p>Hoặc bạn có thể sao chép liên kết này dán vào trình duyệt:</p>
            <p style="word-break: break-all; color: #3b82f6;">${resetLink}</p>

            <p style="color: #ef4444; margin-top: 20px;"><b>Lưu ý:</b> Liên kết này chỉ có hiệu lực trong <b>1 giờ</b>.</p>
            <p>Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
        </div>
    `

    const result = await sendGmail(user.email, "Liên kết khôi phục mật khẩu - Cộng đồng MBC", htmlBody)
    
    if (result.success) {
        console.log(`✅ Email sent successfully to ${user.email}`)
        
        try {
            const { logEmail } = await import("../lib/email-logger")
            await logEmail({
                userId: user.id,
                email: user.email,
                type: 'forgot_password', // Match existing type
                provider: result.provider || 'unknown',
                status: 'sent',
                messageId: result.emailId,
            })
            console.log(`✅ Logged email to DB`)
        } catch (e) {
            console.error("Failed to log email:", e)
        }

    } else {
        console.error(`❌ Failed to send email: ${result.message}`)
    }

    console.log(`\nDONE`)
    process.exit(0)
}

run().catch(e => {
    console.error("Fatal error:", e)
    process.exit(1)
})
