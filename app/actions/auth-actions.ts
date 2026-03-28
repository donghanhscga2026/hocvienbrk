'use server'

import { z } from "zod"
import prisma from "@/lib/prisma"
import { Role } from "@prisma/client"
import bcrypt from "bcryptjs"
import { redirect } from "next/navigation"
import { revalidateTag } from "next/cache"
import { addUserToClosure } from "@/lib/closure-helpers"

function normalizePhone(phone: string): string {
  if (!phone) return '';
  let p = phone.replace(/\s/g, '').replace(/^0/, '84');
  if (!p.startsWith('+')) p = '+' + p;
  return p;
}

function getAllPhoneVariants(fullPhone: string): string[] {
  const normalized = normalizePhone(fullPhone);
  const variants = [normalized];
  
  if (normalized.startsWith('+84')) {
    variants.push('0' + normalized.slice(3));
    variants.push(normalized.slice(1));
  } else if (normalized.startsWith('+')) {
    const withoutPlus = normalized.slice(1);
    variants.push(withoutPlus);
    if (withoutPlus.startsWith('84')) {
      variants.push('0' + withoutPlus.slice(2));
    }
  } else {
    variants.push('+' + normalized);
  }
  
  return [...new Set(variants)];
}

const registerSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    countryCode: z.string(),
    phone: z.string().min(7, "Số điện thoại phải có ít nhất 7 số").max(15, "Số điện thoại tối đa 15 số"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    referrerId: z.string().optional(),
})

export async function registerUser(prevState: any, formData: FormData) {
    const data = Object.fromEntries(formData.entries())

    const validatedFields = registerSchema.safeParse(data)

    if (!validatedFields.success) {
        return {
            message: "Invalid fields",
            errors: validatedFields.error.flatten().fieldErrors,
        }
    }

    const { name, email, countryCode, phone, password, referrerId } = validatedFields.data
    
    const cleanPhone = phone.replace(/\s/g, '').replace(/^0/, '');
    const fullPhone = `${countryCode}${cleanPhone}`;
    
    const phoneVariants = getAllPhoneVariants(fullPhone);
    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await prisma.user.findFirst({
        where: {
            OR: [
                { email: { equals: normalizedEmail, mode: 'insensitive' } },
                { phone: { in: phoneVariants } }
            ]
        }
    })

    if (existingUser) {
        const issues: string[] = [];
        
        if (existingUser.email.toLowerCase() === normalizedEmail) {
            issues.push("email");
        }
        
        if (phoneVariants.includes(existingUser.phone || '')) {
            issues.push("số điện thoại");
        }
        
        return {
            message: `Tài khoản đã tồn tại với ${issues.join(' và ')}. Vui lòng kiểm tra lại hoặc đăng nhập.`,
            errors: {},
        }
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    try {
        const { getNextAvailableId } = await import("@/lib/id-helper")
        const { sendTelegram, sendWelcomeEmail } = await import("@/lib/notifications")
        const newId = await getNextAvailableId()
        
        // Parse referrerId
        const refId = referrerId ? parseInt(referrerId) : null

        // Tao user
        const user = await prisma.user.create({
            data: {
                id: newId,
                name,
                email: normalizedEmail,
                phone: fullPhone,
                password: hashedPassword,
                role: Role.STUDENT,
                referrerId: refId && !isNaN(refId) ? refId : null,
            },
        })
        
        // Them closure rows cho genealogy
        await addUserToClosure(user.id, user.referrerId)
        
        // Revalidate genealogy cache
        revalidateTag('genealogy')

        await sendWelcomeEmail(email, name, user.id)

        const referrerInfo = refId ? `\n📢 Người giới thiệu: #${refId}` : ''
        const msgAdmin = `🆕 <b>HỌC VIÊN MỚI ĐĂNG KÝ</b>\n\n` +
                         `🆔 Mã số: <b>#${user.id}</b>\n` +
                         `👤 Họ tên: <b>${user.name}</b>\n` +
                         `📧 Email: ${user.email}\n` +
                         `📞 SĐT: ${user.phone}${referrerInfo}\n` +
                         `📅 Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`;
        await sendTelegram(msgAdmin, 'REGISTER');

    } catch (error) {
        console.error("Failed to create user:", error)
        return {
            message: "Database Error: Failed to create user. Please try again.",
        }
    }

    redirect('/login')
}
