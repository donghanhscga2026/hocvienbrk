import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { z } from "zod"
import prisma from "@/lib/prisma"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { Role } from "@prisma/client"
import bcrypt from "bcryptjs"
import { authConfig } from "./auth.config"

// ═══════════════════════════════════════════════════════════════════════════════
// MẬT KHẨU MẶC ĐỊNH - CẤU HÌNH
// ═══════════════════════════════════════════════════════════════════════════════
const DEFAULT_PASSWORD_HASH = "$2a$10$K.0H2bV8r3kPQZ3kP8YQ2.tQZQ3dZ4vF5H1dQ1pO7gK8sD6yN3q"; // Brk#3773

export async function isDefaultPassword(password: string): Promise<boolean> {
  // So sánh với hash của "Brk#3773"
  return bcrypt.compare("Brk#3773", password);
}

export const { handlers, signIn, signOut, auth } = NextAuth({
    ...authConfig,
    adapter: PrismaAdapter(prisma) as any, 
    session: { strategy: "jwt" },
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
        }),
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
                const isEmail = identifier.includes("@");

                const user = await prisma.user.findFirst({
                    where: {
                        OR: [
                            ...(isNumeric ? [{ id: parseInt(identifier) }, { phone: identifier }] : []),
                            ...(isEmail ? [{ email: identifier }] : []),
                            ...(!isNumeric && !isEmail ? [{ phone: identifier }] : [])
                        ]
                    }
                });

                if (!user || !user.password) return null;

                // CHẶN ĐĂNG NHẬP NẾU CHƯA XÁC MINH EMAIL (Chỉ áp dụng cho tài khoản mới từ ngày 29/03/2026)
                const featureDate = new Date("2026-03-29T00:00:00Z");
                const isLegacy = user.createdAt <= featureDate;
                
                if (!user.emailVerified) {
                    if (!isLegacy) {
                        // Tài khoản mới: Chặn tuyệt đối
                        throw new Error("Vui lòng xác minh email trước khi đăng nhập.");
                    } else {
                        // Tài khoản cũ: Kiểm tra xem đã được gửi mã chưa
                        const existingToken = await prisma.verificationToken.findFirst({
                            where: { identifier: user.email }
                        });

                        if (existingToken) {
                            if (existingToken.expires > new Date()) {
                                // Đã gửi mã và mã còn hạn: Buộc phải xác minh mới được vào tiếp
                                throw new Error("Tài khoản của bạn cần được xác minh. Vui lòng kiểm tra email đã gửi.");
                            } else {
                                // Mã hết hạn: Xóa mã cũ để lần đăng nhập này đóng vai trò "Gửi lại mã mới"
                                await prisma.verificationToken.delete({
                                    where: { 
                                        identifier_token: { 
                                            identifier: existingToken.identifier, 
                                            token: existingToken.token 
                                        } 
                                    }
                                });
                            }
                        }
                        // Nếu chưa có mã hoặc mã vừa bị xóa (do hết hạn), cho phép đăng nhập để kích hoạt gửi mã mới ở sự kiện signIn
                    }
                }

                const passwordsMatch = await bcrypt.compare(password, user.password);
                if (passwordsMatch) {
                    // Kiểm tra nếu dùng mật khẩu mặc định
                    const isDefault = await isDefaultPassword(user.password);
                    const userAny = user as any;
                    
                    return {
                        id: user.id.toString(),
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        image: user.image,
                        needsPasswordChange: isDefault && !userAny.passwordChanged,
                        isUnverifiedLegacy: !user.emailVerified && isLegacy, // Gắn cờ để gửi mail ở event signIn
                    };
                }
                return null;
            },
        }),
    ],
    callbacks: {
        async redirect({ url, baseUrl }) {
            // Ép buộc dùng domain chính nếu phát hiện đang ở domain vercel
            const mainDomain = "https://giautoandien.io.vn";
            if (url.includes("vercel.app")) {
                return url.replace(/https:\/\/.*\.vercel\.app/, mainDomain);
            }
            // Cho phép chuyển hướng nếu cùng domain chính
            if (url.startsWith(mainDomain)) return url;
            // Mặc định về trang chủ của domain chính
            if (url.startsWith("/")) return `${mainDomain}${url}`;
            return mainDomain;
        },
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.sub = user.id;
                token.role = (user as any).role;
                token.needsPasswordChange = (user as any).needsPasswordChange;
                token.isUnverifiedLegacy = (user as any).isUnverifiedLegacy;
                token.affiliateCode = (user as any).affiliateCode;
            }

            if (trigger === "update" && session?.role) {
                token.role = session.role;
            }
            
            return token;
        },
        async session({ session, token }) {
            if (token.sub && session.user) {
                session.user.id = token.sub;
                session.user.role = token.role as Role;
                (session.user as any).needsPasswordChange = token.needsPasswordChange as boolean;
                (session.user as any).isUnverifiedLegacy = token.isUnverifiedLegacy as boolean;
                (session.user as any).affiliateCode = token.affiliateCode as string | undefined;
            }
            return session;
        }
    },
    pages: {
        signIn: '/login',
    },
    events: {
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

                    // GỬI THÔNG BÁO XÁC MINH CHO HỌC VIÊN CŨ CHƯA XÁC MINH
                    if ((user as any).isUnverifiedLegacy) {
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