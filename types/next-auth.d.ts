import NextAuth, { DefaultSession } from "next-auth"
import { Role } from "@prisma/client"
import { AdapterUser } from "next-auth/adapters"

declare module "next-auth" {
    /**
     * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
     */
    interface Session {
        user: {
            id: string
            role: Role
        } & DefaultSession["user"]
    }

    interface User {
        id?: string
        role: Role
    }
}

declare module "next-auth/adapters" {
    interface AdapterUser {
        role: Role
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string
        role: Role
    }
}
