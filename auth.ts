import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { z } from "zod"
import prisma from "@/lib/prisma"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { Role } from "@prisma/client"
import bcrypt from "bcryptjs"
import { authConfig } from "./auth.config"

export const { handlers, signIn, signOut, auth } = NextAuth({
    ...authConfig,
    // Sử dụng 'as any' để giải quyết xung đột Type hệ thống
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

                // Tìm kiếm người dùng 1 lần duy nhất
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

                const passwordsMatch = await bcrypt.compare(password, user.password);
                if (passwordsMatch) {
                    return {
                        id: user.id.toString(),
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        image: user.image,
                    };
                }
                return null;
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            // Sử dụng trường 'sub' làm định danh chuẩn của JWT
            if (user) {
                token.sub = user.id;
                token.role = (user as any).role;
            }

            // Cập nhật khi có tín hiệu update chủ động
            if (trigger === "update" && session?.role) {
                token.role = session.role;
            }
            
            return token;
        },
        async session({ session, token }) {
            // Map từ 'sub' của token ngược lại 'id' của session cho đồng bộ UI
            if (token.sub && session.user) {
                session.user.id = token.sub;
                session.user.role = token.role as Role;
            }
            return session;
        }
    },
    pages: {
        signIn: '/login',
    },
    events: {
        async signIn({ user, account }) {
            // Chỉ gửi thông báo cho đăng nhập thông thường (credentials) hoặc Google
            if (user && (account?.provider === 'credentials' || account?.provider === 'google')) {
                try {
                    const { headers } = await import("next/headers");
                    const headerList = await headers();
                    
                    // Lấy IP từ headers (Vercel/Cloudflare standard)
                    const ip = headerList.get('x-forwarded-for')?.split(',')[0] || 
                               headerList.get('x-real-ip') || 
                               '127.0.0.1';
                    
                    const userAgent = headerList.get('user-agent') || 'Unknown';

                    const { sendLoginNotification } = await import("@/lib/notifications");
                    // Không dùng await để tránh làm chậm quá trình đăng nhập của user
                    sendLoginNotification(user, ip, userAgent);
                } catch (error) {
                    console.error("Lỗi khi gửi thông báo đăng nhập:", error);
                }
            }
        }
    }
})