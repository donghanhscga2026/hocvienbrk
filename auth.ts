import NextAuth, { AuthError, CredentialsSignin } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { z } from "zod"
import prisma from "@/lib/prisma"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { Role } from "@prisma/client"
import bcrypt from "bcryptjs"
import { authConfig } from "./auth.config"

class CustomLoginError extends CredentialsSignin {
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MẬT KHẨU MẶC ĐỊNH - CẤU HÌNH
// ═══════════════════════════════════════════════════════════════════════════════
const DEFAULT_PASSWORD_HASH = "$2a$10$K.0H2bV8r3kPQZ3kP8YQ2.tQZQ3dZ4vF5H1dQ1pO7gK8sD6yN3q"; // Brk#3773

export async function isDefaultPassword(password: string): Promise<boolean> {
  // So sánh với hash của "Brk#3773"
  return bcrypt.compare("Brk#3773", password);
}

const baseAdapter = PrismaAdapter(prisma)
const customAdapter = {
    ...baseAdapter,
    createUser: async (data: any) => {
        try {
            const { getNextAvailableId } = await import("@/lib/id-helper")
            const newId = await getNextAvailableId()
            console.log(`✨ [Auth] Tạo user mới qua OAuth với ID tùy chỉnh: #${newId} (${data.email})`)
            return prisma.user.create({
                data: {
                    ...data,
                    id: newId,
                    referrerId: 0, // Default to root admin
                },
            })
        } catch (error) {
            console.error("❌ [Auth] Lỗi khi tạo user với ID tùy chỉnh:", error)
            // Fallback: để database tự quyết định nếu có lỗi (tránh block sign-in)
            return baseAdapter.createUser!(data)
        }
    }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
    ...authConfig,
    trustHost: true,
    adapter: customAdapter as any, 
    session: { strategy: "jwt" },
    providers: [
        // DISABLED: Google Auth
        // Google({
        //     clientId: process.env.GOOGLE_CLIENT_ID,
        //     clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        //     allowDangerousEmailAccountLinking: true,
        // }),
        Credentials({
            credentials: {
                identifier: { label: "Student ID / Email / Phone", type: "text" },
                password: { label: "Password", type: "password" },
            },
            authorize: async (credentials) => {
                const parsedCredentials = z
                    .object({ identifier: z.string(), password: z.string() })
                    .safeParse(credentials)

                if (!parsedCredentials.success) return null;

                const { identifier, password } = parsedCredentials.data

                const isNumeric = /^\d+$/.test(identifier);
                if (!isNumeric) {
                    console.log(`❌ [Auth] Mã học viên không hợp lệ: ${identifier}`);
                    throw new CustomLoginError("Sai mã học viên", "USER_NOT_FOUND:Mã học viên");
                }

                const potentialId = parseInt(identifier);
                if (potentialId < 0 || potentialId >= 2147483647 || isNaN(potentialId)) {
                    console.log(`❌ [Auth] Mã học viên không hợp lệ: ${identifier}`);
                    throw new CustomLoginError("Sai mã học viên", "USER_NOT_FOUND:Mã học viên");
                }

                console.log(`🔍 [Auth] Đang kiểm tra đăng nhập cho mã học viên: #${potentialId}`);

                const user = await prisma.user.findUnique({
                    where: { id: potentialId }
                });

                if (!user) {
                    console.log(`❌ [Auth] Không tìm thấy học viên với mã: #${potentialId}`);
                    throw new CustomLoginError("Sai mã học viên", "USER_NOT_FOUND:Mã học viên");
                }

                if (!user.password) {
                    console.log(`❌ [Auth] Người dùng #${user.id} (${user.email}) chưa có mật khẩu (có thể dùng Google).`);
                    throw new CustomLoginError("Tài khoản này chưa thiết lập mật khẩu.", "NO_PASSWORD");
                }

                const passwordsMatch = await bcrypt.compare(password, user.password);
                
                if (!passwordsMatch) {
                    console.log(`❌ [Auth] Sai mật khẩu cho user #${user.id}.`);
                    throw new CustomLoginError("Mật khẩu không chính xác", "INVALID_PASSWORD");
                }

                console.log(`✅ [Auth] Đăng nhập thành công: #${user.id} (${user.email})`);

                // Kiểm tra nếu dùng mật khẩu mặc định
                const isDefault = await isDefaultPassword(user.password);
                const userAny = user as any;
                
                // Tối ưu hóa: Nếu ảnh là base64 quá lớn (> 2KB), không cho vào session để tránh lỗi Header Too Large (494)
                let sessionImage = user.image;
                if (sessionImage && sessionImage.startsWith('data:image') && sessionImage.length > 2048) {
                    console.log(`⚠️ [Auth] Ảnh của user #${user.id} quá lớn (${sessionImage.length} chars), đã loại bỏ khỏi session để tránh lỗi cookie.`);
                    sessionImage = null; 
                }

                return {
                    id: user.id.toString(),
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    image: sessionImage,
                    affiliateCode: user.affiliateCode ?? undefined, 
                    needsPasswordChange: isDefault && !userAny.passwordChanged,
                    isUnverified: !user.emailVerified,
                } as any; 
            },
        }),
    ],
    callbacks: {
        async redirect({ url, baseUrl }) {
            // Hỗ trợ cả localhost và domain chính
            if (url.startsWith("/")) return `${baseUrl}${url}`;
            
            // Nếu URL chứa vercel.app, có thể do đang ở môi trường preview
            const mainDomain = "https://giautoandien.io.vn";
            if (url.includes("vercel.app") && baseUrl !== "http://localhost:3000") {
                return url.replace(/https:\/\/.*\.vercel\.app/, mainDomain);
            }

            // Nếu URL đã là tuyệt đối và cùng origin với baseUrl thì cho phép
            try {
                const urlObj = new URL(url);
                const baseObj = new URL(baseUrl);
                if (urlObj.origin === baseObj.origin) return url;
            } catch (e) {
                // Ignore invalid URLs
            }

            return baseUrl;
        },
        async jwt({ token, user, trigger, session }) {
            if (user != null) {
                token.sub = user.id;
                token.role = (user as any).role;
                token.needsPasswordChange = (user as any).needsPasswordChange;
                token.isUnverified = (user as any).isUnverified;
                token.affiliateCode = (user as any).affiliateCode;
                token.phone = (user as any).phone;
            }

            // Luôn fetch role + phone mới từ DB để đồng bộ khi role thay đổi
            if (token.sub != null) {
                try {
                    const dbUser = await prisma.user.findUnique({
                        where: { id: parseInt(token.sub as string) },
                        select: { role: true, phone: true }
                    });
                    if (dbUser) {
                        token.role = dbUser.role;
                        if (dbUser.phone) token.phone = dbUser.phone;
                    }
                } catch (e) {
                    console.error("[Auth] Error fetching user in JWT:", e);
                }
            }

            if (trigger === "update") {
                if (session?.role) token.role = session.role;
                if (session?.phone) token.phone = session.phone;
            }
            
            return token;
        },
        async session({ session, token }) {
            if (token.sub != null && session.user) {
                session.user.id = token.sub as string;
                session.user.role = token.role as Role;
                (session.user as any).needsPasswordChange = token.needsPasswordChange as boolean;
                (session.user as any).isUnverified = token.isUnverified as boolean;
                (session.user as any).affiliateCode = token.affiliateCode as string | undefined;
                (session.user as any).phone = token.phone as string | null | undefined;
            }
            return session;
        }
    },
    pages: {
        signIn: '/login',
    },
    events: {
        async createUser({ user }) {
            console.log(`👤 Người dùng mới được tạo qua OAuth: ${user.email} (ID: ${user.id})`);
            try {
                const { cookies } = await import("next/headers");
                const cookieStore = await cookies();
                const affRefCookie = cookieStore.get('aff_ref');
                
                let refId = 0;
                let landingSlug = null;
                
                if (affRefCookie) {
                    try {
                        const affData = JSON.parse(decodeURIComponent(affRefCookie.value));
                        if (affData.r) {
                            refId = parseInt(affData.r);
                        }
                        landingSlug = affData.l || affData.c || null;
                    } catch (e) {
                        console.error("[Auth] Lỗi parse cookie aff_ref trong createUser:", e);
                    }
                }

                if (!user.id) return;
                const userIdNum = parseInt(user.id);

                // Luôn đảm bảo có referrerId (mặc định là 0)
                const finalRefId = (refId && !isNaN(refId)) ? refId : 0;

                // Cập nhật referrerId nếu khác null (Adapter đã gán 0, nhưng ghi đè nếu có refId)
                if (finalRefId !== 0) {
                    await prisma.user.update({
                        where: { id: userIdNum },
                        data: { referrerId: finalRefId }
                    });
                }
                
                // BẮT BUỘC: Thêm vào cây phả hệ (Genealogy) cho mọi user mới
                const { addUserToClosure } = await import("@/lib/closure-helpers");
                await addUserToClosure(userIdNum, finalRefId);
                
                if (finalRefId !== 0) {
                    // Theo dõi chuyển đổi affiliate chỉ khi có người giới thiệu thực sự
                    const { trackAffiliateConversion } = await import("@/lib/affiliate/tracking");
                    await trackAffiliateConversion({
                        refCode: finalRefId.toString(),
                        userId: userIdNum,
                        landingSlug: landingSlug,
                        type: 'REGISTRATION'
                    });

                    console.log(`✅ Đã gán người giới thiệu #${finalRefId} cho người dùng mới #${user.id}`);
                } else {
                    console.log(`ℹ️ Người dùng mới #${user.id} không có người giới thiệu, mặc định gán cho Admin (#0)`);
                }
            } catch (error) {
                console.error("❌ Lỗi trong sự kiện createUser:", error);
            }
        },
        async signIn({ user, account }) {
            console.log(`🔐 Sự kiện signIn kích hoạt cho user: ${user.email}, Provider: ${account?.provider}`);
            
            if (user && (account?.provider === 'credentials' || account?.provider === 'google')) {
                try {
                    const { headers } = await import("next/headers");
                    const headerList = await headers();
                    
                    const ip = headerList.get('x-forwarded-for')?.split(',')[0] || 
                               headerList.get('x-real-ip') || 
                               '127.0.0.1';
                    
                    const userAgent = headerList.get('user-agent') || 'Unknown';

                    console.log(`📡 Đang gửi thông báo đăng nhập cho #${user.id} từ IP: ${ip}`);
                    const { sendLoginNotification, sendVerificationEmail } = await import("@/lib/notifications");
                    
                    // Convert user id từ string sang number cho sendLoginNotification
                    const userIdNum = typeof user.id === 'string' ? parseInt(user.id, 10) : Number(user.id);
                    const userName = user.name || 'User';
                    await sendLoginNotification({ id: userIdNum, name: userName }, ip, userAgent);

                    // GỬI THÔNG BÁO XÁC MINH CHO HỌC VIÊN CHƯA XÁC MINH
                    if ((user as any).isUnverified) {
                        console.log(`📧 Gửi nhắc nhở xác minh cho học viên cũ: ${user.email}`);
                        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                        
                        await prisma.verificationToken.upsert({
                            where: { 
                                identifier_token: { 
                                    identifier: user.email!, 
                                    token: token 
                                } 
                            },
                            update: { token, expires: new Date(Date.now() + 24 * 60 * 60 * 1000) },
                            create: {
                                identifier: user.email!,
                                token: token,
                                expires: new Date(Date.now() + 24 * 60 * 60 * 1000)
                            }
                        });

                        await sendVerificationEmail(user.email!, user.name!, token);
                    }

                    console.log(`✅ Đã xử lý xong thông báo đăng nhập.`);
                } catch (error: any) {
                    console.error("❌ Lỗi trong sự kiện signIn:", error.message);
                }
            }
        }
    }
})
