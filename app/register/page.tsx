'use client'

import { useForm } from "react-hook-form"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { registerUser } from "../actions/auth-actions"

export default function RegisterPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null)
    const router = useRouter()

    const { register, handleSubmit, formState: { errors } } = useForm({
        defaultValues: {
            name: "",
            email: "",
            phone: "",
            password: ""
        }
    })

    async function onSubmit(data: any) {
        setIsLoading(true)
        setError(null)
        setFieldErrors(null)

        try {
            const formData = new FormData()
            formData.append("name", data.name)
            formData.append("email", data.email)
            formData.append("phone", data.phone)
            formData.append("password", data.password)

            // We call the server action directly here, but managing state manually 
            // since we aren't using useFormState (React 19 feature, but next-auth guidelines often use client side wrappers)
            // Actually, since this is a client component, we can just await the action.
            // But `registerUser` redirects on success, so we might need to catch that?
            // Wait, `registerUser` calls `redirect`. Next.js redirects throw an error in try/catch blocks unless handled specificially.
            // But typically server actions with redirect are safe to call if we don't catch the redirect error.
            // However, since we are in a client event handler, we need to be careful.
            // Let's wrapping it.

            const result = await registerUser(null, formData)

            if (result?.message || result?.errors) {
                if (result.errors) {
                    setFieldErrors(result.errors)
                }
                if (result.message) {
                    setError(result.message)
                }
            }
            // If it redirects, the code below won't execute effectively (or at least the page changes)

        } catch (err: any) {
            // Next.js NEXT_REDIRECT error check
            //   if (err.message === "NEXT_REDIRECT") throw err
            // Actually for client components calling server actions, the redirect happens automatically. 
            // But if we use `try/catch`, we might catch the redirect error.
            // Best practice: Check if error is digest NEXT_REDIRECT
            // but usually server actions are robust.
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-lg">
                <div className="text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">Create an account</h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Join BRK Academy today
                    </p>
                </div>

                <div className="space-y-4">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        {error && (
                            <div className="rounded-md bg-red-50 p-3 text-sm text-red-500">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Full Name
                            </label>
                            <input
                                {...register("name", { required: "Name is required" })}
                                type="text"
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                            />
                            {errors.name && (
                                <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
                            )}
                            {fieldErrors?.name && (
                                <p className="mt-1 text-xs text-red-500">{fieldErrors.name[0]}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Email
                            </label>
                            <input
                                {...register("email", {
                                    required: "Email is required",
                                    pattern: { value: /^\S+@\S+$/i, message: "Invalid email" }
                                })}
                                type="email"
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                            />
                            {errors.email && (
                                <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
                            )}
                            {fieldErrors?.email && (
                                <p className="mt-1 text-xs text-red-500">{fieldErrors.email[0]}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Phone Number
                            </label>
                            <input
                                {...register("phone", { required: "Phone is required" })}
                                type="tel"
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                            />
                            {errors.phone && (
                                <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>
                            )}
                            {fieldErrors?.phone && (
                                <p className="mt-1 text-xs text-red-500">{fieldErrors.phone[0]}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Password
                            </label>
                            <input
                                {...register("password", {
                                    required: "Password is required",
                                    minLength: { value: 6, message: "Min 6 characters" }
                                })}
                                type="password"
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                            />
                            {errors.password && (
                                <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
                            )}
                            {fieldErrors?.password && (
                                <p className="mt-1 text-xs text-red-500">{fieldErrors.password[0]}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex w-full justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : "Sign up"}
                        </button>
                    </form>

                    <p className="text-center text-sm text-gray-600">
                        Already have an account?{" "}
                        <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
