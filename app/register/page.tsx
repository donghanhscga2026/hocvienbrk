'use client'

import { useForm } from "react-hook-form"
import { useState, useEffect, Suspense, useRef } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, Eye, EyeOff, ChevronDown, CheckCircle2 } from "lucide-react"
import { registerUser } from "../actions/auth-actions"

const COUNTRY_CODES = [
    { code: "+84", iso: "VN", flag: "vn" },
    { code: "+1", iso: "US", flag: "us" },
    { code: "+44", iso: "UK", flag: "gb" },
    { code: "+61", iso: "AU", flag: "au" },
    { code: "+65", iso: "SG", flag: "sg" },
    { code: "+66", iso: "TH", flag: "th" },
    { code: "+855", iso: "KH", flag: "kh" },
    { code: "+856", iso: "LA", flag: "la" },
    { code: "+60", iso: "MY", flag: "my" },
    { code: "+62", iso: "ID", flag: "id" },
    { code: "+63", iso: "PH", flag: "ph" },
    { code: "+81", iso: "JP", flag: "jp" },
    { code: "+82", iso: "KR", flag: "kr" },
    { code: "+86", iso: "CN", flag: "cn" },
    { code: "+33", iso: "FR", flag: "fr" },
    { code: "+49", iso: "DE", flag: "de" },
    { code: "+39", iso: "IT", flag: "it" },
    { code: "+34", iso: "ES", flag: "es" },
    { code: "+7", iso: "RU", flag: "ru" },
    { code: "+971", iso: "AE", flag: "ae" },
]

function RegisterForm() {
    const [isLoading, setIsLoading] = useState(false)
    const [isVerifying, setIsVerifying] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)
    const [registeredUserId, setRegisteredUserId] = useState<number | null>(null)
    const [otp, setOtp] = useState("")
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null)
    const [showPassword, setShowPassword] = useState(false)
    const [referrerName, setReferrerName] = useState<string | null>(null)
    const [isCountryOpen, setIsCountryOpen] = useState(false)
    const countryRef = useRef<HTMLDivElement>(null)
    
    const router = useRouter()
    const searchParams = useSearchParams()

    const urlRef = searchParams.get('ref')
    const redirectSlug = searchParams.get('redirect')

    const getAffiliateRef = () => {
        if (typeof window === 'undefined') return null
        try {
            const stored = localStorage.getItem('affiliate_ref')
            if (!stored) return null
            const data = JSON.parse(stored)
            const expiryMs = 30 * 24 * 60 * 60 * 1000
            if (Date.now() - data.timestamp > expiryMs) {
                localStorage.removeItem('affiliate_ref')
                return null
            }
            return data.ref
        } catch {
            return null
        }
    }

    // Resolve ref to userId using the new API
    const resolveRefToUserId = async (ref: string): Promise<string | null> => {
        try {
            const res = await fetch(`/api/affiliate/resolve-ref?ref=${encodeURIComponent(ref)}`)
            const data = await res.json()
            if (data.found && data.userId) {
                return data.userId.toString()
            }
            return null
        } catch {
            return null
        }
    }

    // Initial ref resolution
    const [initialRef, setInitialRef] = useState<string>("")
    const [resolvedRef, setResolvedRef] = useState<string>("")

    useEffect(() => {
        const processRef = async () => {
            const ref = urlRef || getAffiliateRef()
            if (ref) {
                // Check if it's already a user ID (numeric)
                if (/^\d+$/.test(ref)) {
                    setInitialRef(ref)
                    setResolvedRef(ref)
                } else {
                    // Resolve custom ref to userId
                    const userId = await resolveRefToUserId(ref)
                    if (userId) {
                        setInitialRef(userId)
                        setResolvedRef(userId)
                        // Clear localStorage after successful resolution
                        localStorage.removeItem('affiliate_ref')
                    } else {
                        setInitialRef(ref)
                        setResolvedRef(ref)
                    }
                }
            }
        }
        processRef()
    }, [urlRef])

    const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
        defaultValues: {
            name: "",
            email: "",
            countryCode: "+84",
            phone: "",
            password: "",
            referrerId: ""
        }
    })

    useEffect(() => {
        if (resolvedRef) {
            setValue("referrerId", resolvedRef)
        }
    }, [resolvedRef, setValue])

    const countryCode = watch("countryCode")
    const formReferrerId = watch("referrerId")
    const userName = watch("name")
    const selectedCountry = COUNTRY_CODES.find(c => c.code === countryCode) || COUNTRY_CODES[0]

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (countryRef.current && !countryRef.current.contains(event.target as Node)) {
                setIsCountryOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    useEffect(() => {
        if (formReferrerId) {
            const delayDebounceFn = setTimeout(() => {
                fetch(`/api/user/${formReferrerId}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.name) setReferrerName(data.name)
                        else setReferrerName(null)
                    })
                    .catch(() => setReferrerName(null))
            }, 500)
            return () => clearTimeout(delayDebounceFn)
        } else {
            setReferrerName(null)
        }
    }, [formReferrerId])

    async function onSubmit(data: any) {
        setIsLoading(true)
        setError(null)
        setSuccess(null)
        setFieldErrors(null)

        try {
            const formData = new FormData()
            formData.append("name", data.name)
            formData.append("email", data.email)
            formData.append("countryCode", data.countryCode)
            formData.append("phone", data.phone)
            formData.append("password", data.password)
            if (data.referrerId) {
                formData.append("referrerId", data.referrerId.toString())
            }

            const result = await registerUser(null, formData)

            if (result?.success) {
                setSuccess(result.message)
                setRegisteredEmail(result.email)
                setRegisteredUserId(result.userId)
                window.scrollTo({ top: 0, behavior: 'smooth' })
            } else if (result?.message || result?.errors) {
                if (result.errors) {
                    setFieldErrors(result.errors)
                }
                if (result.message) {
                    setError(result.message)
                }
            }

        } catch (err: any) {
            setError("Có lỗi xảy ra. Vui lòng thử lại sau.")
        } finally {
            setIsLoading(false)
        }
    }

    async function handleVerifyOtp() {
        if (!otp || otp.length !== 6) {
            setError("Vui lòng nhập mã OTP 6 số")
            return
        }

        setIsVerifying(true)
        setError(null)

        try {
            const res = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: registeredEmail, otp })
            })

            const result = await res.json()

            if (res.ok) {
                setSuccess("Xác minh thành công! Đang chuyển đến trang đăng nhập...")
                setTimeout(() => {
                    router.push(redirectSlug ? `/login?redirect=${redirectSlug}` : "/login")
                }, 2000)
            } else {
                setError(result.error || "Mã xác minh không chính xác")
            }
        } catch {
            setError("Đã xảy ra lỗi khi xác minh")
        } finally {
            setIsVerifying(false)
        }
    }

    const openZalo = () => {
        const msg = `Chào Admin, tôi là ${userName}, mã #${registeredUserId}, vừa đăng ký bằng email ${registeredEmail}. Nhờ Admin xác minh tài khoản giúp tôi.`
        window.open(`https://zalo.me/0388625868?text=${encodeURIComponent(msg)}`, '_blank')
    }

    const openTelegram = () => {
        const msg = `Chào Admin, tôi là ${userName}, mã #${registeredUserId}, vừa đăng ký bằng email ${registeredEmail}. Nhờ Admin xác minh tài khoản giúp tôi.`
        window.open(`https://t.me/hocvienbrk?text=${encodeURIComponent(msg)}`, '_blank')
    }

    return (
        <div className="w-full max-w-md space-y-8 rounded-xl bg-brk-surface p-6 sm:p-8 shadow-lg">
            <div className="text-center">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-brk-on-surface">
                    {success && registeredEmail ? "Xác minh tài khoản" : "Tạo tài khoản mới"}
                </h2>
                <p className="mt-2 text-sm text-brk-muted">
                    {success && registeredEmail ? "Nhập mã OTP đã gửi đến email của bạn" : "Chào mừng tham gia Học viện BRK"}
                </p>
            </div>

            <div className="space-y-4">
                {success && registeredEmail ? (
                    <div className="space-y-6">
                        <div className="rounded-lg bg-brk-accent/10 p-5 border border-brk-accent/30 text-center">
                            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-brk-accent/20 mb-3">
                                <CheckCircle2 className="h-5 w-5 text-brk-accent" />
                            </div>
                            <p className="text-xs text-brk-accent leading-relaxed">
                                {success}
                            </p>
                            <p className="mt-2 text-sm font-bold text-brk-on-surface">{registeredEmail}</p>
                        </div>

                        {error && (
                            <div className="rounded-md bg-brk-accent/10 p-3 text-sm text-brk-accent border border-brk-accent/30">
                                {error}
                            </div>
                        )}

                        <div className="space-y-3">
                            <label className="block text-center text-sm font-medium text-brk-muted">Nhập mã OTP (6 số)</label>
                            <input
                                type="text"
                                maxLength={6}
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                placeholder="000000"
                                className="block w-full text-center text-2xl font-mono tracking-[0.5em] rounded-md border border-brk-outline bg-brk-background px-3 py-3 shadow-sm focus:border-brk-primary focus:outline-none focus:ring-brk-primary"
                            />
                            <button
                                onClick={handleVerifyOtp}
                                disabled={isVerifying || otp.length !== 6}
                                className="flex w-full justify-center rounded-lg bg-brk-primary px-4 py-3 text-sm font-bold text-brk-on-primary hover:bg-brk-primary-hover focus:outline-none focus:ring-2 focus:ring-brk-primary disabled:opacity-50"
                            >
                                {isVerifying ? <Loader2 className="animate-spin h-5 w-5" /> : "Xác minh ngay"}
                            </button>
                        </div>

                        <div className="relative py-2">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-brk-outline" /></div>
                            <div className="relative flex justify-center text-xs"><span className="bg-brk-surface px-2 text-brk-muted uppercase tracking-wider">Hoặc xác minh qua</span></div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={openZalo}
                                className="flex items-center justify-center gap-2 rounded-lg bg-[#0068ff] px-4 py-2.5 text-[10px] min-[400px]:text-xs font-bold text-white hover:opacity-90 transition-opacity"
                            >
                                <img src="https://upload.wikimedia.org/wikipedia/commons/9/91/Icon_of_Zalo.svg" alt="Zalo" className="h-4 w-4" />
                                Zalo Admin
                            </button>
                            <button
                                onClick={openTelegram}
                                className="flex items-center justify-center gap-2 rounded-lg bg-[#229ED9] px-4 py-2.5 text-[10px] min-[400px]:text-xs font-bold text-white hover:opacity-90 transition-opacity"
                            >
                                <img src="https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg" alt="Telegram" className="h-4 w-4" />
                                Telegram
                            </button>
                        </div>

                        <p className="text-center text-xs text-brk-muted">
                            Bạn gặp khó khăn khi xác minh? Liên hệ Admin để được hỗ trợ kích hoạt ngay lập tức.
                        </p>
                    </div>
                ) : success ? (
                    // This is the fallback for manual success message without OTP flow (if any)
                    <div className="rounded-lg bg-brk-accent/10 p-6 text-center border border-brk-accent/30">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brk-accent/20 mb-4">
                            <CheckCircle2 className="h-6 w-6 text-brk-accent" />
                        </div>
                        <h3 className="text-lg font-bold text-brk-accent mb-2">Đăng ký thành công!</h3>
                        <p className="text-sm text-brk-accent leading-relaxed">
                            {success}
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-brk-on-surface mb-1">
                                Mã giới thiệu (Trân trọng biết ơn Nhân mạch)
                            </label>
                            <div className="flex items-center gap-2">
                                {/* Input ẩn: giữ value thật để React Hook Form submit đúng dù field bị disabled */}
                                {resolvedRef && (
                                    <input type="hidden" {...register("referrerId")} value={resolvedRef} />
                                )}
                                <input
                                    {...(resolvedRef ? {} : register("referrerId"))}
                                    type="text"
                                    placeholder="0"
                                    disabled={!!resolvedRef}
                                    value={resolvedRef || undefined}
                                    className={`block w-20 rounded-md border px-3 py-2 text-sm shadow-sm ${resolvedRef ? 'border-brk-accent/40 bg-brk-accent/10 text-brk-accent font-semibold cursor-not-allowed opacity-80' : 'border-brk-outline focus:border-brk-primary focus:outline-none focus:ring-brk-primary'}`}
                                />
                                {formReferrerId && referrerName && (
                                    <div className="flex-1 flex items-center gap-1.5 px-3 py-2 rounded-md bg-brk-accent/10 border border-brk-accent/30 overflow-hidden">
                                        <span className="text-brk-accent text-xs whitespace-nowrap hidden min-[400px]:inline">Bởi:</span>
                                        <span className="text-brk-accent text-xs font-bold truncate">
                                            {referrerName}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {error && (
                            <div className="rounded-md bg-brk-accent/10 p-3 text-sm text-brk-accent border border-brk-accent/30">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-brk-on-surface">
                                Họ và tên
                            </label>
                            <input
                                {...register("name", { required: "Vui lòng nhập họ tên" })}
                                type="text"
                                placeholder="Nguyễn Văn A"
                                className="mt-1 block w-full rounded-md border border-brk-outline px-3 py-2 shadow-sm focus:border-brk-primary focus:outline-none focus:ring-brk-primary text-sm"
                            />
                            {errors.name && (
                                <p className="mt-1 text-xs text-brk-accent font-medium">{errors.name.message}</p>
                            )}
                            {fieldErrors?.name && (
                                <p className="mt-1 text-xs text-brk-accent font-medium">{fieldErrors.name[0]}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-brk-on-surface">
                                Địa chỉ Email (cần xác minh sau khi đăng ký)
                            </label>
                            <input
                                {...register("email", {
                                    required: "Vui lòng nhập email",
                                    pattern: { value: /^\S+@\S+$/i, message: "Email không hợp lệ" }
                                })}
                                type="email"
                                placeholder="vi-du@gmail.com"
                                className="mt-1 block w-full rounded-md border border-brk-outline px-3 py-2 shadow-sm focus:border-brk-primary focus:outline-none focus:ring-brk-primary text-sm"
                            />
                            {errors.email && (
                                <p className="mt-1 text-xs text-brk-accent font-medium">{errors.email.message}</p>
                            )}
                            {fieldErrors?.email && (
                                <p className="mt-1 text-xs text-brk-accent font-medium">{fieldErrors.email[0]}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-brk-on-surface">
                                Số điện thoại (dùng zalo/telegram là tốt nhất)
                            </label>
                            <div className="flex gap-2">
                                <div className="relative" ref={countryRef}>
                                    <button
                                        type="button"
                                        onClick={() => setIsCountryOpen(!isCountryOpen)}
                                        className="flex w-36 items-center justify-between rounded-md border border-brk-outline bg-brk-surface px-3 py-2 text-sm shadow-sm focus:border-brk-primary focus:outline-none focus:ring-1 focus:ring-brk-primary"
                                    >
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <img 
                                                src={`https://flagcdn.com/w20/${selectedCountry.flag}.png`} 
                                                alt={selectedCountry.iso}
                                                className="h-3.5 w-auto flex-shrink-0"
                                            />
                                            <span className="truncate">{selectedCountry.iso} ({selectedCountry.code})</span>
                                        </div>
                                        <ChevronDown className={`h-4 w-4 flex-shrink-0 text-brk-muted transition-transform ${isCountryOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {isCountryOpen && (
                                        <div className="absolute z-50 mt-1 max-h-60 w-48 overflow-auto rounded-md bg-brk-surface py-1 shadow-xl border border-brk-outline/30 focus:outline-none">
                                            {COUNTRY_CODES.map((c) => (
                                                <button
                                                    key={c.code}
                                                    type="button"
                                                    onClick={() => {
                                                        setValue("countryCode", c.code)
                                                        setIsCountryOpen(false)
                                                    }}
                                                    className={`flex w-full items-center gap-3 px-3 py-2 text-sm hover:bg-brk-primary/10 ${
                                                        countryCode === c.code ? 'bg-brk-primary/10 font-semibold text-brk-primary' : 'text-brk-on-surface'
                                                    }`}
                                                >
                                                    <img 
                                                        src={`https://flagcdn.com/w20/${c.flag}.png`} 
                                                        alt={c.iso}
                                                        className="h-3.5 w-auto"
                                                    />
                                                    <span className="flex-1 text-left">{c.iso} ({c.code})</span>
                                                    {countryCode === c.code && (
                                                        <div className="h-1.5 w-1.5 rounded-full bg-brk-primary"></div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <input
                                    {...register("phone", { 
                                        required: "Vui lòng nhập số điện thoại",
                                        minLength: { value: 9, message: "Số điện thoại phải có ít nhất 9 số" },
                                        maxLength: { value: 15, message: "Tối đa 15 số" },
                                        onChange: (e) => {
                                            const value = e.target.value;
                                            if (value.startsWith('0')) {
                                                e.target.value = value.substring(1);
                                            }
                                        }
                                    })}
                                    type="tel"
                                    placeholder={countryCode === "+84" ? "912..." : "SĐT"}
                                    className="max-w-[180px] flex-1 min-w-0 rounded-md border border-brk-outline px-3 py-2 text-sm shadow-sm focus:border-brk-primary focus:outline-none focus:ring-brk-primary"
                                />
                            </div>
                            {errors.phone && (
                                <p className="mt-1 text-xs text-brk-accent font-medium">{errors.phone.message}</p>
                            )}
                            {fieldErrors?.phone && (
                                <p className="mt-1 text-xs text-brk-accent font-medium">{fieldErrors.phone[0]}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-brk-on-surface">
                                Mật khẩu (phải đảm bảo tiêu chuẩn)
                            </label>
                            <div className="relative">
                                <input
                                    {...register("password", {
                                        required: "Vui lòng nhập mật khẩu",
                                        minLength: { value: 8, message: "Mật khẩu phải có ít nhất 8 ký tự" },
                                        validate: (value) => {
                                            const hasUpperCase = /[A-Z]/.test(value);
                                            const hasLowerCase = /[a-z]/.test(value);
                                            const hasNumber = /[0-9]/.test(value);
                                            const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);
                                            
                                            if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
                                                return "Mật khẩu cần: 1 chữ Hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt";
                                            }
                                            return true;
                                        }
                                    })}
                                    type={showPassword ? "text" : "password"}
                                    placeholder="******"
                                    className="mt-1 block w-full rounded-md border border-brk-outline px-3 py-2 pr-10 shadow-sm focus:border-brk-primary focus:outline-none focus:ring-brk-primary text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brk-muted hover:text-brk-on-surface"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                            <p className="mt-1 text-[10px] text-brk-muted italic">
                                Để bảo mật tốt hơn, cần đáp ứng: ≥ 8 ký tự, đủ chữ Hoa, chữ thường, số và ký tự đặc biệt (VD: Brk$9319)
                            </p>
                            {errors.password && (
                                <p className="mt-1 text-xs text-brk-accent font-medium">{errors.password.message}</p>
                            )}
                            {fieldErrors?.password && (
                                <p className="mt-1 text-xs text-brk-accent font-medium">{fieldErrors.password[0]}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex w-full justify-center rounded-lg bg-brk-primary px-4 py-2.5 text-sm font-medium text-brk-on-primary hover:bg-brk-primary-hover focus:outline-none focus:ring-2 focus:ring-brk-primary focus:ring-offset-2 disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "Đăng ký"}
                        </button>
                    </form>
                )}

                {!success && (
                    <p className="text-center text-sm text-brk-muted">
                        Đã có tài khoản?{" "}
                        <Link href={redirectSlug ? `/login?redirect=${redirectSlug}${urlRef ? '&ref=' + urlRef : ''}` : "/login"} className="font-medium text-brk-primary hover:text-brk-primary-hover">
                            Đăng nhập
                        </Link>
                    </p>
                )}
            </div>
        </div>
    )
}

export default function RegisterPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-brk-background p-4">
            <Suspense fallback={
                <div className="w-full max-w-md space-y-8 rounded-xl bg-brk-surface p-8 shadow-lg">
                    <div className="flex justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-brk-primary" />
                    </div>
                </div>
            }>
                <RegisterForm />
            </Suspense>
        </div>
    )
}
