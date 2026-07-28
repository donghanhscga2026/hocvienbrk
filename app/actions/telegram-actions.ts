'use server'

import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { randomUUID } from "crypto"

/**
 * Server Action sinh mã liên kết Telegram dùng 1 lần (hiệu lực 15 phút)
 * Trả về link chuyển hướng Telegram: https://t.me/<BOT_USERNAME>?start=<TOKEN>
 */
export async function generateTelegramLinkAction() {
  const session = await auth()
  
  if (!session?.user?.id) {
    return { success: false, error: "Bạn cần đăng nhập để thực hiện chức năng này." }
  }

  const userId = parseInt(session.user.id)
  if (isNaN(userId)) {
    return { success: false, error: "Định dạng ID người dùng không hợp lệ." }
  }

  try {
    const token = randomUUID()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 phút hiệu lực

    // Tạo bản ghi token liên kết mới trong DB
    await prisma.telegramLinkToken.create({
      data: {
        userId,
        token,
        expiresAt
      }
    })

    const botUsername = process.env.TELEGRAM_BOT_USERNAME || "HocVienBRKBot"
    const linkUrl = `https://t.me/${botUsername}?start=${token}`

    return { success: true, url: linkUrl }
  } catch (error: any) {
    console.error("❌ Lỗi khi sinh mã liên kết Telegram:", error)
    return { success: false, error: "Không thể tạo liên kết. Vui lòng thử lại sau." }
  }
}
