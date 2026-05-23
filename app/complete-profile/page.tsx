'use client'

import { useForm } from "react-hook-form"
import { useState, useEffect, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { Loader2, ChevronDown, CheckCircle2, User, Phone, Hash } from "lucide-react"
import { COUNTRY_CODES } from "@/lib/country-codes"
import { completeProfileAction } from "../actions/auth-actions"

function CompleteProfileContent() {
    const { data: session, update } = useSession()
    const router = useRouter()
    const searchParams = useSearchParams()
    const redirectSlug = searchParams.get('redirect')

    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isCountryOpen, setIsCountryOpen] = useState(false)
    const [selectedIso, setSelectedIso] = useState("VN")
    const [countrySearch, setCountrySearch] = useState("")
    const countryRef = useRef<HTMLDivElement>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)

    const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
        defaultValues: {
            name: session?.user?.name || "",
            countryCode: "+84",
            phone: "",
        }
    })

    const countryCode = watch("countryCode")
    const selectedCountry = COUNTRY_CODES.find(c => c.iso === selectedIso) || COUNTRY_CODES[0]

    // Tự động kiểm tra: Nếu đã có SĐT (trong session hoặc DB) thì về Home luôn
    useEffect(() => {
        const checkExistingProfile = async () => {
            // Trường hợp 1: Đã có SĐT ngay trong session
            if ((session?.user as any)?.phone) {
                console.log("✨ Đã có SĐT trong session, chuyển hướng về trang chủ...")
                router.push(redirectSlug ? `/${redirectSlug}` : '/')
                return
            }

            // Trường hợp 2: Chưa có trong session nhưng có trong DB (tài khoản cũ)
            if (session?.user?.id) {
                try {
                    const res = await fetch(`/api/user/${session.user.id}`)
                    const userData = await res.json()
                    
                    if (userData?.phone) {
                        console.log("✨ Phát hiện hồ sơ đã hoàn tất trong DB, đang đồng bộ session...")
                        await update({ phone: userData.phone })
                        router.push(redirectSlug ? `/${redirectSlug}` : '/')
                        router.refresh()
                    }
                } catch (e) {
                    console.error("Lỗi kiểm tra hồ sơ cũ:", e)
                }
            }
        }
        
        if (session) {
            checkExistingProfile()
        }
    }, [session, update, router, redirectSlug])

    // Sync name if session loads later
    useEffect(() => {
        if (session?.user?.name) {
            setValue("name", session.user.name)
        }
    }, [session, setValue])

    // Focus search input
    useEffect(() => {
        if (isCountryOpen && searchInputRef.current) {
            setTimeout(() => searchInputRef.current?.focus(), 100)
        } else {
            setCountrySearch("")
        }
    }, [isCountryOpen])

    // Handle click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (countryRef.current && !countryRef.current.contains(event.target as Node)) {
                setIsCountryOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const filteredCountries = COUNTRY_CODES.filter(c => 
        c.name.toLowerCase().includes(countrySearch.toLowerCase()) || 
        c.code.includes(countrySearch) || 
        c.iso.toLowerCase().includes(countrySearch.toLowerCase())
    )

    async function onSubmit(data: any) {
        setIsLoading(true)
        setError(null)

        try {
            const result = await completeProfileAction(data)
            
            if (result.success) {
                // Force session update to include the new phone number
                await update({ phone: data.countryCode + data.phone.replace(/^0/, '') })
                router.push(redirectSlug ? `/${redirectSlug}` : '/')
                router.refresh()
            } else {
                setError(result.message)
                setIsLoading(false)
            }
        } catch (err) {
            setError("Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.")
            setIsLoading(false)
        }
    }

    if (!session) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-brk-background">
                <Loader2 className="h-8 w-8 animate-spin text-brk-primary" />
            </div>
        )
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brk-primary/5 via-brk-background to-brk-surface p-4">
            <div className="w-full max-w-md space-y-6 rounded-2xl bg-brk-surface p-6 sm:p-10 shadow-2xl border border-brk-outline/10">
                <div className="text-center space-y-2">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-brk-primary/10 text-brk-primary mb-2">
                        <User className="h-8 w-8" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-brk-on-surface">
                        Hoàn tất hồ sơ
                    </h2>
                    <p className="text-sm text-brk-muted">
                        Vui lòng bổ sung thông tin để bắt đầu trải nghiệm Học viện BRK
                    </p>
                </div>

                {error && (
                    <div className="rounded-lg bg-brk-accent/10 p-3 text-sm text-brk-accent border border-brk-accent/20">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    <div className="space-y-4">
                        {/* ID Hiển thị (Chỉ đọc) */}
                        <div>
                            <label className="block text-xs font-medium text-brk-muted mb-1 ml-1">
                                ID Học viên
                            </label>
                            <div className="flex items-center gap-3 px-3 py-2 bg-brk-background/50 rounded-md border border-brk-outline/30 text-brk-muted text-sm font-mono">
                                <Hash className="h-4 w-4" />
                                #{session.user.id}
                            </div>
                        </div>

                        {/* Họ tên */}
                        <div className="flex flex-col gap-1.5">
                            <label className="block text-sm font-medium text-brk-on-surface ml-1">
                                Họ và tên
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brk-muted">
                                    <User className="h-4 w-4" />
                                </div>
                                <input
                                    {...register("name", { required: "Vui lòng nhập họ tên" })}
                                    type="text"
                                    placeholder="Nguyễn Văn A"
                                    className="block w-full rounded-md border border-brk-outline bg-brk-background pl-10 px-3 py-2.5 shadow-sm focus:border-brk-primary focus:outline-none focus:ring-1 focus:ring-brk-primary text-sm"
                                />
                            </div>
                            {errors.name && (
                                <p className="text-xs text-brk-accent font-medium mt-1">{errors.name.message as string}</p>
                            )}
                        </div>

                        {/* Quốc gia */}
                        <div className="flex flex-col gap-1.5 pt-1">
                            <label className="block text-sm font-medium text-brk-on-surface ml-1">
                                Quốc gia / Mã vùng
                            </label>
                            <div className="relative" ref={countryRef}>
                                <button
                                    type="button"
                                    onClick={() => setIsCountryOpen(!isCountryOpen)}
                                    className="flex w-full items-center justify-between rounded-md border border-brk-outline bg-brk-background px-3 py-2.5 text-sm shadow-sm focus:border-brk-primary focus:outline-none focus:ring-1 focus:ring-brk-primary"
                                >
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <img 
                                            src={`https://flagcdn.com/w20/${selectedCountry.flag}.png`} 
                                            alt={selectedCountry.iso}
                                            className="h-3.5 w-auto flex-shrink-0"
                                        />
                                        <span className="truncate">{selectedCountry.name} ({selectedCountry.code})</span>
                                    </div>
                                    <ChevronDown className={`h-4 w-4 flex-shrink-0 text-brk-muted transition-transform ${isCountryOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isCountryOpen && (
                                    <div className="absolute z-50 mt-1 max-h-60 w-full overflow-hidden rounded-md bg-brk-surface shadow-xl border border-brk-outline/30 flex flex-col">
                                        <div className="p-2 border-b border-brk-outline/20 sticky top-0 bg-brk-surface z-10">
                                            <input
                                                ref={searchInputRef}
                                                type="text"
                                                placeholder="Tìm tên, mã vùng..."
                                                value={countrySearch}
                                                onChange={(e) => setCountrySearch(e.target.value)}
                                                className="w-full px-3 py-1.5 text-xs rounded border border-brk-outline bg-brk-background focus:outline-none focus:ring-1 focus:ring-brk-primary"
                                            />
                                        </div>
                                        <div className="overflow-auto max-h-48 py-1">
                                            {filteredCountries.length > 0 ? (
                                                filteredCountries.map((c) => (
                                                    <button
                                                        key={c.iso}
                                                        type="button"
                                                        onClick={() => {
                                                            setValue("countryCode", c.code)
                                                            setSelectedIso(c.iso)
                                                            setIsCountryOpen(false)
                                                        }}
                                                        className={`flex w-full items-center gap-3 px-3 py-2 text-sm hover:bg-brk-primary/10 ${
                                                            selectedIso === c.iso ? 'bg-brk-primary/10 font-semibold text-brk-primary' : 'text-brk-on-surface'
                                                        }`}
                                                    >
                                                        <img 
                                                            src={`https://flagcdn.com/w20/${c.flag}.png`} 
                                                            alt={c.iso}
                                                            className="h-3.5 w-auto"
                                                        />
                                                        <span className="flex-1 text-left truncate">{c.name} ({c.code})</span>
                                                        {selectedIso === c.iso && (
                                                            <div className="h-1.5 w-1.5 rounded-full bg-brk-primary"></div>
                                                        )}
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="px-3 py-4 text-center text-xs text-brk-muted">
                                                    Không tìm thấy kết quả
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Số điện thoại */}
                        <div className="flex flex-col gap-1.5 pt-1">
                            <label className="block text-sm font-medium text-brk-on-surface ml-1">
                                Số điện thoại
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brk-muted">
                                    <Phone className="h-4 w-4" />
                                </div>
                                <input
                                    {...register("phone", { 
                                        required: "Vui lòng nhập số điện thoại",
                                        minLength: { value: 9, message: "Số điện thoại phải có ít nhất 9 số" },
                                        maxLength: { value: 15, message: "Tối đa 15 số" }
                                    })}
                                    type="tel"
                                    placeholder={countryCode === "+84" ? "912..." : "Nhập số điện thoại"}
                                    className="block w-full rounded-md border border-brk-outline bg-brk-background pl-10 px-3 py-2.5 shadow-sm focus:border-brk-primary focus:outline-none focus:ring-1 focus:ring-brk-primary text-sm"
                                />
                            </div>
                            {errors.phone && (
                                <p className="text-xs text-brk-accent font-medium mt-1">{errors.phone.message as string}</p>
                            )}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brk-primary px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-brk-primary-hover focus:outline-none focus:ring-2 focus:ring-brk-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <CheckCircle2 className="h-4 w-4" />
                        )}
                        <span>Hoàn tất đăng ký</span>
                    </button>
                </form>

                <p className="text-center text-xs text-brk-muted mt-6 italic">
                    Bằng cách nhấn hoàn tất, bạn đồng ý với điều khoản sử dụng của Học viện BRK.
                </p>
            </div>
        </div>
    )
}

export default function CompleteProfilePage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center bg-brk-background">
                <Loader2 className="h-8 w-8 animate-spin text-brk-primary" />
            </div>
        }>
            <CompleteProfileContent />
        </Suspense>
    )
}
