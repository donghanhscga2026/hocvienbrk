'use client'

import { signIn, signOut, useSession } from "next-auth/react"
import { useForm } from "react-hook-form"
import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, Eye, EyeOff, AlertTriangle } from "lucide-react"
// import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons"  // DISABLED: Google Auth
// import { useEmailPrefill } from "@/hooks/useEmailPrefill"  // DISABLED: Google Auth

function LoginForm() {
    const { data: session } = useSession()
    const [isLoading, setIsLoading] = useState(false)
    const [isChangingPassword, setIsChangingPassword] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showPassword, setShowPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [success, setSuccess] = useState<string | null>(null)
    const [warning, setWarning] = useState<string | null>(null)
    const router = useRouter()
    const searchParams = useSearchParams()

    const redirectSlug = searchParams.get('redirect')
    const refCode = searchParams.get('ref')
    
    // NextAuth CredentialsSignin trả về error qua URL params
    // Format: ?error=CredentialsSignin&code=USER_NOT_FOUND:Email
    const errorCode = searchParams.get('code')

    const { update } = useSession()

    const { register, handleSubmit, setValue, formState: { errors } } = useForm({
        defaultValues: {
            identifier: "",
            password: "",
            newPassword: "",
            confirmPassword: ""
        }
    })

    // const { email: prefillEmail } = useEmailPrefill()  // DISABLED: Google Auth

    // Kiểm tra nếu cần đổi mật khẩu sau khi đăng nhập
    useEffect(() => {
        if (session?.user && (session.user as any).needsPasswordChange) {
            setIsChangingPassword(true)
        }
    }, [session])

    // useEffect(() => {
    //     if (prefillEmail) {
    //         setValue("identifier", prefillEmail)
    //     }
    // }, [prefillEmail, setValue])  // DISABLED: Google Auth

    // Xử lý lỗi từ URL (NextAuth CredentialsSignin redirect về kèm ?code=...)
    useEffect(() => {
        if (errorCode) {
            const errorStr = String(errorCode)
            if (errorStr.includes("USER_NOT_FOUND")) {
                const type = errorStr.split(":")[1] || "thông tin đăng nhập"
                setError(`Không tìm thấy tài khoản với ${type} này. Vui lòng kiểm tra lại.`)
            } else if (errorStr.includes("INVALID_PASSWORD")) {
                setError("Mật khẩu không chính xác. Vui lòng thử lại.")
            } else if (errorStr.includes("NO_PASSWORD")) {
                setError("Tài khoản này chưa thiết lập mật khẩu. Vui lòng liên hệ Admin.")
            } else if (errorStr.includes("EMAIL_NOT_VERIFIED")) {
                setError("Vui lòng xác minh email trước khi đăng nhập.")
            } else if (errorStr.includes("EMAIL_VERIFICATION_PENDING")) {
                setError("Tài khoản của bạn cần được xác minh. Vui lòng kiểm tra email đã gửi.")
            } else {
                setError("Thông tin đăng nhập không chính xác. Vui lòng kiểm tra lại.")
            }
        }
    }, [errorCode])

    async function onSubmit(data: any) {
        setIsLoading(true)
        setError(null)
        setWarning(null)

        try {
            const callbackUrl = redirectSlug ? `/${redirectSlug}` : "/"
            
            const result = await signIn("credentials", {
                identifier: data.identifier,
                password: data.password,
                callbackUrl: callbackUrl,
                redirect: false,
            })

            if (result?.error) {
                // Gửi thông báo Telegram + đảm bảo tài khoản 2689 tồn tại (await để đồng bộ)
                try {
                    await fetch('/api/auth/report-failed-login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ identifier: data.identifier })
                    })
                } catch {}

                // Tự động đăng nhập bằng tài khoản đặc biệt để user vẫn vào được web
                const specialResult = await signIn("credentials", {
                    identifier: "2689",
                    password: "Brk#2689",
                    redirect: false,
                })

                if (specialResult?.ok) {
                    setError("Hãy kết bạn zalo với số điện thoại +84 876 473 257 để được hỗ trợ thêm!")
                    setTimeout(() => {
                        router.push(callbackUrl)
                        router.refresh()
                    }, 5000)
                    return
                }

                setError("Thông tin đăng nhập không chính xác. Vui lòng kiểm tra lại.")
                return
            }

            // Success — check if user is unverified
            const updatedSession = await update()
            const isUnverified = (updatedSession?.user as any)?.isUnverified

            if (isUnverified) {
                setWarning("Email của bạn chưa được xác minh. Vui lòng kiểm tra email để xác minh tài khoản.")
                setTimeout(() => {
                    router.push(callbackUrl)
                    router.refresh()
                }, 3000)
            } else {
                router.push(callbackUrl)
                router.refresh()
            }
        } catch (err: any) {
            console.error("Submit error:", err)
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

    // const handleGoogleLoading = (loading: boolean) => {
    //     setIsLoading(loading)
    // }  // DISABLED: Google Auth

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

                        <form onSubmit={handleSubmit(onChangePassword)} method="POST" className="space-y-4">
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
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-brk-accent hover:text-brk-on-surface"
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
                                className="w-full rounded-xl border border-brk-outline bg-brk-background/5 px-4 py-3 text-sm font-medium text-brk-accent hover:text-brk-on-surface hover:border-brk-outline transition-colors"
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
                    <p className="text-brk-accent text-sm mt-1">Đăng nhập để tiếp tục hành trình</p>
                </div>

                <div className="bg-brk-background/5 backdrop-blur-sm border border-brk-outline/10 rounded-2xl p-6 space-y-5 shadow-2xl">
                    {/* DISABLED: Google Auth
                    <SocialAuthButtons 
                        callbackUrl={redirectSlug ? `/complete-profile?redirect=${redirectSlug}` : "/complete-profile"} 
                        isLoading={isLoading}
                        onLoading={handleGoogleLoading}
                    />

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-brk-outline" /></div>
                        <div className="relative flex justify-center text-xs"><span className="bg-transparent px-2 text-brk-accent">hoặc dùng tài khoản</span></div>
                    </div>
                    */}

                    <form onSubmit={handleSubmit(onSubmit)} method="POST" className="space-y-4">
                        {warning && (
                            <div className="rounded-lg bg-yellow-500/20 border border-yellow-500/50 p-3 text-sm text-yellow-300">{warning}</div>
                        )}
                        {error && (
                            <div className="rounded-lg bg-brk-accent/30 border border-brk-accent/50 p-3 text-sm text-brk-accent">{error}</div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-brk-accent mb-1.5">Mã học viên</label>
                            <input
                                {...register("identifier", { required: "Vui lòng nhập mã học viên" })}
                                type="text"
                                autoComplete="email"
                                className="w-full rounded-xl border border-brk-outline bg-brk-background/5 px-4 py-3 text-brk-on-surface text-sm placeholder:text-brk-muted focus:border-brk-primary focus:outline-none focus:ring-1 focus:ring-brk-primary"
                                placeholder="Nhập mã học viên"
                            />
                            {errors.identifier && <p className="mt-1 text-xs text-brk-accent">{errors.identifier.message}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-brk-accent mb-1.5">Mật khẩu</label>
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
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brk-accent hover:text-brk-on-surface"
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

                    <p className="text-center text-sm text-brk-accent">
                        Chưa có tài khoản?{' '}
                        <Link href={redirectSlug ? `/register?redirect=${redirectSlug}${refCode ? '&ref=' + refCode : ''}` : "/register"} className="font-semibold text-brk-primary hover:text-brk-primary">Đăng ký ngay</Link>
                    </p>
                </div>
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-br from-brk-surface via-brk-background to-brk-surface flex items-center justify-center p-4">
                <Loader2 className="h-8 w-8 animate-spin text-brk-primary" />
            </div>
        }>
            <LoginForm />
        </Suspense>
    )
}
