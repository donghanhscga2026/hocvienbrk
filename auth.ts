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
})