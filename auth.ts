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

const DEFAULT_PASSWORD_HASH = "$2a$10$K.0H2bV8r3kPQZ3kP8YQ2.tQZQ3dZ4vF5H1dQ1pO7gK8sD6yN3q"; // Brk#3773

export async function isDefaultPassword(password: string): Promise<boolean> {
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
                },
            })
        } catch (error) {
            console.error("❌ [Auth] Lỗi khi tạo user với ID tùy chỉnh:", error)
            return baseAdapter.createUser!(data)
        }
    }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
    ...authConfig,
    adapter: customAdapter as any, 
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

                let identifierType = "thông tin đăng nhập";
                if (isEmail) identifierType = "Email";
                else if (isNumeric && identifier.length < 10) identifierType = "Mã học viên";
                else if (isNumeric) identifierType = "Số điện thoại";

                const potentialId = isNumeric ? parseInt(identifier) : -1;
                const isValidId = potentialId >= 0 && potentialId < 2147483647;

                const user = await prisma.user.findFirst({
                    where: {
                        OR: [
                            ...(isValidId ? [{ id: potentialId }] : []),
                            { email: identifier },
                            { phone: identifier }
                        ]
                    }
                });

                if (!user) {
                    throw new CustomLoginError(`Sai ${identifierType}`, `USER_NOT_FOUND:${identifierType}`);
                }

                if (!user.password) {
                    throw new CustomLoginError("Tài khoản này chưa thiết lập mật khẩu.", "NO_PASSWORD");
                }

                const featureDate = new Date("2026-03-29T00:00:00Z");
                const isLegacy = user.createdAt <= featureDate;
                
                if (!user.emailVerified) {
                    if (!isLegacy) {
                        throw new CustomLoginError("Vui lòng xác minh email trước khi đăng nhập.", "EMAIL_NOT_VERIFIED");
                    } else {
                        const existingToken = await prisma.verificationToken.findFirst({
                            where: { identifier: user.email }
                        });

                        if (existingToken && existingToken.expires > new Date()) {
                            throw new CustomLoginError("Tài khoản của bạn cần được xác minh.", "EMAIL_VERIFICATION_PENDING");
                        }
                    }
                }

                const passwordsMatch = await bcrypt.compare(password, user.password);
                
                if (!passwordsMatch) {
                    throw new CustomLoginError("Mật khẩu không chính xác", "INVALID_PASSWORD");
                }

                const isDefault = await isDefaultPassword(user.password);
                const userAny = user as any;
                
                let sessionImage = user.image;
                if (sessionImage && sessionImage.startsWith('data:image') && sessionImage.length > 2048) {
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
                    isUnverifiedLegacy: !user.emailVerified && isLegacy, 
                } as any; 
            },
        }),
    ],
    callbacks: {
        ...authConfig.callbacks,
        async jwt(params) {
            // Gọi logic cơ bản từ authConfig trước
            let token = await authConfig.callbacks!.jwt!(params);
            const { user, trigger, session } = params;

            // Bổ sung logic fetch phone cho OAuth (vì authConfig chạy được ở Edge nên ko có Prisma)
            if (token.sub && !token.phone) {
                try {
                    const dbUser = await prisma.user.findUnique({
                        where: { id: parseInt(token.sub) },
                        select: { phone: true }
                    });
                    if (dbUser) token.phone = dbUser.phone;
                } catch (e) {
                    console.error("[Auth] Error fetching phone in JWT:", e);
                }
            }

            return token;
        },
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
                    } catch (e) {}
                }

                if (!user.id) return;
                const userIdNum = parseInt(user.id);

                if (refId && !isNaN(refId)) {
                    await prisma.user.update({
                        where: { id: userIdNum },
                        data: { referrerId: refId }
                    });
                    
                    const { addUserToClosure } = await import("@/lib/closure-helpers");
                    await addUserToClosure(userIdNum, refId);
                    
                    const { trackAffiliateConversion } = await import("@/lib/affiliate/tracking");
                    await trackAffiliateConversion({
                        refCode: refId.toString(),
                        userId: userIdNum,
                        landingSlug: landingSlug,
                        type: 'REGISTRATION'
                    });
                }
            } catch (error) {
                console.error("❌ Lỗi trong sự kiện createUser:", error);
            }
        },
        async signIn({ user, account }) {
            if (user && (account?.provider === 'credentials' || account?.provider === 'google')) {
                try {
                    const { headers } = await import("next/headers");
                    const headerList = await headers();
                    const ip = headerList.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
                    const userAgent = headerList.get('user-agent') || 'Unknown';

                    const { sendLoginNotification, sendVerificationEmail } = await import("@/lib/notifications");
                    const userIdNum = typeof user.id === 'string' ? parseInt(user.id, 10) : Number(user.id);
                    await sendLoginNotification({ id: userIdNum, name: user.name || 'User' }, ip, userAgent);

                    if ((user as any).isUnverifiedLegacy) {
                        const token = Math.random().toString(36).substring(2, 15);
                        await prisma.verificationToken.upsert({
                            where: { identifier_token: { identifier: user.email!, token: token } },
                            update: { token, expires: new Date(Date.now() + 24 * 60 * 60 * 1000) },
                            create: { identifier: user.email!, token: token, expires: new Date(Date.now() + 24 * 60 * 60 * 1000) }
                        });
                        await sendVerificationEmail(user.email!, user.name!, token);
                    }
                } catch (error: any) {
                    console.error("❌ Lỗi trong sự kiện signIn:", error.message);
                }
            }
        }
    }
})
