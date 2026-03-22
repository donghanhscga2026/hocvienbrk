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
        <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-black text-white tracking-tight">QUÊN MẬT KHẨU</h1>
                    <p className="text-zinc-400 text-sm mt-1">
                        {step === 1 ? "Nhập email để nhận mã xác minh" : "Nhập mã xác minh và mật khẩu mới"}
                    </p>
                </div>

                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 space-y-5 shadow-2xl">
                    {error && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-900/30 border border-red-700/50 text-sm text-red-400">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-900/30 border border-green-700/50 text-sm text-green-400">
                            <CheckCircle className="h-4 w-4 shrink-0" />
                            {success}
                        </div>
                    )}

                    {step === 1 ? (
                        <form onSubmit={handleSubmitStep1(onSubmitEmail)} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                                    <input
                                        {...registerStep1("email", { 
                                            required: "Vui lòng nhập email",
                                            pattern: {
                                                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                                message: "Email không hợp lệ"
                                            }
                                        })}
                                        type="email"
                                        className="w-full rounded-xl border border-zinc-700 bg-white/5 pl-10 pr-4 py-3 text-white text-sm placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                        placeholder="Nhập email của bạn"
                                    />
                                </div>
                                {errorsStep1.email && <p className="mt-1 text-xs text-red-400">{errorsStep1.email.message}</p>}
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 px-4 py-3 text-sm font-bold text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Gửi mã xác minh'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleSubmitStep2(onSubmitReset)} className="space-y-4">
                            <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700 text-sm">
                                <p className="text-zinc-400 mb-1">Mã xác minh đã gửi đến:</p>
                                <p className="text-white font-medium">{maskedEmail}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Mã xác minh</label>
                                <input
                                    {...registerStep2("otp", { 
                                        required: "Vui lòng nhập mã xác minh",
                                        minLength: { value: 6, message: "Mã xác minh gồm 6 chữ số" },
                                        maxLength: { value: 6, message: "Mã xác minh gồm 6 chữ số" }
                                    })}
                                    type="text"
                                    maxLength={6}
                                    className="w-full rounded-xl border border-zinc-700 bg-white/5 px-4 py-3 text-white text-sm placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 text-center font-mono tracking-widest text-lg"
                                    placeholder="000000"
                                />
                                {errorsStep2.otp && <p className="mt-1 text-xs text-red-400">{errorsStep2.otp.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Mật khẩu mới</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                                    <input
                                        {...registerStep2("newPassword", { 
                                            required: "Vui lòng nhập mật khẩu mới",
                                            minLength: { value: 6, message: "Tối thiểu 6 ký tự" }
                                        })}
                                        type={showPassword ? "text" : "password"}
                                        className="w-full rounded-xl border border-zinc-700 bg-white/5 pl-10 pr-4 py-3 text-white text-sm placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                        placeholder="Nhập mật khẩu mới"
                                    />
                                </div>
                                {errorsStep2.newPassword && <p className="mt-1 text-xs text-red-400">{errorsStep2.newPassword.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Xác nhận mật khẩu mới</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                                    <input
                                        {...registerStep2("confirmPassword", { required: "Vui lòng xác nhận mật khẩu" })}
                                        type={showPassword ? "text" : "password"}
                                        className="w-full rounded-xl border border-zinc-700 bg-white/5 pl-10 pr-4 py-3 text-white text-sm placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                        placeholder="Nhập lại mật khẩu mới"
                                    />
                                </div>
                                {errorsStep2.confirmPassword && <p className="mt-1 text-xs text-red-400">{errorsStep2.confirmPassword.message}</p>}
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="showPassword"
                                    checked={showPassword}
                                    onChange={(e) => setShowPassword(e.target.checked)}
                                    className="rounded border-zinc-600 bg-zinc-800 text-orange-500 focus:ring-orange-500"
                                />
                                <label htmlFor="showPassword" className="text-sm text-zinc-400">Hiển thị mật khẩu</label>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 px-4 py-3 text-sm font-bold text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Đặt lại mật khẩu'}
                            </button>

                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="w-full text-center text-sm text-zinc-500 hover:text-zinc-300"
                            >
                                ← Gửi lại email khác
                            </button>
                        </form>
                    )}
                </div>

                <p className="text-center text-sm text-zinc-500 mt-6">
                    Đã nhớ mật khẩu?{' '}
                    <Link href="/login" className="font-semibold text-orange-400 hover:text-orange-300">Đăng nhập</Link>
                </p>
            </div>
        </div>
    )
}
