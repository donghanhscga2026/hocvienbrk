import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { z } from "zod"
import prisma from "@/lib/prisma"
import { PrismaAdapter } from "@auth/prisma-adapter"
import type { User, Role } from "@prisma/client"
import bcrypt from "bcryptjs"
import { authConfig } from "./auth.config"

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

                if (parsedCredentials.success) {
                    const { identifier, password } = parsedCredentials.data

                    // Determine if identifier is ID (number), Email, or Phone
                    let user = null;
                    const isNumeric = /^\d+$/.test(identifier);
                    const isEmail = identifier.includes("@");

                    if (isNumeric) {
                        // Try as Student ID first, then Phone
                        user = await prisma.user.findUnique({
                            where: { id: parseInt(identifier) }
                        });
                        if (!user) {
                            user = await prisma.user.findUnique({
                                where: { phone: identifier }
                            });
                        }
                    } else if (isEmail) {
                        user = await prisma.user.findUnique({
                            where: { email: identifier }
                        });
                    } else {
                        // Fallback to phone if string but not email
                        user = await prisma.user.findUnique({
                            where: { phone: identifier }
                        });
                    }

                    if (!user) return null;

                    // Verify password
                    if (!user.password) return null; // Google users might not have password set

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
                }

                console.log("Invalid credentials");
                return null;
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user && user.id) {
                token.id = user.id.toString();
                token.role = user.role;
            }

            // Force refresh role from DB to handle role updates
            if (token.id) {
                try {
                    const freshUser = await prisma.user.findUnique({
                        where: { id: parseInt(token.id as string) },
                        select: { role: true }
                    });
                    if (freshUser) {
                        token.role = freshUser.role;
                    }
                } catch (error) {
                    // console.error("Error refreshing role:", error);
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as Role;
            }
            return session;
        },
        async signIn({ user, account, profile }) {
            if (account?.provider === 'google') {
                return true;
            }
            return true;
        }
    },
    pages: {
        signIn: '/login',
    },
})
