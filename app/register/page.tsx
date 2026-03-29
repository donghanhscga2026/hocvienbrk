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
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null)
    const [showPassword, setShowPassword] = useState(false)
    const [referrerName, setReferrerName] = useState<string | null>(null)
    const [isCountryOpen, setIsCountryOpen] = useState(false)
    const countryRef = useRef<HTMLDivElement>(null)
    
    const router = useRouter()
    const searchParams = useSearchParams()

    const urlRef = searchParams.get('ref')

    const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
        defaultValues: {
            name: "",
            email: "",
            countryCode: "+84",
            phone: "",
            password: "",
            referrerId: urlRef || ""
        }
    })

    const countryCode = watch("countryCode")
    const formReferrerId = watch("referrerId")
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

    return (
        <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-6 sm:p-8 shadow-lg">
            <div className="text-center">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Tạo tài khoản mới</h2>
                <p className="mt-2 text-sm text-gray-600">
                    Chào mừng tham gia Học viện BRK
                </p>
            </div>

            <div className="space-y-4">
                {success ? (
                    <div className="rounded-lg bg-emerald-50 p-6 text-center border border-emerald-100">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 mb-4">
                            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                        </div>
                        <h3 className="text-lg font-bold text-emerald-900 mb-2">Đăng ký thành công!</h3>
                        <p className="text-sm text-emerald-700 leading-relaxed mb-6">
                            {success}
                        </p>
                        <div className="pt-4 border-t border-emerald-100">
                            <Link href="/login" className="text-sm font-semibold text-indigo-600 hover:text-indigo-500">
                                Quay lại trang đăng nhập &rarr;
                            </Link>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Mã giới thiệu (Trân trọng biết ơn Nhân mạch)
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    {...register("referrerId")}
                                    type="number"
                                    placeholder="0"
                                    disabled={!!urlRef}
                                    className={`block w-20 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 ${
                                        urlRef ? 'bg-gray-100 cursor-not-allowed text-gray-500 opacity-75' : ''
                                    }`}
                                />
                                {formReferrerId && referrerName && (
                                    <div className="flex-1 flex items-center gap-1.5 px-3 py-2 rounded-md bg-emerald-50 border border-emerald-100 overflow-hidden">
                                        <span className="text-emerald-600 text-xs whitespace-nowrap hidden min-[400px]:inline">Bởi:</span>
                                        <span className="text-emerald-900 text-xs font-bold truncate">
                                            {referrerName}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {error && (
                            <div className="rounded-md bg-red-50 p-3 text-sm text-red-500 border border-red-100">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Họ và tên
                            </label>
                            <input
                                {...register("name", { required: "Vui lòng nhập họ tên" })}
                                type="text"
                                placeholder="Nguyễn Văn A"
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 text-sm"
                            />
                            {errors.name && (
                                <p className="mt-1 text-xs text-red-500 font-medium">{errors.name.message}</p>
                            )}
                            {fieldErrors?.name && (
                                <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.name[0]}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700">
                                Địa chỉ Email (cần xác minh sau khi đăng ký)
                            </label>
                            <input
                                {...register("email", {
                                    required: "Vui lòng nhập email",
                                    pattern: { value: /^\S+@\S+$/i, message: "Email không hợp lệ" }
                                })}
                                type="email"
                                placeholder="vi-du@gmail.com"
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 text-sm"
                            />
                            {errors.email && (
                                <p className="mt-1 text-xs text-red-500 font-medium">{errors.email.message}</p>
                            )}
                            {fieldErrors?.email && (
                                <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.email[0]}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700">
                                Số điện thoại (dùng zalo/telegram là tốt nhất)
                            </label>
                            <div className="flex gap-2">
                                <div className="relative" ref={countryRef}>
                                    <button
                                        type="button"
                                        onClick={() => setIsCountryOpen(!isCountryOpen)}
                                        className="flex w-36 items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    >
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <img 
                                                src={`https://flagcdn.com/w20/${selectedCountry.flag}.png`} 
                                                alt={selectedCountry.iso}
                                                className="h-3.5 w-auto flex-shrink-0"
                                            />
                                            <span className="truncate">{selectedCountry.iso} ({selectedCountry.code})</span>
                                        </div>
                                        <ChevronDown className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${isCountryOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {isCountryOpen && (
                                        <div className="absolute z-50 mt-1 max-h-60 w-48 overflow-auto rounded-md bg-white py-1 shadow-xl border border-gray-100 ring-1 ring-black ring-opacity-5 focus:outline-none">
                                            {COUNTRY_CODES.map((c) => (
                                                <button
                                                    key={c.code}
                                                    type="button"
                                                    onClick={() => {
                                                        setValue("countryCode", c.code)
                                                        setIsCountryOpen(false)
                                                    }}
                                                    className={`flex w-full items-center gap-3 px-3 py-2 text-sm hover:bg-indigo-50 ${
                                                        countryCode === c.code ? 'bg-indigo-50 font-semibold text-indigo-700' : 'text-gray-700'
                                                    }`}
                                                >
                                                    <img 
                                                        src={`https://flagcdn.com/w20/${c.flag}.png`} 
                                                        alt={c.iso}
                                                        className="h-3.5 w-auto"
                                                    />
                                                    <span className="flex-1 text-left">{c.iso} ({c.code})</span>
                                                    {countryCode === c.code && (
                                                        <div className="h-1.5 w-1.5 rounded-full bg-indigo-600"></div>
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
                                    className="max-w-[180px] flex-1 min-w-0 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                                />
                            </div>
                            {errors.phone && (
                                <p className="mt-1 text-xs text-red-500 font-medium">{errors.phone.message}</p>
                            )}
                            {fieldErrors?.phone && (
                                <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.phone[0]}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
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
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 pr-10 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                            <p className="mt-1 text-[10px] text-gray-500 italic">
                                Để bảo mật tốt hơn, cần đáp ứng: ≥ 8 ký tự, đủ chữ Hoa, chữ thường, số và ký tự đặc biệt (VD: Brk$9319)
                            </p>
                            {errors.password && (
                                <p className="mt-1 text-xs text-red-500 font-medium">{errors.password.message}</p>
                            )}
                            {fieldErrors?.password && (
                                <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.password[0]}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex w-full justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "Đăng ký"}
                        </button>
                    </form>
                )}

                {!success && (
                    <p className="text-center text-sm text-gray-600">
                        Đã có tài khoản?{" "}
                        <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
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
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
            <Suspense fallback={
                <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-lg">
                    <div className="flex justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                    </div>
                </div>
            }>
                <RegisterForm />
            </Suspense>
        </div>
    )
}
