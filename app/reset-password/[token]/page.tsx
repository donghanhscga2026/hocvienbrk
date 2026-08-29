'use client'

import { useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { Loader2, Lock, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react"
import { validatePasswordStrength, PASSWORD_POLICY_MESSAGE } from "@/lib/password-policy"

interface FormData { newPassword: string; confirmPassword: string }

export default function ResetPasswordLinkPage() {
    const params = useParams()
    const token = params.token as string

    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [showPassword, setShowPassword] = useState(false)

    const { register, handleSubmit, formState: { errors } } = useForm<FormData>()

    async function onSubmit(data: FormData) {
        setIsLoading(true)
        setError(null)

        if (data.newPassword !== data.confirmPassword) {
            setError("Mật khẩu mới không khớp với xác nhận")
            setIsLoading(false)
            return
        }

        const passwordError = validatePasswordStrength(data.newPassword)
        if (passwordError) {
            setError(passwordError)
            setIsLoading(false)
            return
        }

        try {
            const res = await fetch('/api/auth/reset-password-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword: data.newPassword })
            })

            const result = await res.json()

            if (res.ok) {
                setSuccess("Đặt lại mật khẩu thành công! Vui lòng đăng nhập.")
                setTimeout(() => {
                    window.location.href = '/login'
                }, 2000)
            } else {
                setError(result.error || "Không thể đặt lại mật khẩu")
            }
        } catch {
            setError("Đã xảy ra lỗi khi đặt lại mật khẩu")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-brk-surface via-brk-background to-brk-surface flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-black text-brk-on-surface tracking-tight">ĐẶT LẠI MẬT KHẨU</h1>
                    <p className="text-brk-muted text-sm mt-1">Nhập mật khẩu mới cho tài khoản của bạn</p>
                </div>

                <div className="bg-brk-background/5 backdrop-blur-sm border border-brk-outline/10 rounded-2xl p-6 space-y-5 shadow-2xl">
                    {error && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-brk-accent/30 border border-brk-accent/50 text-sm text-brk-accent">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-brk-accent/30 border border-brk-accent/50 text-sm text-brk-accent">
                            <CheckCircle className="h-4 w-4 shrink-0" />
                            {success}
                        </div>
                    )}

                    {!success && (
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-brk-muted mb-1.5">Mật khẩu mới</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-brk-muted" />
                                    <input
                                        {...register("newPassword", {
                                            required: "Vui lòng nhập mật khẩu mới",
                                            validate: (value) => validatePasswordStrength(value) ?? true
                                        })}
                                        type={showPassword ? "text" : "password"}
                                        className="w-full rounded-xl border border-brk-outline bg-brk-background/5 pl-10 pr-10 py-3 text-brk-on-surface text-sm placeholder:text-brk-muted focus:border-brk-primary focus:outline-none focus:ring-1 focus:ring-brk-primary"
                                        placeholder="Nhập mật khẩu mới"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-brk-muted hover:text-brk-on-surface"
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                                {errors.newPassword ? (
                                    <p className="mt-1 text-xs text-brk-accent">{errors.newPassword.message}</p>
                                ) : (
                                    <p className="mt-1 text-xs text-brk-muted">{PASSWORD_POLICY_MESSAGE}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-brk-muted mb-1.5">Xác nhận mật khẩu mới</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-brk-muted" />
                                    <input
                                        {...register("confirmPassword", { required: "Vui lòng xác nhận mật khẩu" })}
                                        type={showPassword ? "text" : "password"}
                                        className="w-full rounded-xl border border-brk-outline bg-brk-background/5 pl-10 pr-4 py-3 text-brk-on-surface text-sm placeholder:text-brk-muted focus:border-brk-primary focus:outline-none focus:ring-1 focus:ring-brk-primary"
                                        placeholder="Nhập lại mật khẩu mới"
                                    />
                                </div>
                                {errors.confirmPassword && <p className="mt-1 text-xs text-brk-accent">{errors.confirmPassword.message}</p>}
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full rounded-xl bg-brk-primary hover:bg-brk-primary px-4 py-3 text-sm font-bold text-brk-on-primary transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Đặt lại mật khẩu'}
                            </button>
                        </form>
                    )}
                </div>

                <p className="text-center text-sm text-brk-muted mt-6">
                    <Link href="/login" className="font-semibold text-brk-primary hover:text-brk-primary">Về trang đăng nhập</Link>
                </p>
            </div>
        </div>
    )
}
