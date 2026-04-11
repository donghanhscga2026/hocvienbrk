'use server'

import { z } from "zod"
import prisma from "@/lib/prisma"
import { Role } from "@prisma/client"
import bcrypt from "bcryptjs"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { addUserToClosure } from "@/lib/closure-helpers"
import { trackAffiliateConversion } from "@/lib/affiliate/tracking"
import { cookies } from "next/headers"

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
    name: z.string().min(2, "Họ tên phải có ít nhất 2 ký tự"),
    email: z.string().email("Địa chỉ email không hợp lệ"),
    countryCode: z.string(),
    phone: z.string().min(9, "Số điện thoại phải có ít nhất 9 số").max(15, "Số điện thoại tối đa 15 số"),
    password: z.string()
        .min(8, "Mật khẩu phải có ít nhất 8 ký tự")
        .regex(/[A-Z]/, "Mật khẩu phải chứa ít nhất một chữ hoa")
        .regex(/[a-z]/, "Mật khẩu phải chứa ít nhất một chữ thường")
        .regex(/[0-9]/, "Mật khẩu phải chứa ít nhất một chữ số")
        .regex(/[!@#$%^&*(),.?":{}|<>]/, "Mật khẩu phải chứa ít nhất một ký tự đặc biệt"),
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
        const { sendTelegram, sendVerificationEmail } = await import("@/lib/notifications")
        const newId = await getNextAvailableId()
        
        // Parse referrerId
        const parsedRef = parseInt(referrerId || "0")
        const refId = isNaN(parsedRef) ? 0 : parsedRef

        // Tao user
        const user = await prisma.user.create({
            data: {
                id: newId,
                name,
                email: normalizedEmail,
                phone: fullPhone,
                password: hashedPassword,
                role: Role.STUDENT,
                referrerId: refId,
            },
        })

        // Tao verification token (24h)
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        await prisma.verificationToken.create({
            data: {
                identifier: normalizedEmail,
                token: token,
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
            }
        })
        
        // Them closure rows cho genealogy
        await addUserToClosure(user.id, user.referrerId)
        
        // Track affiliate conversion and System Enrollment
        try {
            // Get affiliate data from cookie
            const cookieStore = await cookies()
            const affRefCookie = cookieStore.get('aff_ref')
            
            if (affRefCookie) {
                const affData = JSON.parse(decodeURIComponent(affRefCookie.value))
                if (affData.r) {
                    await trackAffiliateConversion({
                        refCode: affData.r,
                        userId: user.id,
                        landingSlug: affData.l || affData.c || null,
                        type: 'REGISTRATION'
                    })
                    
                    // Handle System Enrollment if 's' is present in cookie
                    if (affData.s === 'tca' || affData.s === 'ktc') {
                        const systemId = affData.s === 'tca' ? 1 : 2;
                        
                        // We need to link to the referrer's system closure
                        // refId is user.referrerId, which we assigned earlier (it came from refCode)
                        if (user.referrerId) {
                            const { addUserToSystemClosure } = await import('@/lib/system-closure-helpers');
                            await addUserToSystemClosure(user.id, user.referrerId, systemId);
                            console.log(`✅ Auto-enrolled user #${user.id} to System ${affData.s.toUpperCase()} under referrer #${user.referrerId}`);
                        }
                    }
                }
            }
        } catch (e) {
            console.error('[Track] Failed to track conversion or system enrollment:', e)
        }
        
        // Revalidate genealogy cache
        revalidatePath('/admin/genealogy')

        // Gui email xac minh
        await sendVerificationEmail(normalizedEmail, name, token)

        const referrerInfo = refId ? `\n📢 Người giới thiệu: #${refId}` : ''
        const msgAdmin = `🆕 <b>HỌC VIÊN MỚI ĐĂNG KÝ (CHỜ XÁC MINH)</b>\n\n` +
                         `🆔 Mã số: <b>#${user.id}</b>\n` +
                         `👤 Họ tên: <b>${user.name}</b>\n` +
                         `📧 Email: ${user.email}\n` +
                         `📞 SĐT: ${user.phone}${referrerInfo}\n` +
                         `📅 Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`;
        await sendTelegram(msgAdmin, 'REGISTER');

        return {
            message: "Đăng ký thành công! Vui lòng kiểm tra Email để xác minh tài khoản trước khi đăng nhập.",
            success: true
        }

    } catch (error) {
        console.error("Failed to create user:", error)
        return {
            message: "Lỗi hệ thống: Không thể tạo tài khoản. Vui lòng thử lại.",
        }
    }
}
