'use client'

import { signOutPushCleanup } from "@/lib/web-push-client"
import { signIn, signOut, useSession } from "next-auth/react"
import { useForm } from "react-hook-form"
import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { useWi300Brand } from '@/components/wi300/Wi300BrandContext'
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, Eye, EyeOff, AlertTriangle } from "lucide-react"
import { validatePasswordStrength, PASSWORD_POLICY_MESSAGE } from "@/lib/password-policy"
import { safeReturnPath } from '@/lib/website/domain-shared'
// import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons"  // DISABLED: Google Auth
// import { useEmailPrefill } from "@/hooks/useEmailPrefill"  // DISABLED: Google Auth

function LoginForm() {
    const wi300 = useWi300Brand()
    const { data: session } = useSession()
    const [isLoading, setIsLoading] = useState(false)
    const [isChangingPassword, setIsChangingPassword] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [actionType, setActionType] = useState<string | null>(null)
    const [showPassword, setShowPassword] = useState(false)
    const [phoneStep, setPhoneStep] = useState(false)
    const [loginMethod, setLoginMethod] = useState<"password" | "email">("password")
    const [showAdminMfa, setShowAdminMfa] = useState(false)
    const [otpRequested, setOtpRequested] = useState(false)
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
            otp: "",
            loginOtp: "",
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

    async function checkPhone() {
        const identifier = (document.getElementById("smart-login-phone") as HTMLInputElement)?.value?.trim() || ""
        if (!/^0[0-9]{9}$/.test(identifier)) {
            setError("Vui lòng nhập số điện thoại Việt Nam hợp lệ (10 chữ số).")
            return
        }
        setIsLoading(true)
        setError(null)
        try {
            const res = await fetch("/api/auth/phone-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: identifier }) })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Không thể kiểm tra tài khoản.")
            if (!data.found) {
                setError("Chưa tìm thấy tài khoản. Nếu bạn mới tham gia, hãy chọn Đăng ký ngay.")
                return
            }
            setValue("identifier", identifier)
            setPhoneStep(true)
        } catch (e: any) { setError(e.message || "Không thể kiểm tra tài khoản.") }
        finally { setIsLoading(false) }
    }

    async function requestEmailOtp() {
        setIsLoading(true)
        setError(null)
        try {
            const res = await fetch("/api/auth/request-login-otp", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: (document.getElementById("smart-login-phone") as HTMLInputElement)?.value?.trim() || "" })
            })
            const result = await res.json()
            if (!res.ok) throw new Error(result.error || "Không thể gửi mã OTP.")
            setOtpRequested(true)
            setWarning("Nếu tài khoản có email đã xác minh, mã OTP sẽ được gửi đến hộp thư của bạn. Mã có hiệu lực 10 phút.")
        } catch (e: any) { setError(e.message || "Không thể gửi mã OTP.") }
        finally { setIsLoading(false) }
    }

    async function onSubmit(data: any) {
        setIsLoading(true)
        setError(null)
        setWarning(null)
        setActionType(null)

        try {
            const callbackUrl = safeReturnPath(searchParams.get('callbackUrl')) || (redirectSlug ? safeReturnPath(`/${redirectSlug}`) : null) || "/"
            
            const result = await signIn("credentials", {
                identifier: data.identifier,
                password: loginMethod === "email" ? "" : data.password,
                otp: data.otp || "",
                loginOtp: loginMethod === "email" ? data.loginOtp || "" : "",
                callbackUrl: callbackUrl,
                redirect: false,
            })

            if (result?.error) {
                let errorMsg = "Thông tin đăng nhập không chính xác. Vui lòng kiểm tra lại."
                let extraAction = ""

                try {
                    const errRes = await fetch('/api/auth/report-failed-login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ identifier: data.identifier })
                    })
                    const errData = await errRes.json()

                    // Keep the public error generic so attackers cannot enumerate accounts.
                    errorMsg = "Không thể đăng nhập. Kiểm tra thông tin xác thực và mã Authenticator nếu tài khoản đã bật MFA."
                    extraAction = "forgot_password"
                } catch {
                    // report-failed-login thất bại, dùng thông tin cơ bản
                    const identifier = data.identifier
                    if (/^\d+$/.test(identifier)) {
                        errorMsg = "Mã thành viên không tồn tại hoặc mật khẩu không chính xác."
                    } else if (identifier.includes('@')) {
                        errorMsg = "Email không tồn tại hoặc mật khẩu không chính xác."
                    } else {
                        errorMsg = "Số điện thoại không tồn tại hoặc mật khẩu không chính xác."
                    }
                }


                setError(errorMsg)
                setActionType(extraAction || null)
                setIsLoading(false)
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

        const passwordError = validatePasswordStrength(data.newPassword)
        if (passwordError) {
            setError(passwordError)
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

    async function cancelPasswordChange() {
        setIsChangingPassword(false)
        await signOutPushCleanup()
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
                                Bạn đang dùng mật khẩu mặc định do hệ thống cấp.
                                Để bảo vệ tài khoản, vui lòng đổi sang mật khẩu cá nhân ngay.
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
                                            validate: (value: string) => validatePasswordStrength(value) ?? true
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
                                {errors.newPassword ? (
                                    <p className="mt-1 text-xs text-brk-accent">{errors.newPassword.message}</p>
                                ) : (
                                    <p className="mt-1 text-xs text-brk-muted">{PASSWORD_POLICY_MESSAGE}</p>
                                )}
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
                    <h1 className="text-2xl font-black text-brk-on-surface tracking-tight">{wi300 ? `Đăng nhập ${wi300.name}` : 'HỌC VIỆN BRK'}</h1>
                    <p className="text-brk-accent text-sm mt-1">{wi300 ? 'Học tập, kết nối và khám phá cùng cộng đồng doanh nghiệp số.' : 'Đăng nhập để tiếp tục hành trình'}</p>
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

                    <div className="space-y-4">
                        {warning && <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-3 text-sm text-brk-on-surface">{warning}</div>}
                        {error && <div role="alert" className="rounded-lg bg-brk-accent/10 border border-brk-accent/30 p-3 text-sm text-brk-accent">{error}</div>}
                        <div>
                            <label htmlFor="smart-login-phone" className="block text-sm font-medium text-brk-accent mb-1.5">Số điện thoại của bạn</label>
                            <input id="smart-login-phone" type="tel" inputMode="tel" autoComplete="tel"
                                disabled={phoneStep} placeholder="Nhập số điện thoại"
                                className="w-full rounded-xl border border-brk-outline bg-brk-background/5 px-4 py-3 text-brk-on-surface text-sm"
                                onKeyDown={e => { if (!phoneStep && e.key === "Enter") { e.preventDefault(); void checkPhone() } }} />
                        </div>
                        {!phoneStep ? (
                            <button type="button" disabled={isLoading} onClick={checkPhone}
                                className="w-full rounded-xl bg-brk-primary px-4 py-3 font-bold text-brk-on-primary disabled:opacity-50">
                                {isLoading ? "Đang kiểm tra..." : "Kiểm tra và tiếp tục"}
                            </button>
                        ) : (
                            <>
                                <button type="button" className="text-xs text-brk-primary underline" onClick={() => {
                                    setPhoneStep(false); setOtpRequested(false); setLoginMethod("password"); setError(null); setWarning(null); setValue("otp", ""); setValue("loginOtp", "")
                                }}>Đổi số điện thoại</button>
                                <div className="grid grid-cols-2 gap-2">
                                    <button type="button" onClick={() => {setLoginMethod("password");setError(null)}}
                                        className={`rounded-lg px-2 py-3 text-sm font-medium ${loginMethod === "password" ? "bg-brk-primary text-brk-on-primary" : "border border-brk-outline text-brk-on-surface"}`}>Mật khẩu</button>
                                    <button type="button" onClick={() => {setLoginMethod("email");setError(null)}}
                                        className={`rounded-lg px-2 py-3 text-sm font-medium ${loginMethod === "email" ? "bg-brk-primary text-brk-on-primary" : "border border-brk-outline text-brk-on-surface"}`}>OTP qua email</button>
                                </div>
                                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                    {loginMethod === "password" ? (
                                        <div>
                                            <label className="block text-sm font-medium text-brk-accent mb-1.5">Mật khẩu</label>
                                            <div className="relative">
                                                <input {...register("password", { required: loginMethod === "password" ? "Nhập mật khẩu" : false })}
                                                    type={showPassword ? "text" : "password"} autoComplete="current-password"
                                                    placeholder="Nhập mật khẩu"
                                                    className="w-full rounded-xl border border-brk-outline bg-brk-background/5 px-4 py-3 pr-10 text-brk-on-surface text-sm" />
                                                <button type="button" aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                                                    onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-brk-accent">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                                            </div>
                                            {errors.password && <p className="text-xs text-brk-accent">{errors.password.message}</p>}
                                            <div className="text-right mt-2"><Link href="/forgot-password" className="text-xs text-brk-primary">Quên mật khẩu?</Link></div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {!otpRequested && <button type="button" disabled={isLoading} onClick={requestEmailOtp}
                                                className="w-full rounded-xl border border-brk-outline py-3 text-brk-on-surface">Gửi mã OTP vào email đã đăng ký</button>}
                                            {otpRequested && <>
                                                <label className="block text-sm font-medium text-brk-accent">Mã OTP email</label>
                                                <input {...register("loginOtp", { required: loginMethod === "email" ? "Nhập mã OTP" : false })}
                                                    inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="6 chữ số từ email"
                                                    className="w-full rounded-xl border border-brk-outline bg-brk-background/5 px-4 py-3 text-brk-on-surface text-sm" />
                                                <button type="button" disabled={isLoading} onClick={requestEmailOtp} className="text-xs text-brk-primary underline">Gửi lại OTP</button>
                                            </>}
                                        </div>
                                    )}
                                    <label className="flex items-center gap-2 text-xs text-brk-on-surface">
                                        <input type="checkbox" checked={showAdminMfa} onChange={e => setShowAdminMfa(e.target.checked)} />
                                        Tôi sử dụng Authenticator cho tài khoản quản trị
                                    </label>
                                    {showAdminMfa && <div>
                                        <label className="block text-sm font-medium text-brk-accent mb-1.5">Mã Authenticator</label>
                                        <input {...register("otp")} inputMode="numeric" maxLength={6} pattern="[0-9]{6}"
                                            placeholder="Mã 6 chữ số trong ứng dụng"
                                            className="w-full rounded-xl border border-brk-outline bg-brk-background/5 px-4 py-3 text-brk-on-surface text-sm" />
                                    </div>}
                                    <button type="submit" disabled={isLoading || (loginMethod === "email" && !otpRequested)}
                                        className="w-full rounded-xl bg-brk-primary px-4 py-3 text-sm font-bold text-brk-on-primary disabled:opacity-50">{isLoading ? "Đang đăng nhập..." : "Đăng nhập"}</button>
                                </form>
                            </>
                        )}
                    </div>

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
