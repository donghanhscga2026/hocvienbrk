'use client'

import { signIn } from "next-auth/react"
import { useForm } from "react-hook-form"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showPassword, setShowPassword] = useState(false)
    const router = useRouter()

    const { register, handleSubmit, formState: { errors } } = useForm({
        defaultValues: {
            identifier: "",
            password: ""
        }
    })

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
                setError("Invalid credentials. Please try again.")
            } else {
                router.push("/")
                router.refresh()
            }
        } catch (err) {
            setError("An unexpected error occurred.")
        } finally {
            setIsLoading(false)
        }
    }

    const handleGoogleSignIn = () => {
        setIsLoading(true)
        signIn("google", { callbackUrl: "/" })
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                {/* Logo */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-black text-white tracking-tight">HỌC VIỆN BRK</h1>
                    <p className="text-zinc-400 text-sm mt-1">Đăng nhập để tiếp tục hành trình</p>
                </div>

                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 space-y-5 shadow-2xl">
                    {/* Google */}
                    <button
                        onClick={handleGoogleSignIn}
                        disabled={isLoading}
                        className="flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-600 bg-white/5 px-4 py-3 text-sm font-medium text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                        <svg className="h-4 w-4 shrink-0" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z" /></svg>
                        Đăng nhập bằng Google
                    </button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-700" /></div>
                        <div className="relative flex justify-center text-xs"><span className="bg-transparent px-2 text-zinc-500">hoặc dùng tài khoản</span></div>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        {error && (
                            <div className="rounded-lg bg-red-900/30 border border-red-700/50 p-3 text-sm text-red-400">{error}</div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Email / SĐT / Mã học viên</label>
                            <input
                                {...register("identifier", { required: "Vui lòng nhập thông tin" })}
                                type="text"
                                autoComplete="username"
                                className="w-full rounded-xl border border-zinc-700 bg-white/5 px-4 py-3 text-white text-sm placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                placeholder="Nhập email hoặc mã học viên"
                            />
                            {errors.identifier && <p className="mt-1 text-xs text-red-400">{errors.identifier.message}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Mật khẩu</label>
                            <div className="relative">
                                <input
                                    {...register("password", { required: "Vui lòng nhập mật khẩu" })}
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="current-password"
                                    className="w-full rounded-xl border border-zinc-700 bg-white/5 px-4 py-3 pr-10 text-white text-sm placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                            {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 px-4 py-3 text-sm font-bold text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Đăng nhập'}
                        </button>
                    </form>

                    <p className="text-center text-sm text-zinc-500">
                        Chưa có tài khoản?{' '}
                        <Link href="/register" className="font-semibold text-orange-400 hover:text-orange-300">Đăng ký ngay</Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
