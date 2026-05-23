'use client'

import { signIn } from "next-auth/react"
import { useState } from "react"
import { Loader2 } from "lucide-react"

interface SocialAuthButtonsProps {
    callbackUrl?: string
    isLoading?: boolean
    onLoading?: (loading: boolean) => void
}

export function SocialAuthButtons({ callbackUrl = "/complete-profile", isLoading: externalLoading, onLoading }: SocialAuthButtonsProps) {
    const [internalLoading, setInternalLoading] = useState(false)
    const isLoading = externalLoading || internalLoading

    const handleGoogleSignIn = async () => {
        setInternalLoading(true)
        if (onLoading) onLoading(true)
        try {
            await signIn("google", { callbackUrl })
        } catch (error) {
            console.error("Google sign in error:", error)
            setInternalLoading(false)
            if (onLoading) onLoading(false)
        }
    }

    return (
        <div className="space-y-3">
            <button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                type="button"
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-brk-outline bg-brk-background/5 px-4 py-3 text-sm font-medium text-brk-on-surface hover:bg-brk-surface/10 transition-colors disabled:opacity-50"
            >
                {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 488 512">
                        <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z" />
                    </svg>
                )}
                <span>Đăng nhập bằng Google</span>
            </button>
        </div>
    )
}
