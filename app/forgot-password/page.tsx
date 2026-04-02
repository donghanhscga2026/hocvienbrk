'use client'

import { useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { Loader2, Mail, Lock, CheckCircle, AlertCircle } from "lucide-react"

interface Step1Data { email: string }
interface Step2Data { otp: string; newPassword: string; confirmPassword: string }

export default function ForgotPasswordPage() {
    const [step, setStep] = useState<1 | 2>(1)
    const [email, setEmail] = useState("")
    const [maskedEmail, setMaskedEmail] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [showPassword, setShowPassword] = useState(false)

    const { register: registerStep1, handleSubmit: handleSubmitStep1, formState: { errors: errorsStep1 } } = useForm<Step1Data>()
    const { register: registerStep2, handleSubmit: handleSubmitStep2, formState: { errors: errorsStep2 } } = useForm<Step2Data>()

    async function onSubmitEmail(data: Step1Data) {
        setIsLoading(true)
        setError(null)

        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: data.email })
            })

            const result = await res.json()

            if (res.ok) {
                setEmail(data.email)
                setMaskedEmail(result.email)
                setStep(2)
                setSuccess("Mã xác minh đã được gửi đến email của bạn")
            } else {
                setError(result.error || "Không thể gửi mã xác minh")
            }
        } catch {
            setError("Đã xảy ra lỗi khi gửi yêu cầu")
        } finally {
            setIsLoading(false)
        }
    }

    async function onSubmitReset(data: Step2Data) {
        setIsLoading(true)
        setError(null)

        if (data.newPassword !== data.confirmPassword) {
            setError("Mật khẩu mới không khớp với xác nhận")
            setIsLoading(false)
            return
        }

        if (data.newPassword.length < 6) {
            setError("Mật khẩu phải có ít nhất 6 ký tự")
            setIsLoading(false)
            return
        }

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp: data.otp, newPassword: data.newPassword })
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
                    <h1 className="text-2xl font-black text-brk-on-surface tracking-tight">QUÊN MẬT KHẨU</h1>
                    <p className="text-brk-muted text-sm mt-1">
                        {step === 1 ? "Nhập email để nhận mã xác minh" : "Nhập mã xác minh và mật khẩu mới"}
                    </p>
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

                    {step === 1 ? (
                        <form onSubmit={handleSubmitStep1(onSubmitEmail)} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-brk-muted mb-1.5">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-brk-muted" />
                                    <input
                                        {...registerStep1("email", { 
                                            required: "Vui lòng nhập email",
                                            pattern: {
                                                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                                message: "Email không hợp lệ"
                                            }
                                        })}
                                        type="email"
                                        className="w-full rounded-xl border border-brk-outline bg-brk-background/5 pl-10 pr-4 py-3 text-brk-on-surface text-sm placeholder:text-brk-muted focus:border-brk-primary focus:outline-none focus:ring-1 focus:ring-brk-primary"
                                        placeholder="Nhập email của bạn"
                                    />
                                </div>
                                {errorsStep1.email && <p className="mt-1 text-xs text-brk-accent">{errorsStep1.email.message}</p>}
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full rounded-xl bg-brk-primary hover:bg-brk-primary px-4 py-3 text-sm font-bold text-brk-on-primary transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Gửi mã xác minh'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleSubmitStep2(onSubmitReset)} className="space-y-4">
                            <div className="p-3 rounded-lg bg-brk-background/50 border border-brk-outline text-sm">
                                <p className="text-brk-muted mb-1">Mã xác minh đã gửi đến:</p>
                                <p className="text-brk-on-surface font-medium">{maskedEmail}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-brk-muted mb-1.5">Mã xác minh</label>
                                <input
                                    {...registerStep2("otp", { 
                                        required: "Vui lòng nhập mã xác minh",
                                        minLength: { value: 6, message: "Mã xác minh gồm 6 chữ số" },
                                        maxLength: { value: 6, message: "Mã xác minh gồm 6 chữ số" }
                                    })}
                                    type="text"
                                    maxLength={6}
                                    className="w-full rounded-xl border border-brk-outline bg-brk-background/5 px-4 py-3 text-brk-on-surface text-sm placeholder:text-brk-muted focus:border-brk-primary focus:outline-none focus:ring-1 focus:ring-brk-primary text-center font-mono tracking-widest text-lg"
                                    placeholder="000000"
                                />
                                {errorsStep2.otp && <p className="mt-1 text-xs text-brk-accent">{errorsStep2.otp.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-brk-muted mb-1.5">Mật khẩu mới</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-brk-muted" />
                                    <input
                                        {...registerStep2("newPassword", { 
                                            required: "Vui lòng nhập mật khẩu mới",
                                            minLength: { value: 6, message: "Tối thiểu 6 ký tự" }
                                        })}
                                        type={showPassword ? "text" : "password"}
                                        className="w-full rounded-xl border border-brk-outline bg-brk-background/5 pl-10 pr-4 py-3 text-brk-on-surface text-sm placeholder:text-brk-muted focus:border-brk-primary focus:outline-none focus:ring-1 focus:ring-brk-primary"
                                        placeholder="Nhập mật khẩu mới"
                                    />
                                </div>
                                {errorsStep2.newPassword && <p className="mt-1 text-xs text-brk-accent">{errorsStep2.newPassword.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-brk-muted mb-1.5"> Xác nhận mật khẩu mới</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-brk-muted" />
                                    <input
                                        {...registerStep2("confirmPassword", { required: "Vui lòng xác nhận mật khẩu" })}
                                        type={showPassword ? "text" : "password"}
                                        className="w-full rounded-xl border border-brk-outline bg-brk-background/5 pl-10 pr-4 py-3 text-brk-on-surface text-sm placeholder:text-brk-muted focus:border-brk-primary focus:outline-none focus:ring-1 focus:ring-brk-primary"
                                        placeholder="Nhập lại mật khẩu mới"
                                    />
                                </div>
                                {errorsStep2.confirmPassword && <p className="mt-1 text-xs text-brk-accent">{errorsStep2.confirmPassword.message}</p>}
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="showPassword"
                                    checked={showPassword}
                                    onChange={(e) => setShowPassword(e.target.checked)}
                                    className="rounded border-brk-outline bg-brk-background text-brk-primary focus:ring-brk-primary"
                                />
                                <label htmlFor="showPassword" className="text-sm text-brk-muted">Hiển thị mật khẩu</label>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full rounded-xl bg-brk-primary hover:bg-brk-primary px-4 py-3 text-sm font-bold text-brk-on-primary transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Đặt lại mật khẩu'}
                            </button>

                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="w-full text-center text-sm text-brk-muted hover:text-brk-on-surface"
                            >
                                ← Gửi lại email khác
                            </button>
                        </form>
                    )}
                </div>

                <p className="text-center text-sm text-brk-muted mt-6">
                    Đã nhớ mật khẩu?{' '}
                    <Link href="/login" className="font-semibold text-brk-primary hover:text-brk-primary">Đăng nhập</Link>
                </p>
            </div>
        </div>
    )
}
