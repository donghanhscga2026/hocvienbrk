'use client'

import { signIn, signOut, useSession } from "next-auth/react"
import { useForm } from "react-hook-form"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, Eye, EyeOff, AlertTriangle } from "lucide-react"

export default function LoginPage() {
    const { data: session } = useSession()
    const [isLoading, setIsLoading] = useState(false)
    const [isChangingPassword, setIsChangingPassword] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showPassword, setShowPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [success, setSuccess] = useState<string | null>(null)
    const router = useRouter()

    const { register, handleSubmit, formState: { errors } } = useForm({
        defaultValues: {
            identifier: "",
            password: "",
            newPassword: "",
            confirmPassword: ""
        }
    })

    // Kiểm tra nếu cần đổi mật khẩu sau khi đăng nhập
    useEffect(() => {
        if (session?.user && (session.user as any).needsPasswordChange) {
            setIsChangingPassword(true)
        }
    }, [session])

    async function onSubmit(data: any) {
        setIsLoading(true)
        setError(null)

        try {
            const result = await signIn("credentials", {
                identifier: data.identifier,
                password: data.password,
                redirect: false,
            })

            if (result?.error) {
                setError("Thông tin đăng nhập không chính xác. Vui lòng thử lại.")
            } else {
                // Kiểm tra lại session để xem có cần đổi mật khẩu không
                router.push("/")
                router.refresh()
            }
        } catch (err) {
            setError("Đã xảy ra lỗi không mong muốn.")
        } finally {
            setIsLoading(false)
        }
    }

    async function onChangePassword(data: any) {
        setIsLoading(true)
        setError(null)
        setSuccess(null)

        if (data.newPassword !== data.confirmPassword) {
            setError("Mật khẩu mới không khớp với xác nhận.")
            setIsLoading(false)
            return
        }

        if (data.newPassword.length < 6) {
            setError("Mật khẩu mới phải có ít nhất 6 ký tự.")
            setIsLoading(false)
            return
        }

        try {
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newPassword: data.newPassword })
            })

            if (res.ok) {
                setSuccess("Đổi mật khẩu thành công! Vui lòng đăng nhập lại.")
                setIsChangingPassword(false)
                // Sign out để user đăng nhập lại
                setTimeout(() => {
                    window.location.href = '/login'
                }, 2000)
            } else {
                const result = await res.json()
                setError(result.error || "Đổi mật khẩu thất bại.")
            }
        } catch (err) {
            setError("Đã xảy ra lỗi khi đổi mật khẩu.")
        } finally {
            setIsLoading(false)
        }
    }

    function cancelPasswordChange() {
        setIsChangingPassword(false)
        signOut({ callbackUrl: '/login' })
    }

    const handleGoogleSignIn = () => {
        setIsLoading(true)
        signIn("google", { callbackUrl: "/" })
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // GIAO DIỆN ĐỔI MẬT KHẨU (KHI DÙNG MẬT KHẨU MẶC ĐỊNH)
    // ═══════════════════════════════════════════════════════════════════════════════
    if (isChangingPassword) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-brk-surface via-brk-background to-brk-surface flex items-center justify-center p-4">
                <div className="w-full max-w-sm">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-black text-brk-primary tracking-tight">⚠️ CẢNH BÁO BẢO MẬT</h1>
                        <p className="text-brk-muted text-sm mt-2">Bạn đang dùng mật khẩu mặc định. Vui lòng đổi sang mật khẩu cá nhân.</p>
                    </div>

                    <div className="bg-brk-background/5 backdrop-blur-sm border border-brk-primary/30 rounded-2xl p-6 space-y-5 shadow-2xl">
                        <div className="flex items-center gap-3 p-4 bg-brk-primary-25 border border-brk-primary/30 rounded-xl">
                            <AlertTriangle className="h-6 w-6 text-brk-primary shrink-0" />
                            <p className="text-sm text-brk-primary">
                                Mật khẩu <code className="bg-brk-primary/20 px-2 py-0.5 rounded">Brk#3773</code> là mật khẩu mặc định. 
                                Để bảo vệ tài khoản, vui lòng đổi ngay.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit(onChangePassword)} className="space-y-4">
                            {error && (
                                <div className="rounded-lg bg-brk-accent/30 border border-brk-accent/50 p-3 text-sm text-brk-accent">{error}</div>
                            )}
                            {success && (
                                <div className="rounded-lg bg-brk-accent/30 border border-brk-accent/50 p-3 text-sm text-brk-accent">{success}</div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-brk-muted mb-1.5">Mật khẩu mới</label>
                                <div className="relative">
                                    <input
                                        {...register("newPassword", { 
                                            required: "Vui lòng nhập mật khẩu mới",
                                            minLength: { value: 6, message: "Tối thiểu 6 ký tự" }
                                        })}
                                        type={showNewPassword ? "text" : "password"}
                                        className="w-full rounded-xl border border-brk-outline bg-brk-background/5 px-4 py-3 pr-10 text-brk-on-surface text-sm placeholder:text-brk-muted focus:border-brk-primary focus:outline-none focus:ring-1 focus:ring-brk-primary"
                                        placeholder="Nhập mật khẩu mới"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-brk-muted hover:text-brk-on-surface"
                                    >
                                        {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                                {errors.newPassword && <p className="mt-1 text-xs text-brk-accent">{errors.newPassword.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-brk-muted mb-1.5"> Xác nhận mật khẩu mới</label>
                                <input
                                    {...register("confirmPassword", { required: "Vui lòng xác nhận mật khẩu" })}
                                    type={showNewPassword ? "text" : "password"}
                                    className="w-full rounded-xl border border-brk-outline bg-brk-background/5 px-4 py-3 text-brk-on-surface text-sm placeholder:text-brk-muted focus:border-brk-primary focus:outline-none focus:ring-1 focus:ring-brk-primary"
                                    placeholder="Nhập lại mật khẩu mới"
                                />
                                {errors.confirmPassword && <p className="mt-1 text-xs text-brk-accent">{errors.confirmPassword.message}</p>}
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full rounded-xl bg-brk-primary hover:bg-brk-primary px-4 py-3 text-sm font-bold text-brk-on-primary transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Đổi mật khẩu & Đăng nhập'}
                            </button>

                            <button
                                type="button"
                                onClick={cancelPasswordChange}
                                className="w-full rounded-xl border border-brk-outline bg-brk-background/5 px-4 py-3 text-sm font-medium text-brk-muted hover:text-brk-on-surface hover:border-brk-outline transition-colors"
                            >
                                Đăng xuất & Đăng nhập sau
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        )
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // GIAO DIỆN ĐĂNG NHẬP BÌNH THƯỜNG
    // ═══════════════════════════════════════════════════════════════════════════════
    return (
        <div className="min-h-screen bg-gradient-to-br from-brk-surface via-brk-background to-brk-surface flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                {/* Logo */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-black text-brk-on-surface tracking-tight">HỌC VIỆN BRK</h1>
                    <p className="text-brk-muted text-sm mt-1">Đăng nhập để tiếp tục hành trình</p>
                </div>

                <div className="bg-brk-background/5 backdrop-blur-sm border border-brk-outline/10 rounded-2xl p-6 space-y-5 shadow-2xl">
                    {/* Google */}
                    <button
                        onClick={handleGoogleSignIn}
                        disabled={isLoading}
                        className="flex w-full items-center justify-center gap-3 rounded-xl border border-brk-outline bg-brk-background/5 px-4 py-3 text-sm font-medium text-brk-on-surface hover:bg-brk-surface/10 transition-colors disabled:opacity-50"
                    >
                        <svg className="h-4 w-4 shrink-0" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z" /></svg>
                        Đăng nhập bằng Google
                    </button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-brk-outline" /></div>
                        <div className="relative flex justify-center text-xs"><span className="bg-transparent px-2 text-brk-muted">hoặc dùng tài khoản</span></div>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        {error && (
                            <div className="rounded-lg bg-brk-accent/30 border border-brk-accent/50 p-3 text-sm text-brk-accent">{error}</div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-brk-muted mb-1.5">Email / SĐT / Mã học viên</label>
                            <input
                                {...register("identifier", { required: "Vui lòng nhập thông tin" })}
                                type="text"
                                autoComplete="username"
                                className="w-full rounded-xl border border-brk-outline bg-brk-background/5 px-4 py-3 text-brk-on-surface text-sm placeholder:text-brk-muted focus:border-brk-primary focus:outline-none focus:ring-1 focus:ring-brk-primary"
                                placeholder="Nhập email hoặc mã học viên"
                            />
                            {errors.identifier && <p className="mt-1 text-xs text-brk-accent">{errors.identifier.message}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-brk-muted mb-1.5">Mật khẩu</label>
                            <div className="relative">
                                <input
                                    {...register("password", { required: "Vui lòng nhập mật khẩu" })}
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="current-password"
                                    className="w-full rounded-xl border border-brk-outline bg-brk-background/5 px-4 py-3 pr-10 text-brk-on-surface text-sm placeholder:text-brk-muted focus:border-brk-primary focus:outline-none focus:ring-1 focus:ring-brk-primary"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brk-muted hover:text-brk-on-surface"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                            {errors.password && <p className="mt-1 text-xs text-brk-accent">{errors.password.message}</p>}
                            <div className="mt-2 text-right">
                                <Link href="/forgot-password" className="text-xs text-brk-primary hover:text-brk-primary">
                                    Quên mật khẩu?
                                </Link>
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full rounded-xl bg-brk-primary hover:bg-brk-primary px-4 py-3 text-sm font-bold text-brk-on-primary transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Đăng nhập'}
                        </button>
                    </form>

                    <p className="text-center text-sm text-brk-muted">
                        Chưa có tài khoản?{' '}
                        <Link href="/register" className="font-semibold text-brk-primary hover:text-brk-primary">Đăng ký ngay</Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
