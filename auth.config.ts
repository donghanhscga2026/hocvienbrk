import type { NextAuthConfig } from "next-auth"

export const authConfig = {
    pages: {
        signIn: '/login',
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnAdmin = nextUrl.pathname.startsWith('/admin');
            const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');

            if (isOnAdmin) {
                if (isLoggedIn) return true;
                return false;
            }
            if (isOnDashboard) {
                if (isLoggedIn) return true;
                return false;
            }
            return true;
        },
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.sub = user.id;
                token.role = (user as any).role;
                token.needsPasswordChange = (user as any).needsPasswordChange;
                token.isUnverifiedLegacy = (user as any).isUnverifiedLegacy;
                token.affiliateCode = (user as any).affiliateCode;
                token.phone = (user as any).phone;
            }

            if (trigger === "update") {
                if (session?.role) token.role = session.role;
                if (session?.phone) token.phone = session.phone;
            }
            
            return token;
        },
        async session({ session, token }) {
            if (token.sub && session.user) {
                session.user.id = token.sub;
                session.user.role = token.role as any;
                (session.user as any).needsPasswordChange = token.needsPasswordChange as boolean;
                (session.user as any).isUnverifiedLegacy = token.isUnverifiedLegacy as boolean;
                (session.user as any).affiliateCode = token.affiliateCode as string | undefined;
                (session.user as any).phone = token.phone as string | null | undefined;
            }
            return session;
        }
    },
    providers: [],
} satisfies NextAuthConfig
