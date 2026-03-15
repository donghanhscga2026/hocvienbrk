This file is a merged representation of a subset of the codebase, containing specifically included files, combined into a single document by Repomix.
The content has been processed where comments have been removed, empty lines have been removed.

# File Summary

## Purpose
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: components/**/*, app/**/page.tsx, app/**/layout.tsx, app/**/*.tsx
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Code comments have been removed from supported file types
- Empty lines have been removed from all files
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
app/account-settings/page.tsx
app/admin/courses/[id]/page.tsx
app/admin/courses/page.tsx
app/admin/layout.tsx
app/admin/payments/page.tsx
app/admin/posts/page.tsx
app/admin/reserved-ids/add-form.tsx
app/admin/reserved-ids/change-id-form.tsx
app/admin/reserved-ids/page.tsx
app/admin/roadmap/page.tsx
app/admin/students/[id]/page.tsx
app/admin/students/page.tsx
app/courses/[id]/learn/error.tsx
app/courses/[id]/learn/page.tsx
app/layout.tsx
app/login/page.tsx
app/page.tsx
app/register/page.tsx
components/admin/roadmap/CustomNodes.tsx
components/course/AssignmentForm.tsx
components/course/ChatSection.tsx
components/course/CourseCard.tsx
components/course/CoursePlayer.tsx
components/course/LessonSidebar.tsx
components/course/PaymentModal.tsx
components/course/StartDateModal.tsx
components/course/VideoPlayer.tsx
components/home/CommunityBoard.tsx
components/home/CourseSection.tsx
components/home/MessageCard.tsx
components/home/PostCard.tsx
components/home/PostDetailModal.tsx
components/home/RealityMap.tsx
components/home/Zero2HeroSurvey.tsx
components/ImageViewer.tsx
components/layout/Header.tsx
components/payment/UploadProofModal.tsx
components/ui/button.tsx
components/ui/checkbox.tsx
components/ui/dialog.tsx
components/ui/input.tsx
components/ui/label.tsx
components/ui/textarea.tsx
```

# Files

## File: app/account-settings/page.tsx
```typescript
'use client'
import { useState, useEffect } from 'react'
import { getUserWithAccounts, updateUserProfile, changePassword } from '@/app/actions/account-actions'
import { Camera, User, Phone, Mail, Key, Check, AlertCircle, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
interface UserData {
    id: number
    name: string | null
    email: string | null
    image: string | null
    phone: string | null
    accounts: { provider: string; providerAccountId: string }[]
}
export default function AccountSettingsPage() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [user, setUser] = useState<UserData | null>(null)
    const [accounts, setAccounts] = useState<UserData['accounts']>([])
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [avatarUrl, setAvatarUrl] = useState('')
    // Password states
    const [showPasswordForm, setShowPasswordForm] = useState(false)
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    useEffect(() => {
        async function fetchUser() {
            setLoading(true)
            const userData = await getUserWithAccounts()
            if (userData) {
                setUser(userData as UserData)
                setAccounts(userData.accounts || [])
                setName(userData.name || '')
                setPhone(userData.phone || '')
                setAvatarUrl(userData.image || '')
            }
            setLoading(false)
        }
        fetchUser()
    }, [])
    async function handleUpdateProfile(e: React.FormEvent) {
        e.preventDefault()
        setSaving(true)
        setMessage(null)
        const result = await updateUserProfile({
            name,
            phone,
            image: avatarUrl
        })
        setMessage({
            type: result.success ? 'success' : 'error',
            text: result.message
        })
        setSaving(false)
    }
    function resizeImage(base64: string, maxWidth = 50, maxHeight = 50): Promise<string> {
        return new Promise((resolve, reject) => {
            const img = new Image()
            img.onload = () => {
                const canvas = document.createElement('canvas')
                canvas.width = maxWidth
                canvas.height = maxHeight
                const ctx = canvas.getContext('2d')
                if (!ctx) {
                    reject(new Error('Cannot get canvas context'))
                    return
                }
                ctx.drawImage(img, 0, 0, maxWidth, maxHeight)
                const resized = canvas.toDataURL('image/jpeg', 0.7)
                resolve(resized)
            }
            img.onerror = () => {
                reject(new Error('Cannot load image'))
            }
            img.src = base64
        })
    }
    async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.size > 5 * 1024 * 1024) {
            setMessage({ type: 'error', text: 'Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 5MB' })
            return
        }
        if (!file.type.startsWith('image/')) {
            setMessage({ type: 'error', text: 'Vui lòng chọn file ảnh' })
            return
        }
        const reader = new FileReader()
        reader.onload = async (event) => {
            try {
                const result = event.target?.result as string
                const resized = await resizeImage(result, 50, 50)
                setAvatarUrl(resized)
                setMessage(null)
            } catch (error) {
                setMessage({ type: 'error', text: 'Lỗi khi xử lý ảnh' })
            }
        }
        reader.onerror = () => {
            setMessage({ type: 'error', text: 'Lỗi khi đọc file' })
        }
        reader.readAsDataURL(file)
    }
    async function handleUrlAvatarChange(e: React.FocusEvent<HTMLInputElement>) {
        const url = e.target.value.trim()
        if (!url) return
        if (url.startsWith('data:')) return
        setMessage({ type: 'success', text: 'Đang tải ảnh...' })
        try {
            const response = await fetch(url)
            if (!response.ok) throw new Error('Cannot download image')
            const blob = await response.blob()
            if (!blob.type.startsWith('image/')) {
                setMessage({ type: 'error', text: 'URL không phải là ảnh hợp lệ' })
                return
            }
            const reader = new FileReader()
            reader.onload = async (event) => {
                try {
                    const result = event.target?.result as string
                    const resized = await resizeImage(result, 50, 50)
                    setAvatarUrl(resized)
                    setMessage({ type: 'success', text: 'Ảnh đã được tải và nén!' })
                } catch (error) {
                    setMessage({ type: 'error', text: 'Lỗi khi xử lý ảnh' })
                }
            }
            reader.onerror = () => {
                setMessage({ type: 'error', text: 'Lỗi khi đọc ảnh' })
            }
            reader.readAsDataURL(blob)
        } catch (error) {
            setMessage({ type: 'error', text: 'Không thể tải ảnh từ URL này' })
        }
    }
    async function handleChangePassword(e: React.FormEvent) {
        e.preventDefault()
        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'Mật khẩu mới không khớp' })
            return
        }
        if (newPassword.length < 6) {
            setMessage({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 6 ký tự' })
            return
        }
        setSaving(true)
        setMessage(null)
        const result = await changePassword(currentPassword, newPassword)
        setMessage({
            type: result.success ? 'success' : 'error',
            text: result.message
        })
        if (result.success) {
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
            setShowPasswordForm(false)
        }
        setSaving(false)
    }
    const hasPassword = accounts.some(a => a.provider === 'credentials')
    const hasGoogle = accounts.some(a => a.provider === 'google')
    const userInitials = user?.name
        ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
        : '?'
    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-yellow-400" />
            </div>
        )
    }
    if (!user) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <p className="text-white">Vui lòng đăng nhập để truy cập</p>
                </div>
            </div>
        )
    }
    return (
        <div className="min-h-screen bg-zinc-950 py-12 px-4">
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/" className="shrink-0 p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <h1 className="text-2xl font-bold text-white">Cài đặt tài khoản</h1>
                </div>
                {message && (
                    <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
                        message.type === 'success'
                            ? 'bg-emerald-900/30 border border-emerald-700 text-emerald-400'
                            : 'bg-red-900/30 border border-red-700 text-red-400'
                    }`}>
                        {message.type === 'success' ? <Check className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                        {message.text}
                    </div>
                )}
                {}
                <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 mb-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Ảnh đại diện</h2>
                    <div className="flex items-center gap-6">
                        <div className="relative">
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt="Avatar"
                                    className="w-24 h-24 rounded-full object-cover border-4 border-zinc-700"
                                />
                            ) : (
                                <div className="w-24 h-24 rounded-full bg-yellow-400 flex items-center justify-center text-3xl font-black text-black border-4 border-zinc-700">
                                    {userInitials}
                                </div>
                            )}
                            <label className="absolute bottom-0 right-0 bg-yellow-400 p-2 rounded-full cursor-pointer hover:bg-yellow-300 transition-colors">
                                <Camera className="h-4 w-4 text-black" />
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarChange}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                            </label>
                        </div>
                        <div className="flex-1">
                            <p className="text-sm text-zinc-400 mb-2">Dán link ảnh (Drive, PostImg, ...):</p>
                            <input
                                type="text"
                                value={avatarUrl}
                                onChange={(e) => setAvatarUrl(e.target.value)}
                                onBlur={handleUrlAvatarChange}
                                placeholder="https://drive.google.com/... hoặc https://postimg.cc/..."
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                            />
                            <p className="text-xs text-zinc-500 mt-2">Hệ thống sẽ tự động tải và nén ảnh về 50x50px</p>
                        </div>
                    </div>
                </div>
                {}
                <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 mb-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Thông tin tài khoản</h2>
                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                        <div>
                            <label className="block text-sm text-zinc-400 mb-2">
                                <User className="inline h-4 w-4 mr-2" />
                                Họ và tên
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-zinc-400 mb-2">
                                <Mail className="inline h-4 w-4 mr-2" />
                                Email
                            </label>
                            <input
                                type="email"
                                value={user.email || ''}
                                disabled
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-500 cursor-not-allowed"
                            />
                            <p className="text-xs text-zinc-500 mt-1">Email không thể thay đổi</p>
                        </div>
                        <div>
                            <label className="block text-sm text-zinc-400 mb-2">
                                <Phone className="inline h-4 w-4 mr-2" />
                                Số điện thoại
                            </label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="Nhập số điện thoại"
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                            Lưu thay đổi
                        </button>
                    </form>
                </div>
                {/* Connected Accounts */}
                <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 mb-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Tài khoản liên kết</h2>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                                    <span className="text-white font-bold text-sm">G</span>
                                </div>
                                <div>
                                    <p className="text-white font-medium">Google</p>
                                    <p className="text-xs text-zinc-500">{hasGoogle ? 'Đã liên kết' : 'Chưa liên kết'}</p>
                                </div>
                            </div>
                            {hasGoogle && (
                                <span className="text-emerald-400 text-sm">✓</span>
                            )}
                        </div>
                        <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-800 rounded-full flex items-center justify-center">
                                    <span className="text-white font-bold text-sm">f</span>
                                </div>
                                <div>
                                    <p className="text-white font-medium">Facebook</p>
                                    <p className="text-xs text-zinc-500">Chưa liên kết</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                {}
                {hasPassword && (
                    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
                        <h2 className="text-lg font-semibold text-white mb-4">Đổi mật khẩu</h2>
                        {!showPasswordForm ? (
                            <button
                                onClick={() => setShowPasswordForm(true)}
                                className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300 transition-colors"
                            >
                                <Key className="h-4 w-4" />
                                Đổi mật khẩu
                            </button>
                        ) : (
                            <form onSubmit={handleChangePassword} className="space-y-4">
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-2">Mật khẩu hiện tại</label>
                                    <input
                                        type="password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        required
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-2">Mật khẩu mới</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-2">Xác nhận mật khẩu mới</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowPasswordForm(false)
                                            setCurrentPassword('')
                                            setNewPassword('')
                                            setConfirmPassword('')
                                            setMessage(null)
                                        }}
                                        className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white font-medium py-3 rounded-xl transition-colors"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Xác nhận'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
```

## File: app/admin/reserved-ids/add-form.tsx
```typescript
'use client'
import { useActionState } from "react"
import { addReservedIdAction } from "@/app/actions/admin-actions"
const initialState = {
    message: '',
}
export function AddReservedIdForm() {
    const [state, formAction, isPending] = useActionState(addReservedIdAction, initialState)
    return (
        <div className="bg-gray-50 border p-6 rounded-lg shadow-sm">
            <form action={formAction} className="flex flex-col gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ID cần giữ</label>
                    <input name="id" type="number" required placeholder="VD: 6868" className="border p-2 rounded w-full" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú (Tùy chọn)</label>
                    <input name="note" type="text" placeholder="VD: Để dành cho VIP..." className="border p-2 rounded w-full" />
                </div>
                <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium mt-2">
                    ➕ Thêm vào danh sách
                </button>
            </form>
            {state?.message && (
                <div className={`mt-4 p-3 rounded text-sm ${state.message.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                    {state.message}
                </div>
            )}
            <div className="mt-4 text-sm text-gray-500 bg-white p-3 rounded border">
                <strong>Lưu ý:</strong> Khi bạn thêm một số vào đây, các user đăng ký mới sẽ <u>tự động bỏ qua</u> số này. Bạn có thể dùng chức năng &quot;Cấp số đẹp&quot; ở trên để gán số này cho user cụ thể sau.
            </div>
        </div>
    )
}
```

## File: app/admin/reserved-ids/change-id-form.tsx
```typescript
'use client'
import { useActionState } from "react"
import { changeUserIdAction } from "@/app/actions/admin-actions"
const initialState = {
    message: '',
}
export function ChangeUserIdForm() {
    const [state, formAction, isPending] = useActionState(changeUserIdAction, initialState)
    return (
        <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg shadow-sm">
            <p className="text-sm text-blue-700 mb-4">
                Chức năng này cho phép đổi ID của học viên hiện tại sang một ID mới (thường là số đẹp).
                <br />Hệ thống sẽ tự động cập nhật mọi dữ liệu liên quan (lịch sử, giới thiệu...).
            </p>
            <form action={formAction} className="flex gap-4 items-end flex-wrap">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ID Hiện tại (Cũ)</label>
                    <input name="currentId" type="number" required placeholder="VD: 123" className="border p-2 rounded w-40" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ID Mới (Số đẹp)</label>
                    <input name="newId" type="number" required placeholder="VD: 8888" className="border p-2 rounded w-40 font-bold text-blue-600" />
                </div>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition">
                    🚀 Thực hiện Đổi ID
                </button>
            </form>
            {state?.message && (
                <div className={`mt-4 p-3 rounded text-sm ${state.message.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                    {state.message}
                </div>
            )}
        </div>
    )
}
```

## File: app/login/page.tsx
```typescript
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
                {}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-black text-white tracking-tight">HỌC VIỆN BRK</h1>
                    <p className="text-zinc-400 text-sm mt-1">Đăng nhập để tiếp tục hành trình</p>
                </div>
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 space-y-5 shadow-2xl">
                    {}
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
```

## File: app/register/page.tsx
```typescript
'use client'
import { useForm } from "react-hook-form"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, Eye, EyeOff } from "lucide-react"
import { registerUser } from "../actions/auth-actions"
export default function RegisterPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null)
    const [showPassword, setShowPassword] = useState(false)
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
            const result = await registerUser(null, formData)
            if (result?.message || result?.errors) {
                if (result.errors) {
                    setFieldErrors(result.errors)
                }
                if (result.message) {
                    setError(result.message)
                }
            }
        } catch (err: any) {
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
                            <div className="relative">
                                <input
                                    {...register("password", {
                                        required: "Password is required",
                                        minLength: { value: 6, message: "Min 6 characters" }
                                    })}
                                    type={showPassword ? "text" : "password"}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 pr-10 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
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
```

## File: components/ui/button.tsx
```typescript
import * as React from "react"
import { cn } from "@/lib/utils"
export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
    size?: 'default' | 'sm' | 'lg' | 'icon'
}
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'default', size = 'default', ...props }, ref) => {
        const variants = {
            default: "bg-primary text-primary-foreground hover:bg-primary/90",
            destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
            outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
            secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
            ghost: "hover:bg-accent hover:text-accent-foreground",
            link: "text-primary underline-offset-4 hover:underline",
        }
        const sizes = {
            default: "h-10 px-4 py-2",
            sm: "h-9 rounded-md px-3",
            lg: "h-11 rounded-md px-8",
            icon: "h-10 w-10",
        }
        return (
            <button
                className={cn(
                    "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                    variants[variant],
                    sizes[size],
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"
export { Button }
```

## File: components/ui/checkbox.tsx
```typescript
import * as React from "react"
import { cn } from "@/lib/utils"
export interface CheckboxProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    onCheckedChange?: (checked: boolean) => void
}
const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
    ({ className, onCheckedChange, checked, ...props }, ref) => {
        return (
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onCheckedChange?.(e.target.checked)}
                className={cn(
                    "h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer",
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Checkbox.displayName = "Checkbox"
export { Checkbox }
```

## File: components/ui/dialog.tsx
```typescript
'use client'
import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"
interface DialogProps {
    open?: boolean
    children: React.ReactNode
}
export function Dialog({ open, children }: DialogProps) {
    if (!open) return null
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
            {children}
        </div>
    )
}
export function DialogContent({ className, children }: { className?: string, children: React.ReactNode }) {
    return (
        <div className={cn("bg-zinc-900 border border-zinc-800 rounded-xl max-w-lg w-full p-6 relative shadow-2xl animate-in zoom-in-95 duration-200", className)}>
            {children}
        </div>
    )
}
export function DialogHeader({ className, children }: { className?: string, children: React.ReactNode }) {
    return <div className={cn("space-y-1.5 text-center sm:text-left", className)}>{children}</div>
}
export function DialogTitle({ className, children }: { className?: string, children: React.ReactNode }) {
    return <h2 className={cn("text-lg font-semibold leading-none tracking-tight", className)}>{children}</h2>
}
export function DialogDescription({ className, children }: { className?: string, children: React.ReactNode }) {
    return <p className={cn("text-sm text-zinc-400", className)}>{children}</p>
}
export function DialogFooter({ className, children }: { className?: string, children: React.ReactNode }) {
    return <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}>{children}</div>
}
```

## File: components/ui/input.tsx
```typescript
import * as React from "react"
import { cn } from "@/lib/utils"
export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> { }
const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Input.displayName = "Input"
export { Input }
```

## File: components/ui/label.tsx
```typescript
import * as React from "react"
import { cn } from "@/lib/utils"
const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
    ({ className, ...props }, ref) => (
        <label
            ref={ref}
            className={cn(
                "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
                className
            )}
            {...props}
        />
    )
)
Label.displayName = "Label"
export { Label }
```

## File: components/ui/textarea.tsx
```typescript
import * as React from "react"
import { cn } from "@/lib/utils"
export interface TextareaProps
    extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { }
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, ...props }, ref) => {
        return (
            <textarea
                className={cn(
                    "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Textarea.displayName = "Textarea"
export { Textarea }
```

## File: app/admin/courses/[id]/page.tsx
```typescript
'use client'
import { useState, useEffect, use } from 'react'
import { updateCourseAction, updateLessonAction } from '@/app/actions/admin-actions'
import { ArrowLeft, Save, Loader2, CheckCircle2, AlertCircle, Play, Edit2, X, List, Settings } from 'lucide-react'
import Link from 'next/link'
function LessonEditModal({ lesson, onClose, onSave }: { lesson: any, onClose: () => void, onSave: (data: any) => Promise<void> }) {
    const [title, setTitle] = useState(lesson.title || '')
    const [videoUrl, setVideoUrl] = useState(lesson.videoUrl || '')
    const [order, setOrder] = useState(lesson.order || 0)
    const [saving, setSaving] = useState(false)
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        await onSave({ id: lesson.id, title, videoUrl, order })
        setSaving(false)
        onClose()
    }
    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="bg-gray-900 p-6 text-white flex justify-between items-center">
                    <h3 className="font-black text-sm uppercase tracking-widest">Sửa bài học #{lesson.order}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X className="w-5 h-5 text-yellow-400" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Tiêu đề bài học</label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" required />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Link Video (YouTube)</label>
                        <input type="text" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" placeholder="https://youtube.com/..." />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Thứ tự hiển thị</label>
                        <input type="number" value={order} onChange={(e) => setOrder(parseInt(e.target.value))} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" required />
                    </div>
                    <button type="submit" disabled={saving} className="w-full bg-black text-yellow-400 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2">
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Cập nhật bài học
                    </button>
                </form>
            </div>
        </div>
    )
}
export default function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const [course, setCourse] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [selectedLesson, setSelectedLesson] = useState<any>(null)
    const [nameLop, setNameLop] = useState('')
    const [phiCoc, setPhiCoc] = useState(0)
    const [idKhoa, setIdKhoa] = useState('')
    const [noidungEmail, setNoidungEmail] = useState('')
    const fetchData = async () => {
        setLoading(true)
        const res = await fetch(`/api/courses/${id}`).then(r => r.json())
        if (res && !res.error) {
            setCourse(res)
            setNameLop(res.name_lop || '')
            setPhiCoc(res.phi_coc || 0)
            setIdKhoa(res.id_khoa || '')
            setNoidungEmail(res.noidung_email || '')
        }
        setLoading(false)
    }
    useEffect(() => { fetchData() }, [id])
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setMessage(null)
        const res = await updateCourseAction(parseInt(id), {
            name_lop: nameLop, phi_coc: phiCoc, id_khoa: idKhoa, noidung_email: noidungEmail
        })
        if (res.success) setMessage({ type: 'success', text: 'Đã lưu thông tin khóa học!' })
        else setMessage({ type: 'error', text: res.error || 'Lỗi khi lưu.' })
        setSaving(false)
    }
    const handleUpdateLesson = async (data: any) => {
        const res = await updateLessonAction(data.id, {
            title: data.title, videoUrl: data.videoUrl, order: data.order
        })
        if (res.success) {
            setMessage({ type: 'success', text: 'Đã cập nhật bài học thành công!' })
            fetchData()
        }
    }
    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500 mb-2" />
            <p className="text-xs font-black uppercase">Đang tải...</p>
        </div>
    )
    return (
        <div className="max-w-md mx-auto space-y-8 pb-32">
            <Link href="/admin/courses" className="inline-flex items-center gap-2 text-xs font-black text-gray-400 uppercase hover:text-purple-600 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Khóa học
            </Link>
            {}
            <div className="bg-white rounded-[2.5rem] p-6 shadow-xl border border-gray-100">
                <h1 className="text-xl font-black text-gray-900 mb-6 uppercase tracking-tight flex items-center gap-2">
                    <Edit2 className="w-5 h-5 text-purple-500" /> Sửa Khóa học
                </h1>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Tên lớp học</label>
                        <input type="text" value={nameLop} onChange={(e) => setNameLop(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Học phí</label>
                            <input type="number" value={phiCoc} onChange={(e) => setPhiCoc(parseInt(e.target.value))} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" />
                        </div>
                        <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Mã khóa</label>
                            <input type="text" value={idKhoa} onChange={(e) => setIdKhoa(e.target.value.toUpperCase())} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" />
                        </div>
                    </div>
                    <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Email kích hoạt</label>
                        <textarea value={noidungEmail} onChange={(e) => setNoidungEmail(e.target.value)} rows={4} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm outline-none" />
                    </div>
                    {message && (
                        <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-bold ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                            {message.text}
                        </div>
                    )}
                    <button type="submit" disabled={saving} className="w-full bg-black text-yellow-400 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all">
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Lưu Khóa học
                    </button>
                </form>
            </div>
            {}
            <div className="space-y-4">
                <h2 className="text-lg font-black text-gray-900 flex items-center gap-2 px-2 uppercase tracking-tight">
                    <List className="w-5 h-5 text-indigo-500" /> Bài giảng ({course?.lessons?.length || 0})
                </h2>
                <div className="space-y-3">
                    {course?.lessons?.map((lesson: any) => (
                        <div key={lesson.id} className="bg-white p-4 rounded-3xl border border-gray-100 shadow-lg shadow-gray-100/50 flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-xs font-black font-mono">
                                    #{lesson.order}
                                </div>
                                <div className="space-y-0.5">
                                    <h4 className="text-sm font-black text-gray-800 leading-tight">{lesson.title}</h4>
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase">
                                        <Play className="w-3 h-3" /> {lesson.videoUrl ? 'Đã có Video' : 'Chưa có Video'}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedLesson(lesson)}
                                className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center hover:bg-gray-900 hover:text-white transition-all active:scale-90"
                            >
                                <Settings className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
            {}
            {selectedLesson && (
                <LessonEditModal
                    lesson={selectedLesson}
                    onClose={() => setSelectedLesson(null)}
                    onSave={handleUpdateLesson}
                />
            )}
        </div>
    )
}
```

## File: app/admin/courses/page.tsx
```typescript
'use client'
import { useState, useEffect } from 'react'
import { getAdminCoursesAction } from '@/app/actions/admin-actions'
import { BookOpen, Users, DollarSign, Settings, Loader2, Plus, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
export default function AdminCoursesPage() {
    const [courses, setCourses] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    useEffect(() => {
        const fetchCourses = async () => {
            setLoading(true)
            const res = await getAdminCoursesAction()
            if (res.success) {
                setCourses(res.courses || [])
            }
            setLoading(false)
        }
        fetchCourses()
    }, [])
    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 leading-tight">Khóa học</h1>
                    <p className="text-gray-500 text-xs font-medium">Quản lý nội dung & học phí</p>
                </div>
                <button className="bg-black text-yellow-400 p-2.5 rounded-2xl shadow-lg active:scale-95 transition-all">
                    <Plus className="w-5 h-5" />
                </button>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="w-full">
                    <table className="w-full text-left border-collapse table-fixed">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-2 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center w-14 border-r border-gray-100">ID</th>
                                <th className="px-3 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Thông tin Khóa học</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={2} className="px-6 py-12 text-center text-gray-500">
                                        <Loader2 className="w-6 h-6 animate-spin text-purple-500 mx-auto mb-2" />
                                        <p className="text-[10px] font-black uppercase">Đang tải...</p>
                                    </td>
                                </tr>
                            ) : courses.length === 0 ? (
                                <tr>
                                    <td colSpan={2} className="px-6 py-12 text-center text-gray-400 text-[10px] font-black uppercase">
                                        Chưa có khóa học nào
                                    </td>
                                </tr>
                            ) : (
                                courses.map((course) => (
                                    <tr key={course.id} className="hover:bg-orange-50/30 transition-colors">
                                        <td className="px-2 py-4 text-center align-top space-y-3">
                                            <div className="text-[10px] font-black font-mono text-gray-900 bg-gray-100 px-1 py-0.5 rounded border border-gray-200">
                                                #{course.id}
                                            </div>
                                            <Link
                                                href={`/admin/courses/${course.id}`}
                                                className="inline-flex items-center justify-center w-8 h-8 bg-black text-yellow-400 rounded-full hover:bg-zinc-800 active:scale-90 transition-all shadow-md"
                                            >
                                                <Settings className="w-4 h-4" />
                                            </Link>
                                        </td>
                                        <td className="px-3 py-4 space-y-1 overflow-hidden">
                                            <div className="font-black text-orange-600 text-sm truncate leading-tight uppercase tracking-tight">
                                                {course.name_lop}
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-1 text-[10px] text-gray-500 font-bold">
                                                    <DollarSign className="w-3 h-3 text-green-500" />
                                                    {course.phi_coc.toLocaleString()}đ
                                                </div>
                                                <div className="flex items-center gap-1 text-[10px] text-gray-500 font-bold">
                                                    <BookOpen className="w-3 h-3 text-blue-400" />
                                                    {course._count?.lessons} bài
                                                </div>
                                                <div className="flex items-center gap-1 text-[10px] text-gray-500 font-bold">
                                                    <Users className="w-3 h-3 text-purple-400" />
                                                    {course._count?.enrollments} HV
                                                </div>
                                            </div>
                                            <div className="text-[10px] text-gray-400 font-medium">
                                                Mã: <span className="font-bold text-gray-600">{course.id_khoa}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
```

## File: app/admin/payments/page.tsx
```typescript
'use client'
import { useEffect, useState } from 'react'
import { getPendingPayments, getAllPayments, verifyPaymentAction, rejectPaymentAction } from '@/app/actions/payment-actions'
import Image from 'next/image'
interface PaymentData {
  id: number
  amount: number
  status: string
  phone: string | null
  courseCode: string | null
  bankName: string | null
  accountNumber: string | null
  content: string | null
  proofImage: string | null
  verifyMethod: string | null
  verifiedAt: Date | null
  createdAt: Date
  enrollment: {
    id: number
    status: string
    user: {
      id: number
      name: string | null
      email: string
      phone: string | null
    }
    course: {
      id: number
      id_khoa: string
      name_lop: string
      phi_coc: number
    }
  }
}
export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentData[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'PENDING' | 'ALL'>('PENDING')
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  useEffect(() => {
    loadPayments()
  }, [filter])
  async function loadPayments() {
    setLoading(true)
    const result = filter === 'PENDING'
      ? await getPendingPayments()
      : await getAllPayments()
    if (result.success) {
      setPayments(result.payments as PaymentData[])
    }
    setLoading(false)
  }
  async function handleVerify(paymentId: number) {
    setActionLoading(paymentId)
    const enrollmentId = payments.find(p => p.id === paymentId)?.enrollment.id
    if (!enrollmentId) return
    const result = await verifyPaymentAction(enrollmentId, 'MANUAL_ADMIN', 'Admin xác nhận thủ công')
    if (result.success) {
      await loadPayments()
    }
    setActionLoading(null)
  }
  async function handleReject(paymentId: number) {
    const reason = prompt('Nhập lý do từ chối:')
    if (!reason) return
    setActionLoading(paymentId)
    const enrollmentId = payments.find(p => p.id === paymentId)?.enrollment.id
    if (!enrollmentId) return
    const result = await rejectPaymentAction(enrollmentId, reason)
    if (result.success) {
      await loadPayments()
    }
    setActionLoading(null)
  }
  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    VERIFIED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-gray-100 text-gray-800'
  }
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý thanh toán</h1>
          <p className="text-gray-600">Xem và xác nhận thanh toán khóa học</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('PENDING')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === 'PENDING'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Chờ xác nhận
          </button>
          <button
            onClick={() => setFilter('ALL')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === 'ALL'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Tất cả
          </button>
        </div>
      </div>
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải...</p>
        </div>
      ) : payments.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <p className="text-gray-500">Không có thanh toán nào</p>
        </div>
      ) : (
        <div className="space-y-4">
          {payments.map((payment) => (
            <div key={payment.id} className="bg-white border rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColors[payment.status]}`}>
                      {payment.status === 'PENDING' ? '⏳ Chờ xác nhận' :
                       payment.status === 'VERIFIED' ? '✓ Đã xác nhận' :
                       payment.status === 'REJECTED' ? '✗ Từ chối' : 'Đã hủy'}
                    </span>
                    <span className="text-sm text-gray-500">
                      #{payment.id} • {new Date(payment.createdAt).toLocaleString('vi-VN')}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Học viên</p>
                      <p className="font-medium">{payment.enrollment.user.name || 'N/A'}</p>
                      <p className="text-sm text-gray-600">{payment.enrollment.user.email}</p>
                      {payment.enrollment.user.phone && (
                        <p className="text-sm text-gray-500">📱 {payment.enrollment.user.phone}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Khóa học</p>
                      <p className="font-medium">{payment.enrollment.course.name_lop}</p>
                      <p className="text-sm text-gray-500">Mã: {payment.enrollment.course.id_khoa}</p>
                      <p className="text-sm text-gray-500">Phí: {payment.enrollment.course.phi_coc.toLocaleString()}đ</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Thông tin chuyển khoản</p>
                      {payment.amount > 0 && (
                        <p className="font-medium text-green-600">Số tiền: {payment.amount.toLocaleString()}đ</p>
                      )}
                      {payment.phone && <p className="text-sm">📱 {payment.phone}</p>}
                      {payment.bankName && <p className="text-sm">🏦 {payment.bankName}</p>}
                      {payment.content && <p className="text-sm text-gray-600">ND: {payment.content}</p>}
                      {payment.verifyMethod && (
                        <p className="text-xs text-gray-500 mt-1">
                          Cách xác nhận: {
                            payment.verifyMethod === 'AUTO_EMAIL' ? 'Tự động email' :
                            payment.verifyMethod === 'MANUAL_UPLOAD' ? 'Upload biên lai' :
                            'Thủ công'
                          }
                        </p>
                      )}
                    </div>
                  </div>
                  {payment.proofImage && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-600 font-medium mb-2">📎 Biên lai đã upload:</p>
                      <div className="relative w-48 h-36 border rounded-lg overflow-hidden">
                        <Image
                          src={payment.proofImage}
                          alt="Biên lai"
                          fill
                          className="object-cover"
                        />
                      </div>
                    </div>
                  )}
                </div>
                {payment.status === 'PENDING' && (
                  <div className="flex flex-col gap-2 ml-4">
                    <button
                      onClick={() => handleVerify(payment.id)}
                      disabled={actionLoading === payment.id}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50"
                    >
                      {actionLoading === payment.id ? '...' : '✓ Xác nhận'}
                    </button>
                    <button
                      onClick={() => handleReject(payment.id)}
                      disabled={actionLoading === payment.id}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 disabled:opacity-50"
                    >
                      {actionLoading === payment.id ? '...' : '✗ Từ chối'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

## File: app/admin/posts/page.tsx
```typescript
'use client'
import { useState, useEffect } from 'react'
import { getPostsAction, createPostAction } from '@/app/actions/post-actions'
import { Plus, Newspaper, Save, Loader2, Image as ImageIcon, X, Trash2 } from 'lucide-react'
import Link from 'next/link'
export default function AdminPostsPage() {
    const [posts, setPosts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreate, setShowCreate] = useState(false)
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [image, setImage] = useState('')
    const [saving, setSaving] = useState(false)
    const fetchPosts = async () => {
        setLoading(true)
        const res = await getPostsAction()
        if (res.success) {
            setPosts(res.posts || [])
        }
        setLoading(false)
    }
    useEffect(() => {
        fetchPosts()
    }, [])
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        const res = await createPostAction({ title, content, image })
        if (res.success) {
            setTitle('')
            setContent('')
            setImage('')
            setShowCreate(false)
            fetchPosts()
        } else {
            alert(res.error)
        }
        setSaving(false)
    }
    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 leading-tight">Bảng tin</h1>
                    <p className="text-gray-500 text-xs font-medium">Quản lý bài viết cộng đồng</p>
                </div>
                <button
                    onClick={() => setShowCreate(!showCreate)}
                    className="bg-black text-yellow-400 p-2.5 rounded-2xl shadow-lg active:scale-95 transition-all"
                >
                    {showCreate ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </button>
            </div>
            {/* Form Đăng bài mới */}
            {showCreate && (
                <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-purple-100 animate-in slide-in-from-top-4 duration-300">
                    <h2 className="text-lg font-black text-gray-900 mb-4 uppercase tracking-tight flex items-center gap-2">
                        <Newspaper className="w-5 h-5 text-purple-500" /> Đăng bài mới
                    </h2>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Tiêu đề bản tin</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                                placeholder="Nhập tiêu đề thu hút..."
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Nội dung chi tiết</label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                rows={5}
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                                placeholder="Bạn muốn chia sẻ điều gì với cộng đồng?"
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Link ảnh minh họa (không bắt buộc)</label>
                            <div className="relative">
                                <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={image}
                                    onChange={(e) => setImage(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-11 pr-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                                    placeholder="https://postimg.cc/..."
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full bg-black text-yellow-400 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                        >
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            Đăng bản tin ngay
                        </button>
                    </form>
                </div>
            )}
            {/* Danh sách bài viết hiện có */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="w-full">
                    <table className="w-full text-left border-collapse table-fixed">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-3 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Bản tin đã đăng</th>
                                <th className="px-3 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center w-16">Xóa</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={2} className="px-6 py-12 text-center text-gray-500">
                                        <Loader2 className="w-6 h-6 animate-spin text-purple-500 mx-auto mb-2" />
                                        <p className="text-[10px] font-black uppercase">Đang tải bản tin...</p>
                                    </td>
                                </tr>
                            ) : posts.length === 0 ? (
                                <tr>
                                    <td colSpan={2} className="px-6 py-12 text-center text-gray-400 text-[10px] font-black uppercase">
                                        Chưa có bài viết nào
                                    </td>
                                </tr>
                            ) : (
                                posts.map((post) => (
                                    <tr key={post.id} className="hover:bg-purple-50/30 transition-colors">
                                        <td className="px-3 py-4">
                                            <div className="font-black text-gray-900 text-sm truncate leading-tight uppercase">{post.title}</div>
                                            <div className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                                                {new Date(post.createdAt).toLocaleDateString('vi-VN')} • {post._count?.comments || 0} bình luận
                                            </div>
                                        </td>
                                        <td className="px-3 py-4 text-center">
                                            <button className="p-2 text-gray-300 hover:text-red-600 transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
```

## File: app/admin/reserved-ids/page.tsx
```typescript
import { deleteReservedIdAction, getReservedIds } from "@/app/actions/admin-actions"
import { AddReservedIdForm } from "./add-form"
import { ChangeUserIdForm } from "./change-id-form"
export default async function ReservedIdsPage() {
    const reservedIds = await getReservedIds()
    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold mb-4 text-gray-800">💎 Cấp số đẹp cho Học viên</h2>
                <ChangeUserIdForm />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {}
                <div>
                    <h3 className="text-xl font-bold mb-4 text-gray-800">Danh sách ID Đã giữ ({reservedIds.length})</h3>
                    <div className="bg-white border rounded-lg overflow-hidden shadow-sm max-h-[500px] overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ghi chú</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {reservedIds.map((item: any) => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-purple-600">{item.id}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.note}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <form action={async () => {
                                                'use server'
                                                await deleteReservedIdAction(item.id)
                                            }}>
                                                <button className="text-red-600 hover:text-red-900 border px-2 py-1 rounded hover:bg-red-50">Xóa</button>
                                            </form>
                                        </td>
                                    </tr>
                                ))}
                                {reservedIds.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">Chưa có ID nào được giữ.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                {}
                <div>
                    <h3 className="text-xl font-bold mb-4 text-gray-800">Giữ thêm số mới</h3>
                    <AddReservedIdForm />
                </div>
            </div>
        </div>
    )
}
```

## File: app/admin/students/[id]/page.tsx
```typescript
'use client'
import { useState, useEffect, use } from 'react'
import { getStudentDetailsAction } from '@/app/actions/admin-actions'
import { User, Mail, Phone, Calendar, BookOpen, CheckCircle, ArrowLeft, Loader2, Award, Info, X, ExternalLink } from 'lucide-react'
import Link from 'next/link'
function ScoreModal({ enroll, onClose }: { enroll: any, onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="bg-purple-600 p-4 text-white flex items-center justify-between">
                    <div>
                        <h3 className="font-black text-sm uppercase tracking-tight line-clamp-1">{enroll.course.name_lop}</h3>
                        <p className="text-[10px] opacity-80 font-bold uppercase">Bảng điểm chi tiết</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X className="w-5 h-5" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <div className="space-y-3">
                        {enroll.course.lessons.map((lesson: any) => {
                            const prog = enroll.lessonProgress.find((p: any) => p.lessonId === lesson.id)
                            const scores = prog?.scores || {}
                            return (
                                <div key={lesson.id} className={`p-3 rounded-2xl border ${prog?.status === 'COMPLETED' ? 'border-green-100 bg-green-50/30' : 'border-gray-100 bg-gray-50/50 opacity-60'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-start gap-2">
                                            <span className="bg-white px-1.5 py-0.5 rounded border border-gray-200 text-[10px] font-black font-mono">#{lesson.order}</span>
                                            <span className="font-bold text-gray-800 text-xs leading-tight">{lesson.title}</span>
                                        </div>
                                        <span className={`text-xs font-black ${prog?.status === 'COMPLETED' ? 'text-green-600' : 'text-gray-400'}`}>
                                            {prog?.totalScore ?? 0}/10
                                        </span>
                                    </div>
                                    {prog && (
                                        <div className="grid grid-cols-5 gap-1 text-[9px] font-bold text-center uppercase tracking-tighter">
                                            <div className="bg-white p-1 rounded-md border border-gray-100">Vid: {scores.video ?? 0}</div>
                                            <div className="bg-white p-1 rounded-md border border-gray-100">Tâm: {scores.reflection ?? 0}</div>
                                            <div className="bg-white p-1 rounded-md border border-gray-100">Làm: {scores.link ?? 0}</div>
                                            <div className="bg-white p-1 rounded-md border border-gray-100">Giúp: {scores.support ?? 0}</div>
                                            <div className={`p-1 rounded-md border border-gray-100 ${scores.timing === 1 ? 'bg-green-100 text-green-700' : scores.timing === -1 ? 'bg-red-100 text-red-700' : 'bg-white'}`}>
                                                Hạn: {scores.timing ?? 0}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}
export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const [student, setStudent] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedEnroll, setSelectedEnroll] = useState<any>(null)
    useEffect(() => {
        const fetchDetails = async () => {
            setLoading(true)
            const res = await getStudentDetailsAction(parseInt(id))
            if (res.success) {
                setStudent(res.student)
            } else {
                setError(res.error || 'Lỗi tải dữ liệu')
            }
            setLoading(false)
        }
        fetchDetails()
    }, [id])
    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-2 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            <p className="text-xs font-black uppercase">Đang tải hồ sơ...</p>
        </div>
    )
    return (
        <div className="max-w-md mx-auto space-y-6 pb-20">
            {}
            <Link href="/admin/students" className="inline-flex items-center gap-2 text-xs font-black text-gray-400 uppercase hover:text-purple-600 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Danh sách học viên
            </Link>
            {}
            <div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-purple-100 border border-purple-50">
                <div className="flex flex-col items-center text-center space-y-3">
                    <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-4xl font-black shadow-lg shadow-purple-200 ring-4 ring-purple-50">
                        {student.name ? student.name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 leading-tight">{student.name || 'N/A'}</h1>
                        <p className="text-xs font-black text-purple-500 font-mono tracking-widest mt-1 uppercase">Mã học tập: #{student.id}</p>
                    </div>
                    <div className="grid grid-cols-1 w-full gap-2 pt-4">
                        <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                            <Phone className="w-4 h-4 text-purple-400" />
                            <span className="text-sm font-bold text-gray-700">{student.phone || 'Chưa cập nhật'}</span>
                        </div>
                        <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                            <Mail className="w-4 h-4 text-purple-400" />
                            <span className="text-sm font-bold text-gray-700 truncate">{student.email}</span>
                        </div>
                        <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                            <Calendar className="w-4 h-4 text-purple-400" />
                            <span className="text-xs font-bold text-gray-500 italic">Gia nhập: {new Date(student.createdAt).toLocaleDateString('vi-VN')}</span>
                        </div>
                    </div>
                </div>
            </div>
            {}
            <div className="space-y-4">
                <h2 className="text-lg font-black text-gray-900 flex items-center gap-2 px-2 uppercase tracking-tight">
                    <Award className="w-5 h-5 text-yellow-500" />
                    Lộ trình học tập
                </h2>
                {student.enrollments.length === 0 ? (
                    <div className="bg-gray-100 rounded-3xl p-8 text-center text-gray-400 text-xs font-bold uppercase border-2 border-dashed border-gray-200">
                        Chưa đăng ký khóa nào
                    </div>
                ) : (
                    student.enrollments.map((enroll: any) => {
                        const totalLessons = enroll.course.lessons.length
                        const completedCount = enroll.lessonProgress.filter((p: any) => p.status === 'COMPLETED').length
                        const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0
                        return (
                            <div key={enroll.id} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-lg shadow-gray-100/50 space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-xl shadow-inner border border-indigo-100">
                                        📘
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-black text-gray-900 text-sm uppercase leading-tight truncate">{enroll.course.name_lop}</h3>
                                        <p className={`text-[10px] font-black uppercase mt-0.5 ${enroll.status === 'ACTIVE' ? 'text-green-500' : 'text-orange-500'}`}>
                                            ● {enroll.status === 'ACTIVE' ? 'Đã kích hoạt' : 'Chờ thanh toán'}
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-[10px] font-black uppercase text-gray-400 tracking-widest">
                                        <span>Tiến độ</span>
                                        <span className="text-purple-600">{progressPct}%</span>
                                    </div>
                                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden border border-gray-50">
                                        <div
                                            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-1000"
                                            style={{ width: `${progressPct}%` }}
                                        />
                                    </div>
                                    <p className="text-[9px] font-black text-gray-400 uppercase text-right">Đã xong {completedCount}/{totalLessons} bài</p>
                                </div>
                                <button
                                    onClick={() => setSelectedEnroll(enroll)}
                                    className="w-full bg-gray-900 text-white py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black active:scale-[0.98] transition-all"
                                >
                                    <Info className="w-4 h-4 text-yellow-400" />
                                    Xem bảng điểm chi tiết
                                </button>
                            </div>
                        )
                    })
                )}
            </div>
            {}
            {selectedEnroll && (
                <ScoreModal enroll={selectedEnroll} onClose={() => setSelectedEnroll(null)} />
            )}
        </div>
    )
}
```

## File: app/admin/students/page.tsx
```typescript
'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getStudentsAction } from '@/app/actions/admin-actions'
import { Search, User, Mail, Phone, Calendar, BookOpen, CheckCircle, Loader2, Info, ArrowUpDown } from 'lucide-react'
export default function AdminStudentsPage() {
    const [students, setStudents] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedRole, setSelectedRole] = useState<string>('STUDENT')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
    const fetchStudents = async (query?: string, role?: string) => {
        setLoading(true)
        const res = await getStudentsAction(query, (role || selectedRole) as any)
        if (res.success) {
            let data = res.students || []
            data.sort((a: any, b: any) => {
                const timeA = new Date(a.createdAt).getTime()
                const timeB = new Date(b.createdAt).getTime()
                return sortOrder === 'asc' ? timeA - timeB : timeB - timeA
            })
            setStudents(data)
        }
        setLoading(false)
    }
    useEffect(() => {
        fetchStudents(searchQuery, selectedRole)
    }, [sortOrder, selectedRole])
    const toggleSort = () => {
        setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    }
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        fetchStudents(searchQuery, selectedRole)
    }
    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 leading-tight">Quản lý</h1>
                        <p className="text-gray-500 text-xs font-medium">Thành viên & tiến độ</p>
                    </div>
                    <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="bg-black text-yellow-400 border-none rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-tighter focus:ring-2 focus:ring-yellow-500 outline-none shadow-lg cursor-pointer"
                    >
                        <option value="ALL">Tất cả</option>
                        <option value="STUDENT">Học viên</option>
                        <option value="ADMIN">Quản trị</option>
                        <option value="INSTRUCTOR">Giảng viên</option>
                        <option value="AFFILIATE">Đối tác</option>
                        <option value="COURSE_86_DAYS">Coach 1:1</option>
                    </select>
                </div>
                <form onSubmit={handleSearch} className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Tìm Tên, SĐT hoặc #ID..."
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm text-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </form>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="w-full">
                    <table className="w-full text-left border-collapse table-fixed">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-2 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center w-14 border-r border-gray-100">ID</th>
                                <th className="px-3 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest relative">
                                    <div className="flex items-center">
                                        <span>Thông tin cơ bản</span>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                                            <div className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-[9px] font-black border border-orange-200 shadow-sm">
                                                {students.length}
                                            </div>
                                            <button
                                                onClick={toggleSort}
                                                className="flex items-center gap-1 hover:text-gray-900 transition-colors bg-gray-100 p-1 rounded-lg border border-gray-200"
                                                title={sortOrder === 'desc' ? 'Mới nhất lên đầu' : 'Cũ nhất lên đầu'}
                                            >
                                                <ArrowUpDown className={`w-3.5 h-3.5 ${sortOrder === 'desc' ? 'text-gray-900' : 'text-purple-600'}`} />
                                            </button>
                                        </div>
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={2} className="px-6 py-12 text-center text-gray-500">
                                        <Loader2 className="w-6 h-6 animate-spin text-purple-500 mx-auto mb-2" />
                                        <p className="text-[10px] font-black uppercase">Đang tải...</p>
                                    </td>
                                </tr>
                            ) : students.length === 0 ? (
                                <tr>
                                    <td colSpan={2} className="px-6 py-12 text-center text-gray-400 text-[10px] font-black uppercase">
                                        Trống
                                    </td>
                                </tr>
                            ) : (
                                    students.map((student) => {
                                        const hasCourseOne = student.enrollments.some((e: any) => e.courseId === 1)
                                        return (
                                            <tr key={student.id} className="hover:bg-orange-50/30 transition-colors">
                                                <td className="px-2 py-4 text-center align-top space-y-3">
                                                    <div className="text-[10px] font-black font-mono text-gray-900 bg-gray-100 px-1 py-0.5 rounded border border-gray-200">
                                                        #{student.id}
                                                    </div>
                                                    <Link
                                                        href={`/admin/students/${student.id}`}
                                                        className="inline-flex items-center justify-center w-8 h-8 bg-black text-yellow-400 rounded-full hover:bg-zinc-800 active:scale-90 transition-all shadow-md"
                                                    >
                                                        <Info className="w-4 h-4" />
                                                    </Link>
                                                </td>
                                                <td className="px-3 py-4 space-y-1 overflow-hidden">
                                                    <div className={`font-black text-sm truncate leading-tight capitalize tracking-tight ${hasCourseOne ? 'text-purple-600' : 'text-orange-600'}`}>
                                                        {student.name ? student.name.toLowerCase() : 'N/A'}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium truncate">
                                                        <Mail className="w-3 h-3 text-gray-300 shrink-0" />
                                                        {student.email}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-bold truncate">
                                                        <Phone className="w-3 h-3 text-gray-300 shrink-0" />
                                                        {student.phone || '---'}
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
```

## File: app/courses/[id]/learn/error.tsx
```typescript
'use client'
import { useEffect } from 'react'
import { AlertCircle, RefreshCcw, Home } from 'lucide-react'
import Link from 'next/link'
export default function CourseLearnError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Course Learn Page Error:', error)
  }, [error])
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 text-center">
      <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
        <AlertCircle className="w-10 h-10 text-red-500" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Đã xảy ra lỗi hệ thống</h2>
      <p className="text-zinc-400 text-sm max-w-md mb-8">
        Hệ thống không thể tải nội dung bài học. Điều này có thể do phiên đăng nhập hết hạn hoặc dữ liệu khóa học gặp sự cố.
      </p>
      {error.digest && (
        <div className="mb-8 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg">
          <p className="text-[10px] text-zinc-500 font-mono">Mã lỗi (Digest): {error.digest}</p>
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => reset()}
          className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-2.5 rounded-xl transition-all"
        >
          <RefreshCcw className="w-4 h-4" /> Thử lại ngay
        </button>
        <Link
          href="/"
          className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-6 py-2.5 rounded-xl transition-all"
        >
          <Home className="w-4 h-4" /> Quay về trang chủ
        </Link>
      </div>
      <p className="mt-12 text-xs text-zinc-600 italic">
        Nếu lỗi vẫn tiếp tục, vui lòng liên hệ Ban quản trị để được hỗ trợ.
      </p>
    </div>
  )
}
```

## File: app/layout.tsx
```typescript
import type { Metadata } from "next";
import { Be_Vietnam_Pro, Inter } from "next/font/google";
import "./globals.css";
const beVietnamPro = Be_Vietnam_Pro({
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  subsets: ["vietnamese", "latin"],
  variable: "--font-be-vietnam-pro",
});
const inter = Inter({
  subsets: ["vietnamese", "latin"],
  variable: "--font-inter",
});
export const metadata: Metadata = {
  title: "Học Viện BRK - Nâng Tầm Năng Lực",
  description: "Học viện đào tạo thực chiến về AI, Nhân hiệu và Affiliate",
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className={`${beVietnamPro.variable} ${inter.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
```

## File: components/course/ChatSection.tsx
```typescript
'use client'
import { useState, useEffect, useRef, useMemo, useOptimistic, useTransition } from 'react'
import { getCommentsByLesson, createComment } from '@/app/actions/comment-actions'
import { Send, LogIn, Loader2, MessageCircle } from 'lucide-react'
import Link from 'next/link'
interface Comment {
    id: number | string
    content: string
    createdAt: Date
    userId: number
    userName: string | null
    userAvatar: string | null
    sending?: boolean
}
interface ChatSectionProps {
    lessonId: string
    session: any
}
const CommentItem = ({ comment }: { comment: Comment }) => {
    const getInitials = (name: string | null) => {
        if (!name) return '?'
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    }
    return (
        <div className={`mb-3 group transition-opacity ${comment.sending ? 'opacity-50' : 'opacity-100'}`}>
            <div className="flex gap-3">
                <div className="shrink-0">
                    {comment.userAvatar ? (
                        <img
                            src={comment.userAvatar}
                            alt={comment.userName || 'User'}
                            className="w-8 h-8 rounded-full object-cover border border-zinc-800"
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-xs font-bold text-black">
                            {getInitials(comment.userName)}
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold text-white">
                            {comment.userName || 'Người dùng'}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                            {formatTime(comment.createdAt)}
                        </span>
                        {comment.sending && <span className="text-[9px] text-yellow-500 italic">Đang gửi...</span>}
                    </div>
                    <p className="text-[13px] italic text-zinc-300 mt-0.5 break-words leading-relaxed">
                        {comment.content}
                    </p>
                </div>
            </div>
        </div>
    )
}
export default function ChatSection({ lessonId, session }: ChatSectionProps) {
    const [comments, setComments] = useState<Comment[]>([])
    const [loading, setLoading] = useState(true)
    const [isPending, startTransition] = useTransition()
    const [newComment, setNewComment] = useState('')
    const [error, setError] = useState('')
    const commentsEndRef = useRef<HTMLDivElement>(null)
    // Optimistic UI: Hiển thị ngay lập tức khi nhấn gửi
    const [optimisticComments, addOptimisticComment] = useOptimistic(
        comments,
        (state: Comment[], newItem: Comment) => [...state, newItem]
    )
    // Cache comments theo lessonId
    const commentCache = useRef<Map<string, Comment[]>>(new Map())
    useEffect(() => {
        if (commentCache.current.has(lessonId)) {
            setComments(commentCache.current.get(lessonId)!)
            setLoading(false)
            return
        }
        setLoading(true)
        getCommentsByLesson(lessonId).then(data => {
            const mapped = data.map((c: any) => ({
                ...c,
                createdAt: new Date(c.createdAt)
            })) as Comment[]
            commentCache.current.set(lessonId, mapped)
            setComments(mapped)
            setLoading(false)
        })
    }, [lessonId])
    useEffect(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [optimisticComments])
    async function handleSendComment(e: React.FormEvent) {
        e.preventDefault()
        const content = newComment.trim()
        if (!content || !session?.user) return
        setNewComment('')
        setError('')
        // 1. Tạo bản tin nhắn tạm thời (Optimistic)
        const tempId = Date.now().toString()
        const tempComment: Comment = {
            id: tempId,
            content: content,
            createdAt: new Date(),
            userId: parseInt(session.user.id),
            userName: session.user.name || session.user.studentId || 'Bạn',
            userAvatar: session.user.image || null,
            sending: true
        }
        startTransition(async () => {
            addOptimisticComment(tempComment)
            const result = await createComment(lessonId, content)
            if (result.success && result.comment) {
                const newEntry = {
                    ...result.comment,
                    createdAt: new Date(result.comment.createdAt)
                } as Comment
                setComments(prev => {
                    const updated = [...prev, newEntry]
                    commentCache.current.set(lessonId, updated)
                    return updated
                })
            } else {
                setError(result.message || 'Gửi thất bại. Vui lòng thử lại.')
            }
        })
    }
    const groupedComments = useMemo(() => {
        const map: Record<string, Comment[]> = {}
        optimisticComments.forEach(comment => {
            const dateKey = new Date(comment.createdAt).toDateString()
            if (!map[dateKey]) map[dateKey] = []
            map[dateKey].push(comment)
        })
        return map
    }, [optimisticComments])
    const formatDate = (dateKey: string) => {
        const date = new Date(dateKey)
        const today = new Date()
        if (date.toDateString() === today.toDateString()) return 'Hôm nay'
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        if (date.toDateString() === yesterday.toDateString()) return 'Hôm qua'
        return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
    }
    return (
        <div className="flex flex-col h-full bg-zinc-950">
            <div className="shrink-0 px-4 py-3 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-yellow-400" />
                    Tương tác
                    <span className="text-zinc-500 font-normal text-xs">({optimisticComments.length})</span>
                </h3>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 custom-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <Loader2 className="h-6 w-6 animate-spin text-yellow-400" />
                        <span className="text-xs text-zinc-500">Đang tải nội dung...</span>
                    </div>
                ) : optimisticComments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mb-3">
                            <MessageCircle className="h-6 w-6 text-zinc-700" />
                        </div>
                        <p className="text-zinc-500 text-sm font-medium">Chưa có bình luận nào</p>
                        <p className="text-zinc-600 text-xs mt-1">Hãy là người đầu tiên bắt đầu cuộc trò chuyện!</p>
                    </div>
                ) : (
                    Object.entries(groupedComments).map(([dateKey, dateComments]) => (
                        <div key={dateKey} className="mb-6">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="h-px flex-1 bg-zinc-800/50"></div>
                                <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                                    {formatDate(dateKey)}
                                </span>
                                <div className="h-px flex-1 bg-zinc-800/50"></div>
                            </div>
                            {dateComments.map(comment => (
                                <CommentItem key={comment.id} comment={comment} />
                            ))}
                        </div>
                    ))
                )}
                <div ref={commentsEndRef} className="h-4" />
            </div>
            <div className="shrink-0 border-t border-zinc-800 bg-zinc-900/80 p-3 backdrop-blur-md">
                {session?.user ? (
                    <form onSubmit={handleSendComment} className="relative flex items-center">
                        <input
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Nhập nội dung tương tác..."
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl pl-4 pr-12 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 transition-all"
                            disabled={isPending}
                        />
                        <button
                            type="submit"
                            disabled={!newComment.trim() || isPending}
                            className="absolute right-1.5 w-8 h-8 rounded-xl bg-yellow-400 text-black flex items-center justify-center disabled:opacity-30 disabled:grayscale hover:bg-yellow-300 transition-all active:scale-90"
                        >
                            {isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </button>
                    </form>
                ) : (
                    <div className="bg-zinc-800/50 rounded-xl py-3 px-4 border border-zinc-700/50 text-center">
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-2 text-sm font-semibold text-yellow-400 hover:text-yellow-300 transition-colors"
                        >
                            <LogIn className="h-4 w-4" />
                            Đăng nhập để tham gia tương tác
                        </Link>
                    </div>
                )}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 mt-2">
                        <p className="text-red-400 text-[10px] text-center font-medium">{error}</p>
                    </div>
                )}
            </div>
        </div>
    )
}
```

## File: components/course/PaymentModal.tsx
```typescript
'use client'
import React, { useState } from 'react'
import Image from 'next/image'
import UploadProofModal from '@/components/payment/UploadProofModal'
interface PaymentModalProps {
    course: any
    enrollment?: {
        id?: number
        status: string
        payment?: {
            id?: number
            status: string
            proofImage?: string | null
            verifyMethod?: string | null
            verifiedAt?: string | null
            qrCodeUrl?: string | null
            transferContent?: string | null
            amount?: number | null
            bankName?: string | null
            accountNumber?: string | null
        }
    } | null
    isCourseOneActive?: boolean
    userPhone?: string | null
    userId?: number | null
    onClose: () => void
    onUploadProof?: (enrollmentId: number) => void
}
export default function PaymentModal({ course, enrollment, isCourseOneActive = false, userPhone = null, userId = null, onClose, onUploadProof }: PaymentModalProps) {
    const [showUploadModal, setShowUploadModal] = useState(false)
    const [showFullQR, setShowFullQR] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [uploaded, setUploaded] = useState(!!enrollment?.payment?.proofImage)
    const payment = enrollment?.payment
    const paymentStatus = payment?.status
    const isVerified = paymentStatus === 'VERIFIED'
    const isPending = paymentStatus === 'PENDING' || paymentStatus === undefined
    const effectiveAmount = isCourseOneActive ? 0 : (payment?.amount || course.phi_coc || 0)
    const cleanPhone = userPhone ? userPhone.replace(/\D/g, '').slice(-6) : ''
    const effectiveContent = payment?.transferContent || `SDT ${cleanPhone} HV ${userId} COC ${course.id_khoa}`.toUpperCase().slice(0, 50)
    // Mã BIN ngân hàng (Sacombank mặc định)
    const bankMap: Record<string, string> = { 'SACOMBANK': '970403', 'VCB': '970436', 'ACB': '970416', 'MB': '970422', 'TCB': '970407' }
    const bankId = bankMap[course.bank_stk?.toUpperCase()] || '970403'
    const qrCodeUrl = payment?.qrCodeUrl || course.link_qrcode || `https://img.vietqr.io/image/${bankId}-${course.stk}-qr_only.png?amount=${effectiveAmount}&addInfo=${encodeURIComponent(effectiveContent)}&accountName=${encodeURIComponent(course.name_stk || '')}`
    const handleUploadSuccess = () => {
        setUploaded(true)
        window.location.reload()
    }
    const handleUploadClick = () => {
        setShowUploadModal(true)
    }
    return (
        <>
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-2xl max-h-[95vh] flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden rounded-2xl sm:rounded-3xl bg-white shadow-2xl">
                {}
                <div className="bg-[#7c3aed] px-4 py-3 sm:px-6 sm:py-3 text-white shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0 pr-4">
                            <h2 className="text-base sm:text-lg font-bold leading-tight truncate">Kích hoạt khóa học</h2>
                            <p className="text-[10px] sm:text-xs text-purple-100 italic opacity-90 truncate">{course.name_lop}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {enrollment?.payment && (
                                <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                                    isVerified
                                        ? 'bg-green-500 text-white'
                                        : 'bg-yellow-500 text-white'
                                }`}>
                                    {isVerified ? '✓ Xong' : '⏳ Chờ'}
                                </div>
                            )}
                            <button
                                onClick={onClose}
                                className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold transition-colors border border-white/30"
                            >
                                Để sau
                            </button>
                        </div>
                    </div>
                </div>
                {}
                <div className="overflow-y-auto flex-1 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 p-4 sm:p-6">
                        {}
                        <div className="flex flex-col items-center justify-center text-center">
                            <div
                                onClick={() => setShowFullQR(true)}
                                className="group relative cursor-zoom-in"
                                title="Nhấn để phóng to mã QR"
                            >
                                <div className="relative mb-2 h-40 w-40 sm:h-48 sm:w-48 overflow-hidden rounded-xl border-2 border-purple-100 p-1 shadow-inner bg-white group-hover:border-purple-300 transition-colors">
                                    <Image
                                        src={qrCodeUrl}
                                        alt="QR Code Thanh toán"
                                        fill
                                        className="object-contain"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 flex items-center justify-center transition-all">
                                        <span className="opacity-0 group-hover:opacity-100 bg-white/90 text-[#7c3aed] text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
                                            🔍 Phóng to
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <p className="text-[9px] sm:text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                                Nhấn vào mã QR để phóng to/tải về
                            </p>
                        </div>
                        {}
                        <div className="flex flex-col justify-center space-y-2 sm:space-y-2.5">
                            <div className="rounded-xl bg-gray-50 px-3 py-1.5 border border-gray-100">
                                <p className="text-[9px] sm:text-[10px] font-semibold text-gray-400 uppercase">Tiền cọc cam kết:</p>
                                <p className="text-lg sm:text-xl font-black text-[#7c3aed]">
                                    {effectiveAmount?.toLocaleString()}đ
                                </p>
                                {isCourseOneActive && (
                                    <p className="text-[9px] font-bold text-green-600 italic">
                                        * Miễn phí (Đã có khóa 86 ngày)
                                    </p>
                                )}
                            </div>
                            <div className="space-y-1.5 sm:space-y-2 px-1">
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase leading-none mb-0.5">Ngân hàng</span>
                                        <span className="text-xs sm:text-sm font-bold text-gray-800 truncate">{payment?.bankName || course.bank_stk || 'N/A'}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase leading-none mb-0.5">Số tài khoản</span>
                                        <span className="text-xs sm:text-sm font-bold text-gray-800 select-all">{payment?.accountNumber || course.stk || 'N/A'}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase leading-none mb-0.5">Chủ tài khoản</span>
                                    <span className="text-xs sm:text-sm font-bold text-gray-800">{course.name_stk || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase leading-none shrink-0">Nội dung:</span>
                                    <span className="inline-block rounded bg-purple-50 px-2 py-0.5 text-xs sm:text-sm font-mono font-bold text-[#7c3aed] select-all border border-purple-100">
                                        {effectiveContent}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    {}
                    {enrollment?.payment && (
                        <div className="px-4 sm:px-6 pb-2">
                            <div className={`rounded-xl p-3 ${
                                isVerified ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
                            }`}>
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                    <div>
                                        <p className={`text-xs sm:text-sm font-bold ${isVerified ? 'text-green-700' : 'text-yellow-700'}`}>
                                            {isVerified ? '✓ Đã xác nhận' : '⏳ Chờ xác nhận'}
                                        </p>
                                        {!isVerified && (
                                            <p className="text-[10px] sm:text-xs text-yellow-600 mt-0.5">
                                                Chuyển khoản đúng nội dung hoặc upload biên lai
                                            </p>
                                        )}
                                    </div>
                                    {!isVerified && (
                                        <button
                                            onClick={handleUploadClick}
                                            disabled={uploading}
                                            className="w-full sm:w-auto px-3 py-1.5 bg-[#7c3aed] text-white rounded-lg text-xs font-bold hover:bg-[#6d28d9] transition-colors disabled:opacity-50"
                                        >
                                            {uploading ? '...' : '📤 Upload biên lai'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    {}
                    <div className="bg-orange-50 px-4 py-2 sm:px-6 sm:py-2 text-center shrink-0">
                        <p className="text-[10px] sm:text-xs font-medium text-orange-700 leading-tight">
                            🚀 Hệ thống sẽ tự động kích hoạt sau 10-15 phút khi nhận được chuyển khoản đúng nội dung.
                        </p>
                    </div>
                </div>
            </div>
        </div>
        {showUploadModal && enrollment && enrollment.id && (
            <UploadProofModal
                enrollmentId={enrollment.id}
                onClose={() => setShowUploadModal(false)}
                onSuccess={handleUploadSuccess}
            />
        )}
        {}
        {showFullQR && (
            <div
                className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
                onClick={() => setShowFullQR(false)}
            >
                <div className="relative w-full max-w-sm flex flex-col items-center" onClick={e => e.stopPropagation()}>
                    <div className="relative aspect-square w-full bg-white rounded-2xl p-4 shadow-2xl">
                        <Image
                            src={qrCodeUrl}
                            alt="QR Code Large"
                            fill
                            className="object-contain p-2"
                        />
                    </div>
                    <div className="mt-6 flex gap-4 w-full px-2">
                        <a
                            href={qrCodeUrl}
                            download={`QR_Payment_${course.id_khoa}.png`}
                            className="flex-1 bg-white text-black py-3 rounded-xl font-bold text-sm text-center shadow-lg active:scale-95 transition-transform"
                        >
                            📥 Tải ảnh
                        </a>
                        <button
                            onClick={() => setShowFullQR(false)}
                            className="flex-1 bg-white/20 text-white py-3 rounded-xl font-bold text-sm border border-white/30 backdrop-blur-md active:scale-95 transition-transform"
                        >
                            ✕ Đóng lại
                        </button>
                    </div>
                    <p className="mt-4 text-white/60 text-[10px] text-center px-4">
                        Sau khi tải ảnh, hãy mở ứng dụng Ngân hàng và quét mã QR từ thư viện ảnh của bạn.
                    </p>
                </div>
            </div>
        )}
        </>
    )
}
```

## File: components/home/CommunityBoard.tsx
```typescript
'use client'
import React, { useState, useEffect, useRef } from 'react'
import { getPostsAction } from '@/app/actions/post-actions'
import PostCard from './PostCard'
import PostDetailModal from './PostDetailModal'
import { Newspaper, Loader2, PlusCircle, ChevronLeft, ChevronRight, ArrowRightCircle, ArrowLeftCircle } from 'lucide-react'
import Link from 'next/link'
interface CommunityBoardProps {
    isAdmin: boolean
}
export default function CommunityBoard({ isAdmin }: CommunityBoardProps) {
    const [posts, setPosts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
    const [currentPage, setCurrentPage] = useState(0)
    const postsPerPage = 5
    const fetchPosts = async () => {
        setLoading(true)
        const res = await getPostsAction()
        if (res.success) {
            setPosts(res.posts || [])
        }
        setLoading(false)
    }
    useEffect(() => {
        fetchPosts()
    }, [])
    const totalPages = Math.ceil(posts.length / postsPerPage)
    const startIndex = currentPage * postsPerPage
    const currentVisiblePosts = posts.slice(startIndex, startIndex + postsPerPage)
    const hasNextPage = currentPage < totalPages - 1
    const hasPrevPage = currentPage > 0
    const nextGroup = () => { if (hasNextPage) setCurrentPage(prev => prev + 1) }
    const prevGroup = () => { if (hasPrevPage) setCurrentPage(prev => prev - 1) }
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                    <Newspaper className="w-6 h-6 text-purple-600" />
                    <div>
                        <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight leading-none">Bảng tin</h2>
                        <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Trang {currentPage + 1} / {totalPages || 1}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {}
                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200">
                        <button
                            onClick={prevGroup}
                            disabled={!hasPrevPage}
                            className="p-1.5 rounded-lg hover:bg-white disabled:opacity-20 transition-all active:scale-90"
                        >
                            <ChevronLeft className="w-4 h-4 text-gray-900" />
                        </button>
                        <button
                            onClick={nextGroup}
                            disabled={!hasNextPage}
                            className="p-1.5 rounded-lg hover:bg-white disabled:opacity-20 transition-all active:scale-90"
                        >
                            <ChevronRight className="w-4 h-4 text-gray-900" />
                        </button>
                    </div>
                    {isAdmin && (
                        <Link
                            href="/admin/posts"
                            className="bg-black text-yellow-400 p-2 rounded-xl hover:bg-zinc-800 transition-all shadow-lg active:scale-95"
                        >
                            <PlusCircle className="w-5 h-5" />
                        </Link>
                    )}
                </div>
            </div>
            {loading ? (
                <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Đang cập nhật tin mới...</p>
                </div>
            ) : posts.length === 0 ? (
                <div className="py-12 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100 text-gray-400 mx-2">
                    <p className="text-[10px] font-black uppercase tracking-widest">Hộp thư đang trống</p>
                </div>
            ) : (
                <div className="relative group">
                    {}
                    <div className="flex gap-4 overflow-x-auto pb-6 px-2 no-scrollbar scroll-smooth snap-x snap-mandatory">
                        {}
                        {hasPrevPage && (
                            <div className="flex-none w-[120px] snap-center flex flex-col items-center justify-center gap-3">
                                <button
                                    onClick={prevGroup}
                                    className="w-16 h-16 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center hover:bg-black hover:text-yellow-400 transition-all shadow-lg active:scale-90"
                                >
                                    <ArrowLeftCircle className="w-8 h-8" />
                                </button>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Quay lại</span>
                            </div>
                        )}
                        {currentVisiblePosts.map((post) => (
                            <div key={post.id} className="flex-none w-[85%] sm:w-[350px] snap-center">
                                <PostCard
                                    post={post}
                                    onClick={(p) => setSelectedPostId(p.id)}
                                />
                            </div>
                        ))}
                        {}
                        {hasNextPage && (
                            <div className="flex-none w-[150px] snap-center flex flex-col items-center justify-center gap-3">
                                <button
                                    onClick={nextGroup}
                                    className="w-16 h-16 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center hover:bg-purple-600 hover:text-white transition-all shadow-lg active:scale-90"
                                >
                                    <ArrowRightCircle className="w-8 h-8" />
                                </button>
                                <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Tiếp tục ({posts.length - (startIndex + postsPerPage)})</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {}
            {selectedPostId && (
                <PostDetailModal
                    postId={selectedPostId}
                    onClose={() => setSelectedPostId(null)}
                />
            )}
        </div>
    )
}
```

## File: components/home/CourseSection.tsx
```typescript
'use client'
import React, { useState, useEffect, useRef } from 'react'
import CourseCard from '@/components/course/CourseCard'
import { ChevronDown, ChevronUp, Clock } from 'lucide-react'
interface CourseSectionProps {
    title: string
    courses: any[]
    session: any
    enrollmentsMap: any
    isCourseOneActive: boolean
    userPhone: string | null
    userId: number | null
    darkMode?: boolean
    accentColor?: string
}
export default function CourseSection({
    title,
    courses,
    session,
    enrollmentsMap,
    isCourseOneActive,
    userPhone,
    userId,
    darkMode = false,
    accentColor = 'bg-blue-600'
}: CourseSectionProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [countdown, setCountdown] = useState(10)
    const timerRef = useRef<NodeJS.Timeout | null>(null)
    const intervalRef = useRef<NodeJS.Timeout | null>(null)
    const resetTimer = () => {
        if (timerRef.current) clearTimeout(timerRef.current)
        if (intervalRef.current) clearInterval(intervalRef.current)
        if (isExpanded) {
            setCountdown(10)
            intervalRef.current = setInterval(() => {
                setCountdown(prev => (prev > 0 ? prev - 1 : 0))
            }, 1000)
            timerRef.current = setTimeout(() => {
                setIsExpanded(false)
            }, 10000)
        }
    }
    useEffect(() => {
        if (isExpanded) {
            resetTimer()
            const handleActivity = () => resetTimer()
            window.addEventListener('scroll', handleActivity)
            window.addEventListener('touchmove', handleActivity)
            return () => {
                if (timerRef.current) clearTimeout(timerRef.current)
                if (intervalRef.current) clearInterval(intervalRef.current)
                window.removeEventListener('scroll', handleActivity)
                window.removeEventListener('touchmove', handleActivity)
            }
        }
    }, [isExpanded])
    const visibleCourses = isExpanded ? courses : courses.slice(0, 3)
    const hasMore = courses.length > 3
    return (
        <div className={`mb-12 rounded-3xl transition-all duration-500 ${darkMode ? '-mx-4 px-4 py-10 bg-zinc-950 shadow-2xl shadow-black/50' : ''}`}>
            {}
            {isExpanded && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 duration-300">
                    <div className="bg-black/90 backdrop-blur-md text-yellow-400 px-4 py-2 rounded-full border border-yellow-400/30 shadow-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ring-4 ring-black/10">
                        <Clock className="w-3 h-3 animate-pulse" />
                        <span>Tự động thu gọn sau <span className="text-white text-xs">{countdown}</span> giây</span>
                    </div>
                </div>
            )}
            <div className="mb-8 text-center">
                <h2 className={`text-2xl font-black uppercase tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {title}
                </h2>
                <div className={`mx-auto mt-2 h-1 w-12 rounded-full ${accentColor}`}></div>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {visibleCourses.map((course: any, index: number) => (
                    <div key={course.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${index * 50}ms` }}>
                        <CourseCard
                            course={course}
                            isLoggedIn={!!session}
                            enrollment={enrollmentsMap[course.id] || null}
                            isCourseOneActive={isCourseOneActive}
                            userPhone={userPhone}
                            userId={userId}
                            priority={index < 3}
                            darkMode={darkMode}
                        />
                    </div>
                ))}
            </div>
            {hasMore && (
                <div className="mt-10 flex justify-center">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={`group flex items-center gap-2 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg ${
                            darkMode
                            ? 'bg-white text-black hover:bg-yellow-400'
                            : 'bg-black text-white hover:bg-zinc-800'
                        }`}
                    >
                        {isExpanded ? (
                            <> Thu gọn <ChevronUp className="w-4 h-4" /> </>
                        ) : (
                            <> Xem thêm ({courses.length - 3}) <ChevronDown className="w-4 h-4 animate-bounce group-hover:animate-none" /> </>
                        )}
                    </button>
                </div>
            )}
        </div>
    )
}
```

## File: components/home/PostCard.tsx
```typescript
'use client'
import React from 'react'
import { MessageSquare, Clock, User as UserIcon } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
interface PostCardProps {
    post: any
    onClick: (post: any) => void
}
export default function PostCard({ post, onClick }: PostCardProps) {
    return (
        <div
            onClick={() => onClick(post)}
            className="bg-white rounded-3xl p-5 border border-gray-100 shadow-lg shadow-gray-100/50 space-y-4 cursor-pointer hover:shadow-xl transition-all active:scale-[0.98]"
        >
            {post.image && (
                <div className="aspect-video w-full rounded-2xl overflow-hidden bg-gray-100">
                    <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
                </div>
            )}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] font-black text-purple-600 uppercase tracking-widest">
                        <UserIcon className="w-3 h-3" />
                        <span>{post.author?.name || 'Admin'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold uppercase">
                        <Clock className="w-3 h-3" />
                        <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: vi })}</span>
                    </div>
                </div>
                <h3 className="font-black text-gray-900 text-lg leading-tight line-clamp-2 uppercase tracking-tight">
                    {post.title}
                </h3>
                <p className="text-gray-500 text-sm line-clamp-3 leading-relaxed">
                    {post.content}
                </p>
            </div>
            <div className="pt-4 border-t border-gray-50 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
                <div className="flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                    <span>{post._count?.comments || 0} bình luận</span>
                </div>
                <span className="text-purple-600">Xem chi tiết →</span>
            </div>
        </div>
    )
}
```

## File: components/home/PostDetailModal.tsx
```typescript
'use client'
import React, { useState, useEffect } from 'react'
import { X, Send, User as UserIcon, Clock, MessageCircle, Loader2 } from 'lucide-react'
import { getPostDetailAction, commentOnPostAction } from '@/app/actions/post-actions'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
interface PostDetailModalProps {
    postId: string
    onClose: () => void
}
export default function PostDetailModal({ postId, onClose }: PostDetailModalProps) {
    const [post, setPost] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [comment, setComment] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const fetchDetail = async () => {
        setLoading(true)
        const res = await getPostDetailAction(postId)
        if (res.success) {
            setPost(res.post)
        }
        setLoading(false)
    }
    useEffect(() => {
        fetchDetail()
    }, [postId])
    const handleComment = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!comment.trim() || submitting) return
        setSubmitting(true)
        const res = await commentOnPostAction(postId, comment)
        if (res.success) {
            setComment('')
            fetchDetail() // Refresh comments
        } else {
            alert(res.error)
        }
        setSubmitting(false)
    }
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-black p-5 text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-yellow-400 flex items-center justify-center text-black font-black">
                            BRK
                        </div>
                        <div>
                            <h3 className="font-black text-xs uppercase tracking-widest text-yellow-400">Bảng tin cộng đồng</h3>
                            <p className="text-[9px] opacity-60 font-bold uppercase">Chi tiết bài viết & thảo luận</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-6 h-6" /></button>
                </div>
                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                        <p className="text-[10px] font-black uppercase">Đang tải bài viết...</p>
                    </div>
                ) : post ? (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Post Content */}
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-xs">
                                            {post.author?.name?.charAt(0) || 'A'}
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-gray-900">{post.author?.name || 'Admin'}</p>
                                            <p className="text-[9px] text-gray-400 font-bold uppercase">
                                                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: vi })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <h2 className="text-2xl font-black text-gray-900 leading-tight uppercase tracking-tight">
                                    {post.title}
                                </h2>
                                {post.image && (
                                    <div className="rounded-3xl overflow-hidden border border-gray-100">
                                        <img src={post.image} alt={post.title} className="w-full h-auto" />
                                    </div>
                                )}
                                <div className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                                    {post.content}
                                </div>
                            </div>
                            {}
                            <div className="pt-10 space-y-6 border-t border-gray-100">
                                <div className="flex items-center gap-2">
                                    <MessageCircle className="w-5 h-5 text-blue-500" />
                                    <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">
                                        Thảo luận ({post.comments?.length || 0})
                                    </h4>
                                </div>
                                <div className="space-y-4">
                                    {post.comments?.map((c: any) => (
                                        <div key={c.id} className="flex gap-3 animate-in fade-in slide-in-from-left-2">
                                            <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-[10px] font-black shrink-0">
                                                {c.user?.name?.charAt(0) || '?'}
                                            </div>
                                            <div className="bg-gray-50 p-3 rounded-2xl rounded-tl-none flex-1">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-[10px] font-black text-gray-900">{c.user?.name}</span>
                                                    <span className="text-[8px] text-gray-400 font-bold uppercase">
                                                        {formatDistanceToNow(new Date(c.createdAt), { locale: vi })}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-600 leading-relaxed font-medium">{c.content}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {post.comments?.length === 0 && (
                                        <p className="text-center py-4 text-gray-400 text-[10px] font-black uppercase tracking-tighter">
                                            Chưa có thảo luận nào. Hãy là người đầu tiên!
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                        {}
                        <div className="p-4 bg-gray-50 border-t border-gray-100 shrink-0">
                            <form onSubmit={handleComment} className="flex gap-2 bg-white p-1 rounded-2xl border border-gray-200 shadow-sm focus-within:ring-2 focus-within:ring-purple-500 transition-all">
                                <input
                                    type="text"
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="Viết cảm nghĩ của bạn..."
                                    className="flex-1 bg-transparent px-4 py-2 text-xs font-bold outline-none"
                                />
                                <button
                                    type="submit"
                                    disabled={!comment.trim() || submitting}
                                    className="w-10 h-10 bg-black text-yellow-400 rounded-xl flex items-center justify-center hover:bg-zinc-800 active:scale-90 transition-all disabled:opacity-30"
                                >
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                </button>
                            </form>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400 uppercase text-[10px] font-black">
                        Không tìm thấy nội dung
                    </div>
                )}
            </div>
        </div>
    )
}
```

## File: components/ImageViewer.tsx
```typescript
"use client"
import { useEffect, useRef, useState } from "react"
export default function ImageViewer() {
  const [src, setSrc] = useState<string | null>(null)
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const dragging = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })
  const imgRef = useRef<HTMLImageElement | null>(null)
  useEffect(() => {
    const handleClick = (e: any) => {
      const img = e.target.closest(".prose img")
      if (!img) return
      setSrc(img.src)
      setScale(1)
      setPosition({ x: 0, y: 0 })
    }
    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
  }, [])
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSrc(null)
    }
    if (src) document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [src])
  if (!src) return null
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    setScale((prev) =>
      e.deltaY < 0 ? Math.min(prev + 0.15, 6) : Math.max(prev - 0.15, 1)
    )
  }
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return
    dragging.current = true
    lastPos.current = { x: e.clientX, y: e.clientY }
  }
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - lastPos.current.x
    const dy = e.clientY - lastPos.current.y
    setPosition((prev) => ({
      x: prev.x + dx,
      y: prev.y + dy,
    }))
    lastPos.current = { x: e.clientX, y: e.clientY }
  }
  const handleMouseUp = () => {
    dragging.current = false
  }
  const handleDoubleClick = () => {
    if (scale === 1) {
      setScale(2)
    } else {
      setScale(1)
      setPosition({ x: 0, y: 0 })
    }
  }
  return (
    <div
      className="fixed inset-0 z-[999] bg-black/95 flex items-center justify-center"
      onClick={() => setSrc(null)}
    >
      <div
        className="relative w-full h-full flex items-center justify-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onWheel={handleWheel}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img
          ref={imgRef}
          src={src}
          alt=""
          draggable={false}
          className="select-none max-w-[90vw] max-h-[90vh] object-contain"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: dragging.current ? "none" : "transform 0.2s ease",
            cursor: scale > 1 ? "grab" : "zoom-in",
          }}
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
        />
        <div className="absolute top-5 right-5 flex gap-2">
          <button
            onClick={() => setScale((s) => Math.min(s + 0.3, 6))}
            className="bg-white text-black px-3 py-1 rounded shadow"
          >
            +
          </button>
          <button
            onClick={() => {
              setScale(1)
              setPosition({ x: 0, y: 0 })
            }}
            className="bg-white text-black px-3 py-1 rounded shadow"
          >
            Reset
          </button>
          <button
            onClick={() => setSrc(null)}
            className="bg-white text-black px-3 py-1 rounded shadow"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}
```

## File: components/payment/UploadProofModal.tsx
```typescript
'use client'
import { useState, useRef } from 'react'
import { updatePaymentProof } from '@/app/actions/payment-actions'
interface UploadProofModalProps {
    enrollmentId: number
    onClose: () => void
    onSuccess: () => void
}
export default function UploadProofModal({ enrollmentId, onClose, onSuccess }: UploadProofModalProps) {
    const [uploading, setUploading] = useState(false)
    const [preview, setPreview] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onload = () => setPreview(reader.result as string)
            reader.readAsDataURL(file)
        }
    }
    const handleUpload = async () => {
        const file = fileInputRef.current?.files?.[0]
        if (!file) return
        setUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            const response = await fetch('/api/upload/payment', {
                method: 'POST',
                body: formData
            })
            if (!response.ok) {
                throw new Error('Upload failed')
            }
            const { url } = await response.json()
            const result = await updatePaymentProof(enrollmentId, url)
            if (result.success) {
                onSuccess()
                onClose()
            } else {
                alert('Cập nhật thất bại: ' + result.error)
            }
        } catch (error) {
            console.error('Upload error:', error)
            alert('Upload thất bại. Vui lòng thử lại.')
        } finally {
            setUploading(false)
        }
    }
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                <h3 className="text-xl font-bold mb-4">Upload biên lai chuyển khoản</h3>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Chọn ảnh biên lai
                    </label>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="w-full border rounded-lg p-2"
                    />
                </div>
                {preview && (
                    <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-2">Preview:</p>
                        <div className="relative w-full h-48 border rounded-lg overflow-hidden">
                            <img src={preview} alt="Preview" className="object-contain w-full h-full" />
                        </div>
                    </div>
                )}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border rounded-lg font-medium hover:bg-gray-50"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={!preview || uploading}
                        className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50"
                    >
                        {uploading ? 'Đang tải...' : 'Xác nhận'}
                    </button>
                </div>
            </div>
        </div>
    )
}
```

## File: components/course/LessonSidebar.tsx
```typescript
'use client'
import { useState } from 'react'
import { cn } from "@/lib/utils"
import { CheckCircle2, PlayCircle, Lock, CalendarDays, RefreshCw } from "lucide-react"
interface Lesson {
    id: string
    title: string
    order: number
}
interface LessonSidebarProps {
    lessons: Lesson[]
    currentLessonId: string
    onLessonSelect: (lessonId: string) => void
    progress: Record<string, any>
    startedAt: Date | null
    resetAt: Date | null
    onResetStartDate: (date: Date) => Promise<void>
}
function formatDateVN(date: Date | null) {
    if (!date) return ''
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function toInputValue(date: Date | null): string {
    if (!date) return ''
    const d = new Date(date)
    return d.toISOString().slice(0, 10)
}
function isLessonUnlocked(lesson: Lesson, lessons: Lesson[], progress: Record<string, any>) {
    if (lesson.order === 1) return true
    const prev = lessons.find(l => l.order === lesson.order - 1)
    if (!prev) return true
    const p = progress[prev.id]
    return p?.status === 'COMPLETED' && (p?.totalScore ?? 0) >= 5
}
export default function LessonSidebar({
    lessons, currentLessonId, onLessonSelect, progress, startedAt, resetAt, onResetStartDate
}: LessonSidebarProps) {
    const [showDatePicker, setShowDatePicker] = useState(false)
    const [dateInput, setDateInput] = useState(toInputValue(startedAt))
    const [saving, setSaving] = useState(false)
    const filteredProgress = Object.entries(progress).reduce((acc, [lessonId, p]: [string, any]) => {
        if (p.status !== 'RESET') {
            acc[lessonId] = p
        }
        return acc
    }, {} as Record<string, any>)
    const handleReset = async () => {
        if (!dateInput) return
        const confirmReset = window.confirm(
            "⚠️ Cảnh báo: Dữ liệu học tập cũ sẽ không được tính vào lộ trình mới.\n\n" +
            "Bạn sẽ bắt đầu lại từ bài 1. Tiến trình cũ vẫn lưu trong hệ thống để admin xem lại.\n\n" +
            "Nhấn OK để xác nhận đổi ngày bắt đầu mới."
        )
        if (!confirmReset) return
        setSaving(true)
        try {
            await onResetStartDate(new Date(dateInput))
            setShowDatePicker(false)
        } finally {
            setSaving(false)
        }
    }
    return (
        <div className="flex flex-col h-full bg-zinc-900 border-r border-zinc-800 w-80 shrink-0">
            {}
            <div className="p-4 border-b border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-zinc-300">
                        <CalendarDays className="w-4 h-4 text-orange-400 shrink-0" />
                        <div>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Ngày bắt đầu lộ trình</p>
                            <p className="text-sm font-semibold text-white leading-tight">
                                {startedAt ? formatDateVN(startedAt) : '-- / -- / ----'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        className="flex items-center gap-1 text-[11px] text-orange-400 border border-orange-500/40 hover:border-orange-400 rounded-lg px-2 py-1 transition-colors"
                    >
                        <RefreshCw className="w-3 h-3" />
                        Đặt lại
                    </button>
                </div>
                {showDatePicker && (
                    <div className="bg-zinc-800 rounded-lg p-3 space-y-2 border border-zinc-700">
                        <p className="text-[10px] text-zinc-400">Chọn ngày mới (dd/mm/yyyy):</p>
                        <input
                            type="date"
                            value={dateInput}
                            onChange={e => setDateInput(e.target.value)}
                            className="w-full bg-zinc-700 text-white text-sm rounded-lg px-3 py-2 border border-zinc-600 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleReset}
                                disabled={!dateInput || saving}
                                className="flex-1 text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-1.5 disabled:opacity-50 transition-colors"
                            >
                                {saving ? 'Đang lưu...' : 'Xác nhận'}
                            </button>
                            <button
                                onClick={() => setShowDatePicker(false)}
                                className="flex-1 text-xs text-zinc-400 hover:text-white border border-zinc-600 rounded-lg py-1.5 transition-colors"
                            >
                                Hủy
                            </button>
                        </div>
                    </div>
                )}
            </div>
            {}
            <div className="px-4 py-2 border-b border-zinc-800">
                <h2 className="font-bold text-sm text-zinc-400 uppercase tracking-wide">Nội dung khóa học</h2>
            </div>
            {}
            <div className="flex-1 overflow-y-auto">
                {lessons.map((lesson) => {
                    const prog = filteredProgress[lesson.id]
                    const isCompleted = prog?.status === 'COMPLETED'
                    const isActive = currentLessonId === lesson.id
                    const unlocked = isLessonUnlocked(lesson, lessons, filteredProgress)
                    return (
                        <button
                            key={lesson.id}
                            onClick={() => unlocked && onLessonSelect(lesson.id)}
                            disabled={!unlocked}
                            title={!unlocked ? 'Hoàn thành bài trước ≥5đ để mở khóa' : undefined}
                            className={cn(
                                "w-full flex items-center gap-3 p-4 text-left transition-colors border-b border-zinc-800/50",
                                isActive && "bg-zinc-800 border-l-2 border-l-orange-500",
                                unlocked && !isActive && "hover:bg-zinc-800/50",
                                !unlocked && "opacity-40 cursor-not-allowed"
                            )}
                        >
                            <div className="shrink-0">
                                {isCompleted ? (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                ) : isActive ? (
                                    <PlayCircle className="w-5 h-5 text-orange-400" />
                                ) : !unlocked ? (
                                    <Lock className="w-4 h-4 text-zinc-600" />
                                ) : (
                                    <div className="w-5 h-5 rounded-full border-2 border-zinc-700 flex items-center justify-center text-[10px] text-zinc-500">
                                        {lesson.order}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={cn("text-sm font-medium line-clamp-2", isActive ? "text-white" : "text-zinc-400")}>
                                    {lesson.title}
                                </p>
                                {prog?.totalScore !== undefined && (
                                    <span className={cn("text-[10px] font-bold", prog.totalScore >= 5 ? "text-emerald-500" : "text-orange-400")}>
                                        {prog.totalScore >= 5 ? '✓' : '✗'} {prog.totalScore}/10đ
                                    </span>
                                )}
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
```

## File: components/course/StartDateModal.tsx
```typescript
'use client'
import { useState, useMemo } from 'react'
import {
  format,
  isBefore,
  isAfter,
  startOfDay,
  addDays,
  differenceInDays
} from 'date-fns'
import { vi } from 'date-fns/locale'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CalendarDays, Loader2 } from "lucide-react"
interface StartDateModalProps {
  isOpen: boolean
  onConfirm: (date: Date) => Promise<void>
}
export default function StartDateModal({
  isOpen,
  onConfirm
}: StartDateModalProps) {
  const today = startOfDay(new Date())
  const maxSelectableDate = addDays(today, 90)
  const courseDuration = 60
  const [selectedDate, setSelectedDate] = useState<Date>(today)
  const [loading, setLoading] = useState(false)
  const deadline = useMemo(() => {
    return addDays(selectedDate, courseDuration)
  }, [selectedDate])
  const daysRemaining = useMemo(() => {
    return differenceInDays(deadline, today)
  }, [deadline, today])
  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm(selectedDate)
    } catch (error: any) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }
  return (
    <Dialog open={isOpen}>
      <DialogContent className="max-w-[92vw] sm:max-w-[380px] w-full bg-zinc-900 border-zinc-800 text-white p-4 gap-4 overflow-hidden rounded-xl">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-sky-400">
            <CalendarDays className="w-5 h-5" />
            Xác nhận ngày bắt đầu học
          </DialogTitle>
          <p className="text-xs text-zinc-400 leading-tight">
            Hệ thống sẽ tính Deadline dựa trên ngày này (trong 90 ngày tới).
          </p>
        </DialogHeader>
        <div className="space-y-3">
          {}
          <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2">
            <span className="text-xs uppercase font-bold text-zinc-500">Ngày bạn chọn:</span>
            <span className="text-sm font-bold text-sky-400">
              {format(selectedDate, 'dd/MM/yyyy', { locale: vi })}
            </span>
          </div>
          {}
          <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg flex justify-center p-1">
            <DayPicker
              mode="single"
              selected={selectedDate}
              locale={vi}
              onSelect={(date) => {
                if (date && !isBefore(date, today) && !isAfter(date, maxSelectableDate)) {
                  setSelectedDate(date)
                }
              }}
              disabled={(date) => isBefore(date, today) || isAfter(date, maxSelectableDate)}
              classNames={{
                months: "flex flex-col",
                month: "space-y-1",
                caption: "flex justify-center pt-1 relative items-center px-6 mb-1",
                caption_label: "text-xs font-bold text-zinc-200",
                nav: "flex items-center",
                nav_button: "h-6 w-6 bg-transparent p-0 opacity-50 hover:opacity-100",
                nav_button_previous: "absolute left-0",
                nav_button_next: "absolute right-0",
                table: "w-full border-collapse",
                head_row: "flex",
                head_cell: "text-zinc-500 w-7 sm:w-8 font-normal text-[0.65rem] uppercase",
                row: "flex w-full mt-0.5",
                cell: "relative p-0 text-center text-xs focus-within:relative focus-within:z-20",
                day: "h-7 w-7 sm:h-8 sm:w-8 p-0 font-normal hover:bg-zinc-800 rounded transition-colors text-xs",
                day_selected: "bg-sky-600 text-white hover:bg-sky-500 font-bold !opacity-100",
                day_today: "text-sky-400 font-bold underline underline-offset-4",
                day_outside: "text-zinc-700 opacity-30",
                day_disabled: "text-zinc-800 opacity-10",
                day_hidden: "invisible",
              }}
            />
          </div>
          {}
          <div className="grid grid-cols-2 gap-3 bg-sky-500/5 border border-sky-500/10 rounded-lg p-3 text-xs">
            <div className="flex flex-col gap-1">
              <span className="text-zinc-500">Deadline dự kiến:</span>
              <span className="font-bold text-zinc-100">
                {format(deadline, 'dd/MM/yyyy', { locale: vi })}
              </span>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-zinc-500">Thời lượng:</span>
              <span className="font-bold text-sky-500">
                {courseDuration} ngày ({daysRemaining} ngày còn lại)
              </span>
            </div>
          </div>
        </div>
        <DialogFooter className="mt-2">
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className="w-full bg-sky-600 hover:bg-sky-500 text-white h-11 text-sm font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "XÁC NHẬN BẮT ĐẦU"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

## File: components/layout/Header.tsx
```typescript
'use client'
import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { signOut } from 'next-auth/react'
import { User, Settings, LogOut, ChevronDown } from 'lucide-react'
export default function Header({ session, userImage }: { session: any, userImage?: string | null }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
    const userMenuRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setIsUserMenuOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])
    const userInitials = session?.user?.name
        ? session.user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
        : '?'
    return (
        <header className="fixed top-0 z-50 w-full bg-black text-white shadow-xl border-b border-white/5">
            <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:px-8">
                {/* Logo & Brand */}
                <Link href="/" className="shrink-0 transition-opacity hover:opacity-80">
                    <Image
                        src="/logobrk-50px.png"
                        alt="Học Viện BRK Logo"
                        width={150}
                        height={50}
                        priority
                        className="object-contain"
                        style={{ height: '48px', width: 'auto' }}
                    />
                </Link>
                {}
                <nav className="hidden flex-1 items-center justify-center gap-12 text-[13px] font-black md:flex">
                    <Link href="/" className="transition-all hover:text-yellow-400 hover:scale-105 tracking-widest">TRANG CHỦ</Link>
                    <Link href="#khoa-hoc" className="transition-all hover:text-yellow-400 hover:scale-105 tracking-widest">KHÓA HỌC</Link>
                    <Link href="#" className="transition-all hover:text-yellow-400 hover:scale-105 tracking-widest">GIỚI THIỆU</Link>
                </nav>
                {}
                <div className="flex items-center gap-2 sm:gap-6">
                    {session ? (
                        <div className="relative" ref={userMenuRef}>
                            <button
                                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                className="flex items-center gap-1.5 rounded-full bg-zinc-800 px-2 py-1.5 transition-all hover:bg-zinc-700"
                            >
                                {userImage || session?.user?.image ? (
                                    <img
                                        src={userImage || session?.user?.image}
                                        alt="Avatar"
                                        className="h-7 w-7 rounded-full object-cover border-2 border-yellow-400"
                                    />
                                ) : (
                                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-yellow-400 text-xs font-black text-black">
                                        {userInitials}
                                    </div>
                                )}
                                <ChevronDown className={`h-3 w-3 text-zinc-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {}
                            {isUserMenuOpen && (
                                <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-zinc-700 bg-zinc-900 py-2 shadow-xl animate-in fade-in slide-in-from-top-2">
                                    <div className="border-b border-zinc-800 px-4 py-2 mb-1">
                                        <p className="text-xs font-bold text-white truncate">{session.user?.name}</p>
                                        <p className="text-[10px] text-zinc-500 truncate">{session.user?.email}</p>
                                    </div>
                                    {session.user?.role === 'ADMIN' && (
                                        <Link
                                            href="/admin/students"
                                            onClick={() => setIsUserMenuOpen(false)}
                                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-yellow-400 hover:bg-zinc-800 transition-colors font-bold"
                                        >
                                            <Settings className="h-4 w-4" />
                                            Quản trị hệ thống
                                        </Link>
                                    )}
                                    <Link
                                        href="/account-settings"
                                        onClick={() => setIsUserMenuOpen(false)}
                                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                                    >
                                        <Settings className="h-4 w-4" />
                                        Cài đặt tài khoản
                                    </Link>
                                    <button
                                        onClick={() => signOut()}
                                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-zinc-800 transition-colors"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        Đăng xuất
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Link
                            href="/login"
                            className="hidden sm:inline-block rounded-full bg-white px-6 py-2 text-xs font-black text-black shadow-md transition-all hover:bg-yellow-400 hover:scale-105"
                        >
                            ĐĂNG NHẬP
                        </Link>
                    )}
                    {}
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-white transition-all hover:bg-white/10 md:hidden"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="h-6 w-6">
                            {isMenuOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                            )}
                        </svg>
                    </button>
                </div>
            </div>
            {}
            {isMenuOpen && (
                <div className="animate-in slide-in-from-top-4 absolute left-0 top-16 w-full border-b border-white/5 bg-black px-4 py-8 shadow-2xl md:hidden">
                    <nav className="flex flex-col gap-6 text-center text-sm font-black">
                        <Link href="/" onClick={() => setIsMenuOpen(false)} className="py-2 hover:text-yellow-400 hover:scale-105 transition-all">TRANG CHỦ</Link>
                        <Link href="#khoa-hoc" onClick={() => setIsMenuOpen(false)} className="py-2 hover:text-yellow-400 hover:scale-105 transition-all">KHÓA HỌC</Link>
                        <Link href="#" onClick={() => setIsMenuOpen(false)} className="py-2 hover:text-yellow-400 hover:scale-105 transition-all">GIỚI THIỆU</Link>
                        {!session ? (
                            <Link href="/login" onClick={() => setIsMenuOpen(false)} className="mt-4 rounded-xl bg-white py-4 text-black shadow-lg">ĐĂNG NHẬP</Link>
                        ) : (
                            <button
                                onClick={() => signOut()}
                                className="mt-4 rounded-xl bg-red-600 py-4 text-white shadow-lg"
                            >
                                ĐĂNG XUẤT
                            </button>
                        )}
                    </nav>
                </div>
            )}
        </header>
    )
}
```

## File: app/courses/[id]/learn/page.tsx
```typescript
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { redirect } from "next/navigation"
import CoursePlayer from "@/components/course/CoursePlayer"
export const dynamic = "force-dynamic";
export default async function CourseLearnPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const userId = Number(session.user.id)
  const course = await prisma.course.findUnique({
    where: { id_khoa: id },
    select: { id: true },
  })
  if (!course) redirect(`/courses/${id}`)
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId: course.id,
      },
    },
    select: {
      id: true,
      status: true,
      startedAt: true,
      resetAt: true,
      lastLessonId: true,
      course: {
        select: {
          id: true,
          id_khoa: true,
          name_lop: true,
          lessons: {
            select: {
              id: true,
              title: true,
              order: true,
              videoUrl: true,
              isDailyChallenge: true,
            },
            orderBy: { order: "asc" },
          },
        },
      },
      lessonProgress: {
        where: {
          status: { not: "RESET" },
        },
        select: {
          lessonId: true,
          status: true,
          totalScore: true,
          maxTime: true,
          duration: true,
          submittedAt: true,
          assignment: true,
          scores: true,
        },
      },
    },
  })
  if (!enrollment || enrollment.status !== "ACTIVE") {
    redirect(`/courses/${id}`)
  }
  return (
    <div className="h-screen h-dvh bg-black overflow-hidden flex flex-col">
      <CoursePlayer
        course={enrollment.course}
        enrollment={enrollment}
        session={session}
      />
    </div>
  )
}
```

## File: components/admin/roadmap/CustomNodes.tsx
```typescript
import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
export const QuestionNode = memo(({ data }: any) => {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-orange-50 border-2 border-orange-500 min-w-[220px] relative">
      <div className="flex items-start text-black">
        <div className="rounded-full w-8 h-8 flex items-center justify-center bg-orange-500 text-white mr-2 text-xs shrink-0 mt-1">❓</div>
        <div className="ml-2">
          <div className="text-[10px] font-bold text-orange-500 uppercase">Câu hỏi chính</div>
          <div className="text-sm font-bold leading-tight">{data.label || 'Chưa có nội dung'}</div>
          {data.description && <div className="text-[9px] text-gray-500 mt-1 italic leading-tight border-t border-orange-200 pt-1">{data.description}</div>}
        </div>
      </div>
      <Handle type="target" position={Position.Top} id="t" className="w-2.5 h-2.5 bg-orange-500 border-white border-2" />
      <Handle type="source" position={Position.Bottom} id="b" className="w-2.5 h-2.5 bg-orange-500 border-white border-2" />
      <Handle type="source" position={Position.Left} id="l" className="w-2.5 h-2.5 bg-orange-500 border-white border-2" />
      <Handle type="source" position={Position.Right} id="r" className="w-2.5 h-2.5 bg-orange-500 border-white border-2" />
    </div>
  );
});
export const OptionNode = memo(({ data }: any) => {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-gray-50 border-2 border-gray-400 min-w-[150px] relative">
      <div className="flex items-center text-black">
        <div className="text-sm font-medium">{data.label || 'Nhập đáp án...'}</div>
      </div>
      <Handle type="target" position={Position.Top} id="t" className="w-2.5 h-2.5 bg-gray-400 border-white border-2" />
      <Handle type="source" position={Position.Bottom} id="b" className="w-2.5 h-2.5 bg-gray-400 border-white border-2" />
      <Handle type="source" position={Position.Left} id="l" className="w-2.5 h-2.5 bg-gray-400 border-white border-2" />
      <Handle type="source" position={Position.Right} id="r" className="w-2.5 h-2.5 bg-gray-400 border-white border-2" />
    </div>
  );
});
export const CourseNode = memo(({ data }: any) => {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-purple-50 border-2 border-purple-600 min-w-[200px] relative">
      <div className="flex items-center text-black">
        <div className="rounded-full w-8 h-8 flex items-center justify-center bg-purple-600 text-white mr-2 text-xs shrink-0">🎓</div>
        <div className="ml-2">
          <div className="text-[10px] font-bold text-purple-600 uppercase">Khóa học cấp ra</div>
          <div className="text-sm font-bold">{data.courseName || 'Chọn khóa học...'}</div>
        </div>
      </div>
      <Handle type="target" position={Position.Top} id="t" className="w-2.5 h-2.5 bg-purple-600 border-white border-2" />
      <Handle type="source" position={Position.Bottom} id="b" className="w-2.5 h-2.5 bg-purple-600 border-white border-2" />
      <Handle type="target" position={Position.Left} id="l" className="w-2.5 h-2.5 bg-purple-600 border-white border-2" />
      <Handle type="target" position={Position.Right} id="r" className="w-2.5 h-2.5 bg-purple-600 border-white border-2" />
    </div>
  );
});
export const AdviceNode = memo(({ data }: any) => {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-blue-50 border-2 border-blue-500 min-w-[200px] relative text-black">
      <div className="flex items-center">
        <div className="rounded-full w-8 h-8 flex items-center justify-center bg-blue-500 text-white mr-2 text-xs shrink-0">💡</div>
        <div className="ml-2">
          <div className="text-[10px] font-bold text-blue-500 uppercase">Video tư vấn</div>
          <div className="text-sm font-bold truncate max-w-[150px]">{data.label || 'Dán link video...'}</div>
        </div>
      </div>
      <Handle type="target" position={Position.Top} id="t" className="w-2.5 h-2.5 bg-blue-500 border-white border-2" />
      <Handle type="source" position={Position.Bottom} id="b" className="w-2.5 h-2.5 bg-blue-500 border-white border-2" />
      <Handle type="target" position={Position.Left} id="l" className="w-2.5 h-2.5 bg-blue-500 border-white border-2" />
      <Handle type="target" position={Position.Right} id="r" className="w-2.5 h-2.5 bg-blue-500 border-white border-2" />
    </div>
  );
});
export const FinishNode = memo(({ data }: any) => {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-emerald-50 border-2 border-emerald-500 min-w-[180px] relative text-black">
      <div className="flex items-center">
        <div className="rounded-full w-8 h-8 flex items-center justify-center bg-emerald-500 text-white mr-2 text-xs shrink-0">🏁</div>
        <div className="ml-2">
          <div className="text-[10px] font-bold text-emerald-500 uppercase">Đích đến</div>
          <div className="text-sm font-bold">{data.label || 'Chốt mục tiêu'}</div>
        </div>
      </div>
      <Handle type="target" position={Position.Top} id="t" className="w-2.5 h-2.5 bg-emerald-500 border-white border-2" />
      <Handle type="target" position={Position.Bottom} id="b" className="w-2.5 h-2.5 bg-emerald-500 border-white border-2" />
      <Handle type="target" position={Position.Left} id="l" className="w-2.5 h-2.5 bg-emerald-500 border-white border-2" />
      <Handle type="target" position={Position.Right} id="r" className="w-2.5 h-2.5 bg-emerald-500 border-white border-2" />
    </div>
  );
});
QuestionNode.displayName = 'QuestionNode';
OptionNode.displayName = 'OptionNode';
CourseNode.displayName = 'CourseNode';
AdviceNode.displayName = 'AdviceNode';
FinishNode.displayName = 'FinishNode';
```

## File: components/home/RealityMap.tsx
```typescript
'use client'
import React, { useState, useMemo, useEffect, useRef } from 'react'
import { Flag, Lock, CheckCircle2, ChevronRight, Play, Info, Sparkles, Trophy, Target, ArrowRight, X, PlayCircle, BookOpen, RefreshCw, Loader2 } from 'lucide-react'
import Link from 'next/link'
interface RealityMapProps {
    customPath: number[]
    enrollmentsMap: Record<number, any>
    allCourses: any[]
    userGoal: string
    onReset?: () => Promise<any>
}
function CourseDetailModal({ course, enrollment, onClose }: { course: any, enrollment: any, onClose: () => void }) {
    const isActive = enrollment?.status === 'ACTIVE'
    const isCompleted = enrollment?.status === 'COMPLETED'
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-zinc-900 w-full max-w-sm rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                <div className="h-32 bg-gradient-to-br from-purple-600 to-indigo-800 relative flex items-center justify-center">
                    <BookOpen className="w-12 h-12 text-white/20" />
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full transition-colors text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-8 space-y-6">
                    <div className="space-y-2 text-white">
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${isActive || isCompleted ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                {isCompleted ? 'Hoàn thành' : isActive ? 'Đã kích hoạt' : 'Chưa sở hữu'}
                            </span>
                        </div>
                        <h3 className="text-xl font-black uppercase tracking-tight leading-tight">{course.name_lop}</h3>
                        <p className="text-gray-400 text-sm font-medium line-clamp-3">{course.mo_ta_ngan || 'Khám phá những kiến thức thực chiến cùng Học viện BRK.'}</p>
                    </div>
                    {isActive || isCompleted ? (
                        <Link href={`/courses/${course.id_khoa}/learn`} className="w-full bg-yellow-400 text-black py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-yellow-500 transition-all active:scale-95 shadow-lg shadow-yellow-400/10">
                            <PlayCircle className="w-5 h-5" /> Vào học ngay
                        </Link>
                    ) : (
                        <Link href={`/#khoa-hoc`} onClick={onClose} className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-200 transition-all active:scale-95">
                            Tìm hiểu thêm
                        </Link>
                    )}
                </div>
            </div>
        </div>
    )
}
export default function RealityMap({ customPath, enrollmentsMap, allCourses, userGoal, onReset }: RealityMapProps) {
    const [activeStage, setActiveStage] = useState<number | null>(null)
    const [selectedCourse, setSelectedCourse] = useState<any>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const stages = useMemo(() => {
        const goal = userGoal?.toLowerCase() || '';
        const allPossibleStages = [
            { id: 1, name: 'Xác định mục tiêu', icon: '🎯', courseIds: [1] },
            { id: 2, name: 'Nền tảng cơ bản', icon: '🧱', courseIds: [2] },
            { id: 3, name: 'Bán hàng đơn giản', icon: '🛒', courseIds: [4, 5] },
            { id: 4, name: 'Bán trải nghiệm', icon: '🌟', courseIds: [3] },
            { id: 5, name: 'Nhân hiệu chuyên gia', icon: '🦸', courseIds: [6] },
            { id: 6, name: 'Nhà đào tạo', icon: '🎓', courseIds: [7] },
            { id: 7, name: 'Xây dựng cộng đồng', icon: '🌐', courseIds: [8] },
            { id: 8, name: 'Giàu toàn diện', icon: '💎', courseIds: [9] }
        ];
        if (goal.includes('bán hàng') && !goal.includes('nâng cao')) return allPossibleStages.slice(0, 3);
        if (goal.includes('nhân hiệu')) return allPossibleStages.slice(0, 5);
        return allPossibleStages;
    }, [userGoal]);
    const highlightedIds = useMemo(() => {
        if (!activeStage) return []
        return stages.find(s => s.id === activeStage)?.courseIds || []
    }, [activeStage, stages])
    return (
        <div className="space-y-12 animate-in fade-in duration-700" ref={containerRef}>
            {}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-yellow-400 flex items-center justify-center text-black shadow-lg shadow-yellow-400/20">
                            <Target className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Mục tiêu hiện tại</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black text-black uppercase tracking-tight italic leading-none">{userGoal || 'Lộ trình phát triển'}</h2>
                </div>
                {onReset && (
                    <button onClick={() => { if(confirm('Làm lại khảo sát sẽ xóa lộ trình hiện tại?')) onReset() }} className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition-colors border-b border-transparent hover:border-red-500 pb-1">
                        🔄 Thiết lập lại mục tiêu
                    </button>
                )}
            </div>
            {}
            <div className="bg-zinc-950 rounded-[3rem] p-6 md:p-12 border border-white/5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#facc1505,transparent_70%)]"></div>
                <div className="relative z-10">
                    <div className="flex items-center justify-center gap-3 mb-16 text-white">
                        <Flag className="w-5 h-5 text-yellow-400" />
                        <h3 className="text-sm font-black uppercase tracking-[0.3em] italic">Hành trình Zero 2 Hero</h3>
                    </div>
                    <div className="relative max-w-4xl mx-auto px-2 md:px-8">
                        <div className="flex flex-col gap-16 md:gap-24">
                            {Array.from({ length: Math.ceil(stages.length / 3) }).map((_, rowIndex) => {
                                const rowStages = stages.slice(rowIndex * 3, rowIndex * 3 + 3);
                                const isReverseRow = rowIndex % 2 !== 0;
                                return (
                                    <div key={rowIndex} className={`flex relative w-full ${isReverseRow ? 'flex-row-reverse' : 'flex-row'}`}>
                                        {rowStages.map((stage, idxInRow) => {
                                            const isActive = activeStage === stage.id;
                                            const isUserGoal = userGoal?.toLowerCase().includes(stage.name.toLowerCase());
                                            const isLastInRow = idxInRow === rowStages.length - 1;
                                            const isNotLastRow = rowIndex < Math.ceil(stages.length / 3) - 1;
                                            return (
                                                <div key={stage.id} className="w-1/3 shrink-0 flex flex-col items-center relative z-10">
                                                    {!isLastInRow && (
                                                        <div className={`absolute top-[28px] md:top-[40px] w-full h-[2px] border-t-2 border-dashed border-gray-600 -z-10 ${isReverseRow ? 'right-1/2' : 'left-1/2'}`}></div>
                                                    )}
                                                    {isLastInRow && isNotLastRow && (
                                                        <div className="absolute top-[28px] md:top-[40px] left-1/2 -translate-x-1/2 w-[2px] h-[160px] md:h-[240px] border-l-2 border-dashed border-gray-600 -z-10"></div>
                                                    )}
                                                    <button
                                                        onClick={() => setActiveStage(isActive ? null : stage.id)}
                                                        className={`w-14 h-14 md:w-20 md:h-20 rounded-full flex flex-col items-center justify-center border-4 transition-all duration-500 relative group active:scale-90 ${
                                                            isUserGoal
                                                            ? 'border-emerald-400 bg-emerald-500 text-white shadow-[0_0_50px_rgba(52,211,153,0.5)] scale-110'
                                                            : isActive
                                                            ? 'border-yellow-400 bg-yellow-400 text-black shadow-[0_0_40px_rgba(250,204,21,0.4)]'
                                                            : 'border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-600'
                                                        }`}
                                                    >
                                                        <span className="text-xl md:text-3xl font-black">{stage.icon}</span>
                                                        {isUserGoal && (
                                                            <div className="absolute -top-4 bg-emerald-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter animate-bounce whitespace-nowrap">🎯 Đích của bạn</div>
                                                        )}
                                                        <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 ${isUserGoal ? 'bg-white text-emerald-600 border-emerald-400' : isActive ? 'bg-black text-white border-yellow-400' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                                                            {stage.id}
                                                        </div>
                                                    </button>
                                                    <div className="mt-4 text-center px-1">
                                                        <h4 className={`text-[9px] md:text-xs font-black uppercase tracking-tighter leading-tight transition-colors ${isUserGoal ? 'text-emerald-400' : isActive ? 'text-yellow-400' : 'text-zinc-500'}`}>
                                                            {stage.name}
                                                        </h4>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
            {}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-yellow-500" />
                        <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 italic">Bức tranh hiện thực</h3>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{customPath.length} mảnh ghép chặng đầu</span>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4">
                    {customPath.map((courseId, index) => {
                        const course = allCourses.find(c => c.id === courseId)
                        if (!course) return null
                        const enrollment = enrollmentsMap[courseId]
                        const isCompleted = enrollment?.status === 'COMPLETED'
                        const isActive = enrollment?.status === 'ACTIVE'
                        const isPending = enrollment?.status === 'PENDING'
                        const isHighlighted = highlightedIds.includes(courseId)
                        return (
                            <div key={courseId} onClick={() => setSelectedCourse({ ...course, enrollment })} className={`group relative aspect-square rounded-[1.5rem] md:rounded-[2.5rem] p-2 sm:p-4 border-2 transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center text-center animate-in zoom-in duration-500 ${isHighlighted ? 'border-yellow-400 bg-yellow-50 shadow-xl shadow-yellow-400/20 scale-105 z-10' : 'border-gray-100 bg-white hover:border-gray-300'}`} style={{ animationDelay: `${index * 50}ms` }}>
                                <div className="absolute top-2 right-2">
                                    {isCompleted ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : isActive ? <Play className="w-3 h-3 text-orange-500 fill-current animate-pulse" /> : isPending ? <Loader2 className="w-3 h-3 text-blue-500 animate-spin" /> : <Lock className="w-3 h-3 text-gray-300" />}
                                </div>
                                <span className={`text-xl sm:text-3xl mb-1 transition-transform group-hover:scale-125 ${!isActive && !isCompleted ? 'grayscale opacity-30' : ''}`}>{course.icon_emoji || '🧩'}</span>
                                <h4 className={`text-[8px] sm:text-[10px] font-black uppercase leading-[1.1] tracking-tighter line-clamp-2 px-1 ${!isActive && !isCompleted ? 'text-gray-400' : 'text-black'}`}>{course.name_lop}</h4>
                                {(isActive || isCompleted) && (
                                    <div className="absolute bottom-0 left-0 w-full h-[3px] bg-gray-100">
                                        <div className={`h-full transition-all duration-1000 ${isCompleted ? 'bg-emerald-500' : 'bg-orange-500'}`} style={{ width: `${isCompleted ? 100 : (enrollment?.completedCount / enrollment?.totalLessons) * 100 || 0}%` }}></div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
            {selectedCourse && <CourseDetailModal course={selectedCourse} enrollment={selectedCourse.enrollment} onClose={() => setSelectedCourse(null)} />}
        </div>
    )
}
```

## File: app/admin/layout.tsx
```typescript
import { auth } from "@/auth"
import { Role } from "@prisma/client"
import { redirect } from "next/navigation"
import Link from 'next/link'
export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()
    if (!session?.user) redirect("/login")
    if (session.user.role !== Role.ADMIN) {
        return <div className="p-10 text-center text-red-600 font-bold">403 - KHÔNG CÓ QUYỀN TRUY CẬP</div>
    }
    const menuItems = [
        { label: 'Thanh toán', href: '/admin/payments', icon: '💰' },
        { label: 'Thành viên', href: '/admin/students', icon: '👥' },
        { label: 'Khóa học', href: '/admin/courses', icon: '📘' },
        { label: 'Lộ trình', href: '/admin/roadmap', icon: '🗺️' },
        { label: 'Bảng tin', href: '/admin/posts', icon: '📰' },
        { label: 'Số đẹp', href: '/admin/reserved-ids', icon: '💎' },
    ]
    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            {}
            <header className="sticky top-0 z-[100] bg-black text-white p-4 shadow-xl">
                <div className="flex justify-between items-center max-w-[1600px] mx-auto">
                    <h1 className="text-sm font-black tracking-widest text-yellow-400 uppercase">Admin BRK</h1>
                    <Link href="/" className="text-[10px] font-black bg-white/10 px-3 py-1.5 rounded-lg uppercase">Thoát</Link>
                </div>
            </header>
            {}
            <nav className="sticky top-[52px] z-[90] bg-white border-b border-gray-200 p-2 overflow-x-auto no-scrollbar flex gap-2 md:hidden shadow-sm">
                {menuItems.map((item) => (
                    <a
                        key={item.href}
                        href={item.href}
                        className="flex-none flex items-center gap-1.5 px-4 py-2 bg-gray-100 rounded-xl text-[10px] font-black uppercase text-gray-600 active:bg-black active:text-yellow-400 transition-all"
                    >
                        <span>{item.icon}</span>
                        {item.label}
                    </a>
                ))}
            </nav>
            <div className="flex flex-1 max-w-[1600px] mx-auto w-full">
                {}
                <aside className="hidden md:block w-64 p-6 border-r border-gray-200 bg-white">
                    <nav className="space-y-2 sticky top-24">
                        {menuItems.map((item) => (
                            <a
                                key={item.href}
                                href={item.href}
                                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-100 font-bold text-gray-600 text-sm transition-all"
                            >
                                <span className="text-xl">{item.icon}</span>
                                {item.label}
                            </a>
                        ))}
                    </nav>
                </aside>
                {}
                <main className="flex-1 p-4 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    )
}
```

## File: components/course/CourseCard.tsx
```typescript
'use client'
import React, { useState } from 'react'
import Image from 'next/image'
import PaymentModal from './PaymentModal'
import UploadProofModal from '@/components/payment/UploadProofModal'
import { enrollInCourseAction } from '@/app/actions/course-actions'
interface CourseCardProps {
    course: any
    isLoggedIn: boolean
    enrollment?: {
        status: string
        startedAt: Date | null
        completedCount: number
        totalLessons: number
        enrollmentId?: number
        payment?: {
            id: number
            status: string
            proofImage?: string | null
        }
    } | null
    isCourseOneActive?: boolean
    userPhone?: string | null
    userId?: number | null
    priority?: boolean
    darkMode?: boolean
}
export default function CourseCard({ course, isLoggedIn, enrollment, isCourseOneActive = false, userPhone = null, userId = null, priority = false, darkMode = false }: CourseCardProps) {
    const [showPayment, setShowPayment] = useState(false)
    const [loading, setLoading] = useState(false)
    const effectivePhiCoc = isCourseOneActive ? 0 : course.phi_coc
    const isActive = enrollment?.status === 'ACTIVE'
    const isPending = enrollment?.status === 'PENDING'
    const handleAction = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (!isLoggedIn) {
            alert('Vui lòng Đăng nhập / Đăng ký tài khoản miễn phí để tiếp tục!')
            window.location.href = '/login'
            return
        }
        if (isActive) {
            window.location.href = `/courses/${course.id_khoa}/learn`
            return
        }
        if (effectivePhiCoc === 0) {
            setLoading(true)
            try {
                const res = await enrollInCourseAction(course.id)
                if (res.success) {
                    window.location.href = `/courses/${course.id_khoa}/learn`
                }
            } catch (err: any) {
                alert(err.message)
            } finally {
                setLoading(false)
            }
        } else {
            if (isPending) {
                setShowPayment(true)
            } else {
                setLoading(true)
                try {
                    const res = await enrollInCourseAction(course.id)
                    if (res.success) {
                        setTimeout(() => setShowPayment(true), 100)
                    }
                } catch (err: any) {
                    alert(err.message)
                } finally {
                    setLoading(false)
                }
            }
        }
    }
    const progressPct = enrollment && enrollment.totalLessons > 0
        ? Math.round((enrollment.completedCount / enrollment.totalLessons) * 100)
        : 0
    return (
        <>
            <div className={`group overflow-hidden rounded-2xl shadow-lg transition-all hover:shadow-2xl flex flex-col h-full ${darkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-gray-100'}`}>
                {}
                <div className="relative aspect-[16/9] w-full overflow-hidden shrink-0 bg-zinc-800">
                    <Image
                        src={course.link_anh_bia || 'https://i.postimg.cc/PJPkm7vB/1.jpg'}
                        alt={course.name_lop}
                        fill
                        priority={priority}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                </div>
                {}
                <div className="p-5 flex flex-col flex-grow">
                    {}
                    <div className="mb-3 flex items-center gap-2.5">
                        <span className="text-2xl leading-none drop-shadow-sm select-none shrink-0">📘</span>
                        <h3 className={`text-base sm:text-lg font-black leading-tight truncate flex-1 ${darkMode ? 'text-white' : 'text-black'}`}
                            style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
                            {course.name_lop}
                        </h3>
                    </div>
                    {}
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className={`inline-block rounded-full px-3 py-1 text-[8px] font-black uppercase tracking-wider shadow-sm ${effectivePhiCoc === 0 ? 'bg-yellow-400 text-gray-900' : 'bg-red-600 text-white'}`}>
                            {effectivePhiCoc === 0 ? 'Miễn phí' : 'Phí cam kết'}
                        </span>
                        {isActive && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-sm border border-sky-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />
                                Đã kích hoạt
                                {enrollment?.startedAt && (
                                    <span className="opacity-80 font-normal" suppressHydrationWarning>
                                        · Từ {new Date(enrollment.startedAt).toLocaleDateString('vi-VN')}
                                    </span>
                                )}
                            </span>
                        )}
                        {isPending && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-sm border border-orange-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />
                                Chờ thanh toán
                            </span>
                        )}
                    </div>
                    {}
                    <div
                        className={`mb-5 flex-grow text-[14px] font-medium leading-relaxed text-justify break-words ${darkMode ? 'text-gray-300' : 'text-gray-500'
                            }`}
                        dangerouslySetInnerHTML={{ __html: course.mo_ta_ngan || '' }}
                    />
                    {/* Button */}
                    <button
                        onClick={handleAction}
                        disabled={loading}
                        className={`group/btn relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-full py-1.5 text-sm sm:text-base font-black shadow-xl transition-all active:scale-[0.97]
                            ${loading ? 'bg-gray-400 text-white cursor-not-allowed' :
                                isActive ? 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-emerald-200' :
                                isPending ? 'bg-orange-500 text-white hover:bg-orange-600 hover:shadow-orange-200' :
                                    'bg-sky-500 text-white hover:bg-sky-600 hover:shadow-sky-200'}`}
                    >
                        {loading ? (
                            <span className="flex items-center gap-2 relative z-10">
                                <svg className="h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Đang kết nối...
                            </span>
                        ) : (
                            <>
                                {isActive && enrollment && enrollment.totalLessons > 0 && (
                                    <span
                                        className="absolute inset-0 transition-all duration-700"
                                        style={{ width: `${progressPct}%`, background: 'rgba(255,255,255,0.18)' }}
                                        aria-hidden="true"
                                    />
                                )}
                                <span className="relative z-10 flex items-center gap-2">
                                    <span>{isActive ? '📖' : isPending ? '💰' : '⚡'}</span>
                                    <span>
                                        {isActive ? 'Vào học tiếp' : isPending ? 'Xem thông tin thanh toán' : effectivePhiCoc === 0 ? 'Kích hoạt miễn phí' : 'Kích hoạt ngay'}
                                        {isActive && enrollment && enrollment.totalLessons > 0 && (
                                            <span className="ml-1.5 font-normal opacity-90 text-[12px]">
                                                {enrollment.completedCount}/{enrollment.totalLessons} bài · {progressPct}%
                                            </span>
                                        )}
                                    </span>
                                    <span>{isActive ? '▶' : '🚀'}</span>
                                </span>
                            </>
                        )}
                    </button>
                    {isPending && !loading && (
                        <p className="mt-3 text-center text-xs font-bold text-orange-600 animate-pulse italic">
                            Đang chờ thanh toán...
                        </p>
                    )}
                </div>
            </div>
            {showPayment && (
                <PaymentModal
                    course={course}
                    enrollment={enrollment}
                    isCourseOneActive={isCourseOneActive}
                    userPhone={userPhone}
                    userId={userId}
                    onClose={() => setShowPayment(false)}
                />
            )}
        </>
    )
}
```

## File: components/home/MessageCard.tsx
```typescript
'use client'
import { useState } from 'react'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { Lightbulb } from 'lucide-react'
const Dialog = dynamic(() => import("@/components/ui/dialog").then(mod => mod.Dialog), { ssr: false })
const DialogContent = dynamic(() => import("@/components/ui/dialog").then(mod => mod.DialogContent), { ssr: false })
const DialogHeader = dynamic(() => import("@/components/ui/dialog").then(mod => mod.DialogHeader), { ssr: false })
const DialogTitle = dynamic(() => import("@/components/ui/dialog").then(mod => mod.DialogTitle), { ssr: false })
interface Message {
    id: number
    content: string
    detail: string
    imageUrl: string | null
}
interface MessageCardProps {
    message: Message | null
    session: any
    userName: string
    userId: string
}
const DEFAULT_MESSAGE: Message = {
    id: 0,
    content: "Tri thức là sức mạnh - Học hôm nay, thành công ngày mai",
    detail: "Học viện BRK mang đến những tri thức thực chiến giúp bạn phát triển bản thân và sự nghiệp. Mỗi ngày học tập là một bước tiến trên con đường thành công.",
    imageUrl: null
}
export default function MessageCard({ message, session, userName, userId }: MessageCardProps) {
    const [isOpen, setIsOpen] = useState(false)
    const displayMessage = message || DEFAULT_MESSAGE
    return (
        <>
            {}
            <div className="relative w-full aspect-[5/3] sm:overflow-hidden rounded-2xl md:rounded-none shadow-2xl border border-white/5 group cursor-pointer"
                onClick={() => setIsOpen(true)}>
                {}
                <div className="absolute inset-0">
                    {displayMessage.imageUrl ? (
                        <Image
                            src={displayMessage.imageUrl}
                            alt="Học viện BRK Background"
                            fill
                            priority
                            quality={70}
                            className="object-cover object-center transition-transform duration-1000 group-hover:scale-105"
                            sizes="(max-width: 768px) 100vw, 1200px"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-black via-zinc-900 to-indigo-950" />
                    )}
                    {}
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] transition-colors duration-500 group-hover:bg-black/33" />
                </div>
                {}
                <div className="absolute inset-0 z-10 flex flex-col px-[5%] pt-[30px] md:pt-[70px] pb-[4%] text-center">
                    {}
                    <div className="flex flex-col items-center shrink-0">
                        <h1 className="flex flex-col items-center font-black tracking-tighter leading-[1.2]">
                            <span
                                className="uppercase text-white drop-shadow-xl"
                                style={{ fontSize: 'clamp(0.5rem, 6vw, 4rem)' }}
                            >
                                HỌC VIỆN BRK
                            </span>
                            <span
                                className="text-glow-3d uppercase drop-shadow-xl"
                                style={{ fontSize: 'clamp(0.5rem, 5vw, 3rem)' }}
                            >
                                NGÂN HÀNG PHƯỚC BÁU
                            </span>
                            <span
                                className="rounded-full bg-white/10 border border-white/20 backdrop-blur-md"
                                style={{
                                    padding: 'clamp(3px,0.8%,8px) clamp(8px,4%,20px)',
                                    marginTop: 'clamp(10px, 2%, 16px)'
                                }}
                            >
                                <span
                                    className="block font-semibold text-white whitespace-nowrap"
                                    style={{ fontSize: 'clamp(0.7rem, 1.8vw, 1.2rem)' }}
                                >
                                    {session?.user
                                        ? `Mến chào ${userName || 'Học viên'} - Mã học tập ${userId}`
                                        : 'Mến chào bạn hữu đường xa!'}
                                </span>
                            </span>
                        </h1>
                    </div>
                    {}
                    <div className="flex-1 flex flex-col items-center justify-center min-h-0 w-full"
                        style={{
                            gap: 'clamp(4px, 1.2%, 12px)',
                            paddingTop: '3%',
                            paddingBottom: '1%'
                        }}>
                        {}
                        <div className="flex items-center justify-center gap-[8px] max-w-[95%] md:max-w-[85%] w-full">
                            <p
                                className="text-yellow-400 font-medium italic leading-tight drop-shadow-lg whitespace-pre-line overflow-visible"
                                style={{
                                    fontSize: `clamp(0.7rem, 2.5vw, 2rem)`,
                                }}
                            >
                                &ldquo;{displayMessage.content}&rdquo;
                            </p>
                            {}
                            <div
                                className="shrink-0 rounded-full bg-yellow-400 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity shadow-lg"
                                style={{
                                    width: 'clamp(1.4rem, 3.2vw, 2.6rem)',
                                    height: 'clamp(1.4rem, 3.2vw, 2.6rem)'
                                }}
                            >
                                <Lightbulb
                                    className="text-black animate-pulse"
                                    style={{ width: '55%', height: '55%' }}
                                />
                            </div>
                        </div>
                        {}
                        <p
                            className="text-white/40 uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-1 group-hover:translate-y-0"
                            style={{ fontSize: 'clamp(0.4rem, 0.75vw, 0.65rem)' }}
                        >
                            Nhấn để xem chi tiết →
                        </p>
                    </div>
                </div>
            </div>
            {}
            {}
            {isOpen && (
                <Dialog open={isOpen}>
                    <DialogContent className="sm:max-w-lg bg-zinc-950 border-zinc-800 text-white overflow-hidden p-0 shadow-2xl">
                        <div className="relative w-full h-64">
                            {displayMessage.imageUrl ? (
                                <Image
                                    src={displayMessage.imageUrl}
                                    alt="Detail Background"
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 100vw, 500px"
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-purple-900 to-indigo-950" />
                            )}
                            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center">
                                <div className="w-12 h-12 rounded-full bg-yellow-400 flex items-center justify-center mb-4 shadow-xl scale-110">
                                    <Lightbulb className="w-6 h-6 text-black" />
                                </div>
                                <p className="text-yellow-400 text-xl font-bold italic leading-tight whitespace-pre-line drop-shadow-md">
                                    &ldquo;{displayMessage.content}&rdquo;
                                </p>
                            </div>
                        </div>
                        <div className="p-6 space-y-4 bg-zinc-950">
                            <div className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line bg-white/5 p-5 rounded-2xl border border-white/5 shadow-inner">
                                {displayMessage.detail}
                            </div>
                            <p className="text-zinc-600 text-[11px] text-center pt-2 italic tracking-widest">
                                💡 HỌC VIỆN BRK - NGÂN HÀNG PHƯỚC BÁU
                            </p>
                        </div>
                        {}
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsOpen(false) }}
                            className="absolute top-4 right-4 text-white/70 hover:text-white transition-all bg-black/20 hover:bg-black/40 rounded-full p-2 z-20"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </DialogContent>
                </Dialog>
            )}
        </>
    )
}
```

## File: components/course/AssignmentForm.tsx
```typescript
'use client'
import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Loader2, Info, X, Send } from "lucide-react"
import { saveAssignmentDraftAction } from '@/app/actions/course-actions'
interface AssignmentFormProps {
    lessonId: string
    lessonOrder: number
    startedAt: Date | null
    videoPercent: number
    videoUrl: string | null
    onSubmit: (data: any, isUpdate?: boolean) => Promise<{ success: boolean; totalScore: number } | void>
    initialData?: any
    onSaveDraft?: React.MutableRefObject<(() => Promise<void>) | undefined>
    onDraftSaved?: (draftInfo: any) => void
    onFormDataChange?: (data: { reflection: string; links: string[]; supports: boolean[] }) => void
}
function formatDate(date: Date | null) {
    if (!date) return '--/--/----'
    return new Date(date).toLocaleDateString('vi-VN')
}
function calcDeadline(startedAt: Date | null, order: number) {
    if (!startedAt) return null
    const d = new Date(startedAt)
    d.setDate(d.getDate() + (order - 1))
    return d
}
function RulesModal({ onClose }: { onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-start justify-end p-4 bg-black/50" onClick={onClose}>
            <div
                className="mt-16 mr-2 w-80 bg-white rounded-xl shadow-2xl border border-orange-200 text-sm text-gray-700 overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="bg-orange-500 text-white px-4 py-3 flex items-center justify-between">
                    <span className="font-bold text-base">📋 Quy tắc chấm điểm (Thang 10)</span>
                    <button onClick={onClose}><X className="w-4 h-4" /></button>
                </div>
                <div className="p-4 space-y-3">
                    <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                        <p className="text-orange-700 text-xs font-semibold">✅ Điểm ≥ 5/10: Hoàn thành bài học và mở khóa bài tiếp theo.</p>
                    </div>
                    <div>
                        <p className="font-bold text-orange-600">1. Học theo Video (Max 2đ)</p>
                        <p className="text-gray-600 mt-1">Xem &gt;50% <span className="text-green-600">(+1đ)</span>, Xem hết <span className="text-green-600">(+2đ)</span>.</p>
                    </div>
                    <div>
                        <p className="font-bold text-orange-600">2. Bài học Tâm đắc Ngộ (Max 2đ)</p>
                        <p className="text-gray-600 mt-1">Có chia sẻ <span className="text-green-600">(+1đ)</span>, Sâu sắc (dài hơn 50 ký tự) <span className="text-green-600">(+1đ)</span>.</p>
                    </div>
                    <div>
                        <p className="font-bold text-orange-600">3. Thực hành nộp link video (Max 3đ)</p>
                        <p className="text-gray-600 mt-1">Mỗi link video <span className="text-green-600">(+1đ)</span>.</p>
                    </div>
                    <div>
                        <p className="font-bold text-orange-600">4. Hỗ trợ (Max 2đ)</p>
                        <p className="text-gray-600 mt-1">
                            Giúp người: Nhắc 2 đồng đội mình nhận hỗ trợ <span className="text-green-600">(+1đ)</span>.<br />
                            Giúp người giúp người: Đồng đội mình nhắc 2 người họ nhận hỗ trợ <span className="text-green-600">(+1đ)</span>.<br />
                            <span className="text-gray-400 text-xs">Nếu chưa có người để hỗ trợ: Nhắc ngược lên trên được tích vào ô đầu (+1đ).</span>
                        </p>
                    </div>
                    <div>
                        <p className="font-bold text-orange-600">5. Giữ tín đúng hạn (1đ)</p>
                        <p className="text-gray-600 mt-1">
                            Nộp trước 23:59 <span className="text-green-600">(+1đ)</span>.<br />
                            <span className="text-red-500">Trừ điểm: Nộp muộn sau 23:59 (-1đ).</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
function SectionHead({ num, label, max, current }: { num: number; label: string; max: number; current: number }) {
    return (
        <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-gray-800 text-sm">{num}. {label}</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${current > 0 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
                {current}/{max}
            </span>
        </div>
    )
}
export default function AssignmentForm({
    lessonId,
    lessonOrder,
    startedAt,
    videoPercent = 0,
    videoUrl = null,
    onSubmit,
    initialData,
    onSaveDraft,
    onDraftSaved,
    onFormDataChange,
}: AssignmentFormProps) {
    const [loading, setLoading] = useState(false)
    const [showRules, setShowRules] = useState(false)
    const [reflection, setReflection] = useState<string>(initialData?.assignment?.reflection || "")
    const [links, setLinks] = useState<string[]>(
        initialData?.assignment?.links?.length > 0
            ? [...initialData.assignment.links, "", "", ""].slice(0, 3)
            : ["", "", ""]
    )
    const [supports, setSupports] = useState<boolean[]>(initialData?.assignment?.supports || [false, false])
    // Refs
    const isDirtyRef = useRef(false)
    const initialRenderRef = useRef(true)
    const deadline = calcDeadline(startedAt, lessonOrder)
    const isCompleted = initialData?.status === 'COMPLETED'
    const existingTotalScore = initialData?.totalScore ?? 0
    const existingScores = initialData?.scores ?? {}
    const saveDraft = useCallback(async () => {
        if (isCompleted) return
        const hasData = reflection.trim() || links.some(l => l.trim()) || supports.some(s => s)
        if (hasData) {
            const draftData = { reflection, links, supports }
            try {
                await saveAssignmentDraftAction({
                    enrollmentId: initialData?.enrollmentId,
                    lessonId,
                    ...draftData
                })
                if (onDraftSaved) onDraftSaved(draftData)
                isDirtyRef.current = false
            } catch (error) {
                console.error('Failed to save draft:', error)
            }
        }
    }, [reflection, links, supports, lessonId, initialData?.enrollmentId, onDraftSaved, isCompleted])
    // Track thay đổi để bật flag isDirty
    useEffect(() => {
        if (initialRenderRef.current) {
            initialRenderRef.current = false
            return
        }
        isDirtyRef.current = true
        if (onFormDataChange) {
            onFormDataChange({ reflection, links, supports })
        }
    }, [reflection, links, supports, onFormDataChange])
    // Đăng ký ref để parent ép lưu draft
    useEffect(() => {
        if (onSaveDraft) {
            onSaveDraft.current = async () => {
                if (isDirtyRef.current) {
                    await saveDraft()
                    isDirtyRef.current = false
                }
            }
        }
    }, [onSaveDraft, saveDraft])
    // Lưu draft khi rời trang
    useEffect(() => {
        if (isCompleted) return
        const handleBeforeUnload = () => {
            if (isDirtyRef.current) saveDraft()
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        window.addEventListener('pagehide', handleBeforeUnload)
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload)
            window.removeEventListener('pagehide', handleBeforeUnload)
        }
    }, [saveDraft, isCompleted])
    // Realtime scoring
    // Rule: Nếu không có link video YouTube -> mặc định 2đ video
    const hasYouTubeVideo = !!videoUrl && /youtu\.be\/|youtube\.com\/|v=/.test(videoUrl)
    const displayPercent = hasYouTubeVideo ? videoPercent : 100
    const vidScore = useMemo(() => {
        if (!hasYouTubeVideo) return 2 // Không có video -> auto 2đ
        if (videoPercent >= 95) return 2
        if (videoPercent >= 50) return 1
        return 0
    }, [videoPercent, hasYouTubeVideo])
    const refScore = useMemo(() => {
        if (reflection.trim().length >= 86) return 2 // Mentor 7 yêu cầu 86 ký tự cho bài học tâm đắc ngộ
        if (reflection.trim().length > 0) return 1
        return 0
    }, [reflection])
    const validLinksCount = useMemo(() => links.filter(l => l.trim().length > 0).length, [links])
    const pracScore = useMemo(() => Math.min(validLinksCount, 3), [validLinksCount])
    const supportScore = useMemo(() => supports.filter(Boolean).length, [supports])
    const currentTimingScore = useMemo(() => {
        if (!deadline) return 0
        const dl = new Date(deadline)
        dl.setHours(23, 59, 59, 999)
        const isNowOnTime = new Date().getTime() <= dl.getTime()
        if (isCompleted) {
            // Nếu đã xong:
            // - Nếu bây giờ vẫn trong hạn -> auto +1 (để gỡ điểm trễ)
            // - Nếu bây giờ quá hạn -> giữ nguyên điểm cũ (bảo vệ điểm đúng hạn)
            if (isNowOnTime) return 1
            return existingScores.timing ?? -1
        }
        return isNowOnTime ? 1 : -1
    }, [deadline, isCompleted, existingScores.timing])
    const total = Math.max(0, vidScore + refScore + pracScore + supportScore + currentTimingScore)
    const isOverdue = currentTimingScore === -1 && !isCompleted // Chỉ coi là trễ nếu chưa xong bài và hết hạn
    const handleSubmit = async () => {
        if (!startedAt) { alert("Bạn chưa xác nhận ngày bắt đầu lộ trình!"); return }
        if (isCompleted && isOverdue) {
            alert("Bài học đã nộp trễ hạn. Không thể cập nhật.")
            return
        }
        const isUpdate = isCompleted
        setLoading(true)
        try {
            // Lấy múi giờ hiện tại của thiết bị học viên
            const clientTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh';
            const result = await onSubmit({
                reflection,
                links,
                supports,
                clientTimeZone // Gửi kèm múi giờ về server
            }, isUpdate)
            if (result?.success) {
                isDirtyRef.current = false
                if (onFormDataChange && !isUpdate) {
                    onFormDataChange({ reflection: '', links: ['', '', ''], supports: [false, false] })
                }
            }
        } finally {
            setLoading(false)
        }
    }
    return (
        <div className="flex flex-col h-full min-h-0 bg-[#FFFDE7]">
            {showRules && <RulesModal onClose={() => setShowRules(false)} />}
            <div className="shrink-0 z-10 bg-[#FFFDE7] border-b border-orange-200 px-4 py-2">
                <div className="flex items-center justify-between">
                    <p className="text-[11px] text-gray-500 leading-tight" suppressHydrationWarning>
                        Hoàn thành trước 23:59 ngày <span className="font-semibold text-gray-700" suppressHydrationWarning>{formatDate(deadline)}</span>
                    </p>
                    <span className="text-sm font-black text-orange-500">Tổng: {total}/10</span>
                </div>
                <div className="flex gap-1.5 mt-1.5">
                    {!(isCompleted && isOverdue) && (
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-black rounded-xl py-2 transition-all shadow-md disabled:opacity-60 text-sm"
                        >
                            {loading
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <><Send className="w-3.5 h-3.5" /> {isCompleted ? 'CẬP NHẬT' : 'GHI NHẬN KẾT QUẢ'}</>
                            }
                        </button>
                    )}
                    {isCompleted && isOverdue && (
                        <div className="flex-1 flex items-center justify-center gap-1.5 bg-gray-300 text-gray-500 font-black rounded-xl py-2 text-sm">
                            ĐÃ HOÀN THÀNH CẬP NHẬT
                        </div>
                    )}
                    <button
                        onClick={() => setShowRules(true)}
                        className="shrink-0 flex items-center gap-1 px-2.5 py-1 bg-orange-100 hover:bg-orange-200 text-orange-600 rounded-xl border border-orange-300 transition text-xs font-semibold"
                        title="Xem quy tắc chấm điểm"
                    >
                        <Info className="w-3.5 h-3.5" /> Quy tắc
                    </button>
                </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 p-3">
                <div className="bg-white rounded-xl border border-gray-200 px-3 py-2.5 shadow-sm">
                    <SectionHead num={1} label={hasYouTubeVideo ? "Mở TRÍ = học theo Video (2đ)" : "Mở TRÍ = Nội dung bài học (2đ)"} max={2} current={vidScore} />
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-500 rounded-full ${!hasYouTubeVideo ? 'bg-emerald-500' : 'bg-orange-400'}`}
                            style={{ width: `${displayPercent}%` }}
                        />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                        {hasYouTubeVideo
                            ? `Đang xem: ${videoPercent.toFixed(0)}%`
                            : '✓ Không có video - Đã hoàn thành nội dung'}
                    </p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 px-3 py-2.5 shadow-sm">
                    <SectionHead num={2} label="Bồi NHÂN = Bài học Tâm đắc Ngộ (2đ)" max={2} current={refScore} />
                    <textarea
                        value={reflection}
                        onChange={e => setReflection(e.target.value)}
                        placeholder="Điều bạn tâm đắc ngộ được từ bài học hôm nay..."
                        rows={3}
                        className="w-full text-sm text-gray-800 border border-gray-200 rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-orange-300 placeholder:text-gray-300"
                    />
                    <p className="text-[10px] text-gray-400 mt-0.5">{reflection.length} ký tự {reflection.length >= 86 ? '✓ Sâu sắc' : '(cần ≥ 86 để đạt max)'}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 px-3 py-2.5 shadow-sm">
                    <SectionHead num={3} label="Hành LỄ = Link thực hành mỗi ngày (3đ)" max={3} current={pracScore} />
                    <div className="flex flex-col gap-1.5">
                        {links.map((link, i) => (
                            <input
                                key={i}
                                type="url"
                                value={link}
                                onChange={e => {
                                    const next = [...links]
                                    next[i] = e.target.value
                                    setLinks(next)
                                }}
                                placeholder={`link video hoặc link bài tập ${i + 1}`}
                                className="w-full text-sm text-gray-800 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-300 placeholder:text-gray-300"
                            />
                        ))}
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 px-3 py-2.5 shadow-sm">
                    <SectionHead num={4} label="Trọng NGHĨA = hỗ trợ đồng đội (2đ)" max={2} current={supportScore} />
                    <div className="flex flex-col gap-1.5">
                        {[
                            'Giúp người (+1đ)',
                            'Giúp người giúp người (+1đ)'
                        ].map((label, i) => (
                            <label key={i} className="flex items-center gap-2.5 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={supports[i]}
                                    onChange={e => {
                                        const next = [...supports]
                                        next[i] = e.target.checked
                                        setSupports(next)
                                    }}
                                    className="w-4 h-4 accent-orange-500 cursor-pointer"
                                />
                                <span className={`text-sm ${supports[i] ? 'text-gray-800 font-semibold' : 'text-gray-500'}`}>
                                    {label}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 px-3 py-2.5 shadow-sm">
                    <SectionHead num={5} label="Giữ TÍN = Làm đúng hạn (1đ)" max={1} current={currentTimingScore === 1 ? 1 : 0} />
                    <div className="flex flex-col gap-1 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Đúng hạn (Trước 23:59):</span>
                            <span className="text-green-600 font-bold">+1đ</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Muộn (Sau 23:59):</span>
                            <span className="text-red-500 font-bold">-1đ</span>
                        </div>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">* Hệ thống tự động ghi nhận theo thời gian thực.</p>
                </div>
                <div className="h-2" />
            </div>
        </div>
    )
}
```

## File: components/course/VideoPlayer.tsx
```typescript
'use client'
import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import {
    RotateCcw, CheckCircle, List, ChevronLeft, ChevronRight,
    Play, CheckCircle2, X, FileText, Clock, Loader2, PlayCircle, SkipBack, SkipForward, Maximize2
} from 'lucide-react'
import { cn } from "@/lib/utils"
import { saveVideoProgressAction } from '@/app/actions/course-actions'
interface VideoPlayerProps {
    enrollmentId: number
    lessonId: string
    videoUrl: string | null
    lessonContent: string | null
    initialMaxTime: number
    onProgress: (maxTime: number, duration: number) => void
    onPercentChange: (percent: number) => void
    playlistData?: any
    lastVideoIndex?: number
}
type PlaylistItem = {
    type: 'video' | 'doc'
    title: string
    url: string
    id?: string | null
}
export default function VideoPlayer({
    enrollmentId,
    lessonId,
    videoUrl,
    lessonContent,
    initialMaxTime,
    onProgress,
    onPercentChange,
    playlistData,
    lastVideoIndex = 0
}: VideoPlayerProps) {
    const playlist = useMemo(() => {
        if (!videoUrl) return []
        return videoUrl.split('|').map((item, index) => {
            const videoMatch = item.match(/^\[(.*?)\](.*)$/)
            if (videoMatch) return { type: 'video' as const, title: videoMatch[1], url: videoMatch[2].trim(), id: extractVideoId(videoMatch[2].trim()) }
            const docMatch = item.match(/^\((.*?)\)(.*)$/)
            if (docMatch) return { type: 'doc' as const, title: docMatch[1], url: docMatch[2].trim() }
            return { type: 'video' as const, title: `Phần ${index + 1}`, url: item.trim(), id: extractVideoId(item.trim()) }
        })
    }, [videoUrl])
const [currentIndex, setCurrentVideoIndex] = useState(lastVideoIndex < playlist.length ? lastVideoIndex : 0)
const [showPlaylist, setShowPlaylist] = useState(false)
const [isMounted, setIsMounted] = useState(false)
const [isFullscreen, setIsFullscreen] = useState(false)
const [docTimer, setDocTimer] = useState<number>(0)
const [isReading, setIsReading] = useState(false)
const [granularProgress, setGranularProgress] = useState<Record<number, {maxTime: number, duration: number}>>(() => {
    return playlistData || {}
})
    const playerRef = useRef<any>(null)
    const containerRef = useRef<HTMLDivElement>(null)
const saveIntervalRef = useRef<any>(null)
const docTimerRef = useRef<any>(null)
const currentItem = playlist[currentIndex]
useEffect(() => { setIsMounted(true) }, [])
useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setIsFullscreen(false)
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
}, [])
const toggleFullScreen = () => {
    setIsFullscreen(!isFullscreen)
}
    const calculateAggregateProgress = useCallback((updatedGranular: any) => {
        let totalMaxTime = 0
        let totalDuration = 0
        playlist.forEach((item, idx) => {
            const p = updatedGranular[idx] || { maxTime: 0, duration: item.type === 'doc' ? 30 : 0 }
            totalMaxTime += p.maxTime
            totalDuration += p.duration
        })
        if (totalDuration === 0) return { maxTime: initialMaxTime, duration: 0 }
        return { maxTime: totalMaxTime, duration: totalDuration }
    }, [playlist, initialMaxTime])
    const saveProgress = useCallback(async (index: number, maxTime: number, duration: number) => {
        const nextGranular = { ...granularProgress, [index]: { maxTime, duration } }
        setGranularProgress(nextGranular)
        const aggregate = calculateAggregateProgress(nextGranular)
        setTimeout(() => {
            onProgress(aggregate.maxTime, aggregate.duration)
            if (aggregate.duration > 0) {
                onPercentChange(Math.min(100, Math.round((aggregate.maxTime / aggregate.duration) * 100)))
            }
            saveVideoProgressAction({
                enrollmentId,
                lessonId,
                maxTime: aggregate.maxTime,
                duration: aggregate.duration,
                lastIndex: index,
                playlistScores: nextGranular
            }).catch(() => {})
        }, 0)
    }, [enrollmentId, lessonId, granularProgress, calculateAggregateProgress, onProgress, onPercentChange])
    const trackVideoProgress = useCallback(() => {
        if (!playerRef.current || typeof playerRef.current.getCurrentTime !== 'function') return
        const currentTime = playerRef.current.getCurrentTime()
        const duration = playerRef.current.getDuration()
        const currentStored = granularProgress[currentIndex] || { maxTime: 0, duration: 0 }
        if (currentTime > currentStored.maxTime) saveProgress(currentIndex, currentTime, duration)
    }, [currentIndex, granularProgress, saveProgress])
    useEffect(() => {
        if (currentItem?.type === 'doc') {
            const currentStored = granularProgress[currentIndex] || { maxTime: 0, duration: 30 }
            if (currentStored.maxTime < 30) {
                setDocTimer(currentStored.maxTime)
                setIsReading(true)
                docTimerRef.current = setInterval(() => {
                    setDocTimer(prev => {
                        const next = prev + 1
                        if (next >= 30) {
                            clearInterval(docTimerRef.current)
                            setIsReading(false)
                            saveProgress(currentIndex, 30, 30)
                            return 30
                        }
                        if (next % 5 === 0) saveProgress(currentIndex, next, 30)
                        return next
                    })
                }, 1000)
            } else { setDocTimer(30); setIsReading(false); }
        }
        return () => { if (docTimerRef.current) clearInterval(docTimerRef.current) }
    }, [currentIndex, currentItem?.type])
    useEffect(() => {
        if (!isMounted || currentItem?.type !== 'video' || !currentItem?.id) return
        const initPlayer = () => {
            if (playerRef.current) playerRef.current.destroy()
            const stored = granularProgress[currentIndex] || { maxTime: 0, duration: 0 }
            const startTime = Math.floor(stored.maxTime)
            playerRef.current = new (window as any).YT.Player(`multimedia-player`, {
                videoId: currentItem.id,
                playerVars: {
                    autoplay: 1,
                    modestbranding: 1,
                    rel: 0,
                    start: startTime
                },
                events: {
                    onStateChange: (e: any) => {
                        const YT = (window as any).YT.PlayerState
                        if (e.data === YT.PLAYING) {
                            if (!saveIntervalRef.current) saveIntervalRef.current = setInterval(trackVideoProgress, 5000)
                        } else {
                            if (saveIntervalRef.current) { clearInterval(saveIntervalRef.current); saveIntervalRef.current = null; }
                        }
                        if (e.data === YT.ENDED) {
                            const dur = playerRef.current.getDuration()
                            saveProgress(currentIndex, dur, dur)
                        }
                    }
                }
            })
        }
        if ((window as any).YT?.Player) initPlayer()
        else {
            const tag = document.createElement('script'); tag.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(tag)
            ;(window as any).onYouTubeIframeAPIReady = initPlayer
        }
        return () => { if (saveIntervalRef.current) clearInterval(saveIntervalRef.current); if (playerRef.current?.destroy) playerRef.current.destroy() }
    }, [currentIndex, isMounted, currentItem?.type, currentItem?.id])
    const handleNext = () => setCurrentVideoIndex((prev) => (prev + 1) % playlist.length)
    const handlePrev = () => setCurrentVideoIndex((prev) => (prev - 1 + playlist.length) % playlist.length)
    const getEmbedUrl = (url: string) => {
        if (!url.includes('docs.google.com')) return url
        if (url.includes('/pub')) return url
        const cleanUrl = url.split('/edit')[0].split('/view')[0].split('/preview')[0].replace(/\/+$/, '')
        return `${cleanUrl}/preview`
    }
    if (!isMounted) return <div className="w-full aspect-video bg-black animate-pulse" />
    return (
        <div className={cn(
            "flex flex-col bg-zinc-950 transition-all duration-300",
            isFullscreen ? "fixed inset-0 z-[9999] h-screen w-screen" : "w-full"
        )}>
            <div className={cn(
                "relative bg-black overflow-hidden shadow-2xl transition-all",
                isFullscreen ? "flex-1" : "w-full aspect-video"
            )}>
                {currentItem?.type === 'video' ? (
                    <div id="multimedia-player" className="w-full h-full" />
                ) : (
                    <div className="w-full h-full bg-white relative flex flex-col">
                        <iframe src={getEmbedUrl(currentItem.url)} className="flex-1 border-0" allow="autoplay" title="Tài liệu" />
                        {isReading && (
                            <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-200 z-10">
                                <div className="h-full bg-orange-500 transition-all duration-1000" style={{ width: `${(docTimer / 30) * 100}%` }} />
                            </div>
                        )}
                    </div>
                )}
                {}
                {showPlaylist && (
                    <div className="absolute inset-0 bg-black/95 z-50 flex flex-col animate-in slide-in-from-bottom duration-300">
                        <div className="flex items-center justify-between p-5 border-b border-zinc-800 shrink-0">
                            <h3 className="text-white font-black text-base flex items-center gap-3">
                                <List className="w-5 h-5 text-orange-500" /> DANH SÁCH HỌC ({playlist.length})
                            </h3>
                            <button onClick={() => setShowPlaylist(false)} className="p-2 bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-all"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[66vh] custom-scrollbar">
                            {playlist.map((item, idx) => {
                                const isCurrent = idx === currentIndex
                                const prog = granularProgress[idx] || { maxTime: 0, duration: item.type === 'doc' ? 30 : 0 }
                                const pct = prog.duration > 0 ? Math.round((prog.maxTime / prog.duration) * 100) : 0
                                return (
                                    <button key={idx} onClick={() => { setCurrentVideoIndex(idx); setShowPlaylist(false); }} className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all border ${isCurrent ? 'bg-orange-500/10 border-orange-500 shadow-lg' : 'bg-zinc-900/50 border-white/5 hover:bg-zinc-800'}`}>
                                        <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${isCurrent ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}>{item.type === 'video' ? <Play className="w-3 h-3 fill-current" /> : <FileText className="w-3 h-3" />}</div>
                                        <div className="flex-1 text-left min-w-0">
                                            <p className={`text-xs font-bold truncate ${isCurrent ? 'text-white' : 'text-zinc-400'}`}>{item.title}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden"><div className={`h-full transition-all duration-1000 ${pct >= 100 ? 'bg-emerald-500' : 'bg-orange-500'}`} style={{ width: `${pct}%` }} /></div>
                                                <span className="text-[9px] text-zinc-500 font-bold">{pct}%</span>
                                            </div>
                                        </div>
                                        {pct >= 95 && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
            {}
            <div className="bg-zinc-900 border-t border-zinc-800 px-4 py-2.5 flex items-center justify-between gap-2 sm:gap-4">
                {}
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={() => setShowPlaylist(!showPlaylist)}
                        className="flex items-center gap-2 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg transition-all border border-zinc-700 shadow-sm"
                    >
                        <List className="w-4 h-4 text-orange-500" />
                        <span className="text-[10px] font-black uppercase tracking-tighter hidden sm:inline">Lộ trình ({currentIndex + 1}/{playlist.length})</span>
                    </button>
                </div>
                {}
                <div className="flex-1 flex flex-col items-center min-w-0 px-1">
                    <div className="flex items-center gap-1.5 max-w-full">
                        {currentItem?.type === 'video' ? <PlayCircle className="w-3 h-3 text-zinc-500 shrink-0" /> : <FileText className="w-3 h-3 text-zinc-500 shrink-0" />}
                        <p className="text-[10px] sm:text-[11px] font-black text-orange-400 truncate tracking-tight uppercase">{currentItem?.title}</p>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        {currentItem?.type === 'doc' ? (
                            isReading ? (
                                <span className="flex items-center gap-1 text-[8px] sm:text-[9px] text-zinc-500 font-bold uppercase"><Clock className="w-2.5 h-2.5 animate-spin" /> {30 - docTimer}s</span>
                            ) : (
                                <span className="flex items-center gap-1 text-[8px] sm:text-[9px] text-emerald-500 font-bold uppercase"><CheckCircle2 className="w-2.5 h-2.5" /> Xong</span>
                            )
                        ) : (
                            <span className="text-[8px] sm:text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Video</span>
                        )}
                    </div>
                </div>
                {}
                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                    <button onClick={handlePrev} className="p-1.5 sm:p-2 bg-zinc-800 hover:bg-orange-500 text-zinc-400 hover:text-white rounded-lg transition-all border border-zinc-700 active:scale-90"><SkipBack className="w-3.5 h-3.5 sm:w-4 h-4" /></button>
                    <button onClick={handleNext} className="p-1.5 sm:p-2 bg-zinc-800 hover:bg-orange-500 text-zinc-400 hover:text-white rounded-lg transition-all border border-zinc-700 active:scale-90"><SkipForward className="w-3.5 h-3.5 sm:w-4 h-4" /></button>
                    {}
                    <button
                        onClick={toggleFullScreen}
                        className="p-1.5 sm:p-2 bg-orange-500/10 hover:bg-orange-500 text-orange-500 hover:text-white rounded-lg transition-all border border-orange-500/20 active:scale-90 ml-1"
                        title="Xem toàn màn hình"
                    >
                        <Maximize2 className="w-3.5 h-3.5 sm:w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}
function extractVideoId(url: string) {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?v=)|(shorts\/)|(\&v=))([^#\&\?]*).*/
    const match = url.match(regExp)
    return (match && match[9].length === 11) ? match[9] : null
}
```

## File: app/page.tsx
```typescript
import { auth } from "@/auth";
import Header from "@/components/layout/Header";
import CourseCard from "@/components/course/CourseCard";
import CourseSection from "@/components/home/CourseSection";
import MessageCard from "@/components/home/MessageCard";
import CommunityBoard from "@/components/home/CommunityBoard";
import Zero2HeroSurvey from "@/components/home/Zero2HeroSurvey";
import RealityMap from "@/components/home/RealityMap";
import prisma from "@/lib/prisma";
import { getRandomMessage } from "./actions/message-actions";
import { resetSurveyAction } from "./actions/survey-actions";
import { Sparkles } from "lucide-react";
export default async function Home() {
  const session = await auth();
  const [courses, userRecord, message] = await Promise.all([
    (prisma as any).course.findMany({
      where: { status: true },
      orderBy: [{ pin: 'asc' }, { id: 'asc' }]
    }),
    session?.user?.id
      ? (prisma as any).user.findUnique({
        where: { id: parseInt(session.user.id) },
        select: { name: true, id: true, image: true, phone: true, customPath: true, goal: true }
      })
      : Promise.resolve(null),
    getRandomMessage()
  ]);
  const userName = userRecord?.name ?? null;
  const userId = userRecord?.id ?? null;
  const userImage = userRecord?.image ?? session?.user?.image ?? null;
  const userPhone = userRecord?.phone ?? null;
  const customPath = userRecord?.customPath as number[] | null;
  const userGoal = userRecord?.goal ?? null;
  let myCourseIds = new Set<number>();
let enrollmentsMap: Record<number, {
  status: string;
  startedAt: Date | null;
  completedCount: number;
  totalLessons: number;
  enrollmentId?: number;
  payment?: {
    id: number;
    status: string;
    proofImage?: string | null;
  };
}> = {};
if (session?.user?.id) {
  const userId = parseInt(session.user.id);
  const enrollments = await (prisma as any).enrollment.findMany({
    where: { userId },
    select: {
      id: true,
      courseId: true,
      status: true,
      startedAt: true,
      payment: {
        select: {
          id: true,
          status: true,
          proofImage: true
        }
      },
      course: {
        select: {
          _count: {
            select: { lessons: true }
          }
        }
      },
      _count: {
        select: {
          lessonProgress: {
            where: { status: 'COMPLETED' }
          }
        }
      }
    }
  });
  enrollments.forEach((e: any) => {
    myCourseIds.add(e.courseId);
    enrollmentsMap[e.courseId] = {
      status: e.status,
      startedAt: e.startedAt,
      completedCount: e._count?.lessonProgress || 0,
      totalLessons: e.course?._count?.lessons || 0,
      enrollmentId: e.id,
      payment: e.payment
    };
  });
}
  const myCourses = courses.filter((c: any) => myCourseIds.has(c.id));
  const otherCourses = courses.filter((c: any) => !myCourseIds.has(c.id));
  const isCourseOneActive = enrollmentsMap[1]?.status === 'ACTIVE';
  return (
    <main className="min-h-screen bg-gray-50">
      {}
      <Header session={session} userImage={userImage} />
      {}
      <div className="pt-16">
        <MessageCard message={message} session={session} userName={userName || ''} userId={userId ? String(userId) : ''} />
      </div>
      {/* Lộ trình Zero 2 Hero */}
      {session?.user && (
        <section className="container mx-auto px-4 py-8">
          {customPath === null ? (
            <Zero2HeroSurvey />
          ) : customPath.length === 0 ? (
            <div className="bg-zinc-950 rounded-[3rem] p-12 text-center border border-white/5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400/5 rounded-full blur-[100px]"></div>
                <div className="relative z-10 space-y-6">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/10">
                        <Sparkles className="w-10 h-10 text-yellow-400" />
                    </div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight italic">Bạn chưa có lộ trình riêng</h3>
                    <p className="text-gray-400 text-sm max-w-md mx-auto font-medium italic">
                        Hãy để AI giúp bạn thiết kế một con đường học tập cá nhân hóa dựa trên mục tiêu thực tế của bạn.
                    </p>
                    <form action={async () => {
                        'use server'
                        await resetSurveyAction()
                    }}>
                        <button className="bg-yellow-400 text-black px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-yellow-500 transition-all active:scale-95 shadow-xl shadow-yellow-400/10">
                            🚀 Thiết lập lộ trình cá nhân
                        </button>
                    </form>
                </div>
            </div>
          ) : (
            <RealityMap
              customPath={customPath}
              enrollmentsMap={enrollmentsMap}
              allCourses={courses}
              userGoal={userGoal || 'Hoàn thiện kỹ năng'}
              onReset={resetSurveyAction}
            />
          )}
        </section>
      )}
      {}
      <section className="container mx-auto px-4 py-8">
        <CommunityBoard isAdmin={session?.user?.role === 'ADMIN'} />
      </section>
      {}
      <section id="khoa-hoc" className="container mx-auto px-4 pb-24">
        {session?.user ? (
          <>
            {}
            {myCourses.length > 0 && (
              <CourseSection
                title="Khóa học của tôi"
                courses={myCourses}
                session={session}
                enrollmentsMap={enrollmentsMap}
                isCourseOneActive={isCourseOneActive}
                userPhone={userPhone}
                userId={userId}
                darkMode={true}
                accentColor="bg-emerald-500"
              />
            )}
            {}
            {otherCourses.length > 0 && (
              <CourseSection
                title="Tất cả khóa học"
                courses={otherCourses}
                session={session}
                enrollmentsMap={enrollmentsMap}
                isCourseOneActive={isCourseOneActive}
                userPhone={userPhone}
                userId={userId}
                accentColor="bg-blue-600"
              />
            )}
          </>
        ) : (
          <CourseSection
            title="Danh Sách Khóa Học"
            courses={courses}
            session={null}
            enrollmentsMap={{}}
            isCourseOneActive={false}
            userPhone={null}
            userId={null}
            accentColor="bg-blue-600"
          />
        )}
      </section>
      {}
      <footer className="bg-gray-100 py-12 text-center text-gray-500 text-sm">
        <p>© 2026 Học viện BRK. All rights reserved.</p>
      </footer>
    </main>
  );
}
```

## File: components/home/Zero2HeroSurvey.tsx
```typescript
'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { surveyQuestions } from '@/lib/survey-data'
import { saveSurveyResultAction } from '@/app/actions/survey-actions'
import { getActiveSurvey, getCoursesForBuilder } from '@/app/actions/roadmap-actions'
import { Target, CheckCircle2, ChevronRight, Loader2, ArrowLeft, Play, Send, Sparkles, BookOpen } from 'lucide-react'
function AdviceModal({ videoUrl, onClose }: { videoUrl?: string, onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-zinc-900 w-full max-w-xl rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl">
                <div className="aspect-video bg-black relative flex items-center justify-center group cursor-pointer" onClick={() => videoUrl && window.open(videoUrl, '_blank')}>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <Play className="w-16 h-16 text-yellow-400 fill-current group-hover:scale-110 transition-transform" />
                    <p className="absolute bottom-4 left-6 text-white font-black uppercase tracking-widest text-xs">{videoUrl ? 'Bấm để xem video tư vấn' : 'Video tư vấn lộ trình BRK'}</p>
                </div>
                <div className="p-8 space-y-4">
                    <h3 className="text-2xl font-black text-white uppercase">Cố vấn định hướng</h3>
                    <p className="text-gray-400 text-sm leading-relaxed font-medium">Chúng tôi hiểu bạn đang phân vân. Nội dung tư vấn này sẽ giúp bạn hiểu rõ từng hướng đi tại Học viện.</p>
                    <button onClick={onClose} className="w-full bg-yellow-400 text-black py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-yellow-500 transition-all active:scale-95">Tôi đã hiểu - Quay lại chọn</button>
                </div>
            </div>
        </div>
    )
}
export default function Zero2HeroSurvey({ onComplete }: { onComplete?: () => void }) {
    const router = useRouter()
    const [flow, setFlow] = useState<any>(null)
    const [allCourses, setAllCourses] = useState<any[]>([])
    const [currentNodeId, setCurrentNodeId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [currentStep, setCurrentStep] = useState('q1')
    const [history, setHistory] = useState<any[]>([])
    const [answers, setAnswers] = useState<Record<string, any>>({})
    const [identifiedCourseIds, setIdentifiedCourseIds] = useState<number[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)
    const [showAdvice, setShowAdvice] = useState<string | null>(null)
    const [lastFoundCourse, setLastFoundCourse] = useState<string | null>(null)
    const [input1, setInput1] = useState('')
    const [input2, setInput2] = useState('')
    const [freeText, setFreeText] = useState('')
    const [videoPerDay, setVideoPerDay] = useState('1')
    const [days, setDays] = useState('30')
    const [targetVal, setTargetVal] = useState('1000')
    useEffect(() => {
        const init = async () => {
            try {
                setIsLoading(true)
                const [flowData, courses] = await Promise.all([getActiveSurvey(), getCoursesForBuilder()])
                const data = flowData as any
                setAllCourses(courses)
                if (data && data.nodes && Array.isArray(data.nodes)) {
                    setFlow(data)
                    const targetIds = new Set(data.edges?.map((e: any) => e.target) || [])
                    let startNode = data.nodes.find((n: any) => n.type === 'questionNode' && !targetIds.has(n.id))
                    if (!startNode) startNode = data.nodes.find((n: any) => n.type === 'questionNode')
                    if (startNode) {
                        setCurrentNodeId(startNode.id)
                        findInitialCourses(data, startNode.id)
                    }
                }
            } catch (err) {
                console.error(err)
            } finally {
                setIsLoading(false)
            }
        }
        init()
    }, [])
    const findInitialCourses = (data: any, sid: string) => {
        if (!data || !data.edges || !data.nodes) return
        const newIds: number[] = []
        const courseNames: string[] = []
        const traverse = (currentId: string) => {
            const outEdges = data.edges.filter((e: any) => e.source === currentId)
            for (const edge of outEdges) {
                const target = data.nodes.find((n: any) => n.id === edge.target)
                if (target?.type === 'courseNode' && target.data?.courseId) {
                    const cid = Number(target.data.courseId)
                    if (!newIds.includes(cid)) {
                        newIds.push(cid)
                        courseNames.push(target.data.courseName || `Khóa #${cid}`)
                    }
                    traverse(target.id)
                }
            }
        }
        traverse(sid)
        if (newIds.length > 0) {
            setIdentifiedCourseIds(newIds)
            setLastFoundCourse(courseNames.join(', '))
            setTimeout(() => setLastFoundCourse(null), 3000)
        }
    }
    const findAndAddCourses = (sourceId: string) => {
        if (!flow || !flow.edges || !flow.nodes) return
        const newIds: number[] = []
        const courseNames: string[] = []
        const traverse = (sid: string) => {
            const outEdges = flow.edges.filter((e: any) => e.source === sid)
            for (const edge of outEdges) {
                const target = flow.nodes.find((n: any) => n.id === edge.target)
                if (target?.type === 'courseNode' && target.data?.courseId) {
                    const cid = Number(target.data.courseId)
                    if (!identifiedCourseIds.includes(cid) && !newIds.includes(cid)) {
                        newIds.push(cid)
                        courseNames.push(target.data.courseName || `Khóa #${cid}`)
                    }
                    traverse(target.id)
                }
            }
        }
        traverse(sourceId)
        if (newIds.length > 0) {
            setIdentifiedCourseIds(prev => [...prev, ...newIds])
            setLastFoundCourse(courseNames.join(', '))
            setTimeout(() => setLastFoundCourse(null), 3000)
        }
    }
    const getActiveQuestion = () => {
        if (flow && currentNodeId && Array.isArray(flow.nodes)) {
            const node = flow.nodes.find((n: any) => n.id === currentNodeId)
            if (node) {
                const options = Array.isArray(flow.edges) ? flow.edges
                    .filter((e: any) => e.source === currentNodeId)
                    .map((edge: any) => {
                        const optNode = flow.nodes.find((n: any) => n.id === edge.target)
                        return { id: optNode?.id, label: optNode?.data?.label, type: optNode?.type }
                    })
                    .filter((o: any) => o.id && o.type === 'optionNode') : []
                return { id: node.id, question: node.data?.label, type: node.data?.type || 'CHOICE', options, isDynamic: true }
            }
        }
        const staticQ = (surveyQuestions as any)[currentStep] || {}
        return { ...staticQ, id: currentStep, isDynamic: false }
    }
    const currentQuestion = getActiveQuestion()
    const handleNext = async (optionId: string, label: string) => {
        const newAnswers: Record<string, any> = { ...answers, [currentQuestion.id]: label }
        if (currentQuestion.type === 'INPUT_ACCOUNT') {
            newAnswers[`${currentQuestion.id}_name`] = input1
            newAnswers[`${currentQuestion.id}_id`] = input2
            newAnswers[`${currentQuestion.id}_status`] = label
        }
        if (currentQuestion.type === 'INPUT_GOAL') {
            newAnswers['goal_config'] = { videoPerDay, days, targetVal }
        }
        setAnswers(newAnswers)
        if (currentQuestion.isDynamic && flow) {
            findAndAddCourses(optionId)
            const findNextNode = (sid: string): any => {
                const outEdges = Array.isArray(flow.edges) ? flow.edges.filter((e: any) => e.source === sid) : []
                for (const edge of outEdges) {
                    const target = flow.nodes.find((n: any) => n.id === edge.target)
                    if (!target) continue
                    if (target.type === 'questionNode' || target.type === 'adviceNode' || target.type === 'finishNode') return target
                    if (target.type === 'courseNode' || target.type === 'optionNode') {
                        const next = findNextNode(target.id)
                        if (next) return next
                    }
                }
                return null
            }
            const startId = currentQuestion.type === 'INPUT_GOAL' ? currentNodeId : optionId
            const nextNode = findNextNode(startId!)
            if (nextNode) {
                if (nextNode.type === 'finishNode') {
                    finishSurvey(newAnswers)
                    return
                }
                if (nextNode.type === 'adviceNode') {
                    setShowAdvice(nextNode.data?.label || '')
                    return
                }
                setHistory([...history, { id: currentNodeId, isDynamic: true, courses: [...identifiedCourseIds] }])
                setCurrentNodeId(nextNode.id)
                findAndAddCourses(nextNode.id)
            } else {
                finishSurvey(newAnswers)
            }
        } else {
            finishSurvey(newAnswers)
        }
        setInput1(''); setInput2('')
    }
    const finishSurvey = async (finalAnswers: any) => {
        setIsSubmitting(true)
        try {
            const res = await saveSurveyResultAction(finalAnswers)
            if (res.success) {
                setShowSuccess(true)
                setTimeout(() => {
                    if (onComplete) onComplete()
                    else window.location.href = '/'
                }, 5000)
            } else {
                alert(res.error); setIsSubmitting(false)
            }
        } catch (err) {
            setIsSubmitting(false)
        }
    }
    if (isLoading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-yellow-400" /></div>
    if (showSuccess) return (
        <div className="bg-zinc-950 rounded-[2.5rem] p-10 text-center text-white border border-white/10 shadow-2xl animate-in zoom-in-95">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-500/20">
                <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-black uppercase mb-4">Lộ trình hoàn tất!</h2>
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-8 text-left max-w-md mx-auto">
                <p className="text-[10px] font-black uppercase text-yellow-400 mb-4 tracking-widest flex items-center gap-2">
                    <Sparkles className="w-3 h-3" /> AI đã xác định {identifiedCourseIds.length} chặng học:
                </p>
                <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                    {identifiedCourseIds.map((id, idx) => {
                        const c = allCourses.find(item => item.id === id)
                        return (
                            <div key={`${id}-${idx}`} className="flex items-center gap-3 text-sm font-bold text-gray-200 animate-in slide-in-from-left duration-300" style={{ animationDelay: `${idx * 100}ms` }}>
                                <div className="w-6 h-6 rounded-lg bg-yellow-400/10 flex items-center justify-center text-yellow-400 text-[10px]">{id}</div>
                                {c?.name_lop || `Khóa học #${id}`}
                            </div>
                        )
                    })}
                </div>
            </div>
            <p className="text-gray-400 text-xs mb-4 italic">Hệ thống đang lưu dữ liệu và chuyển hướng...</p>
            <Loader2 className="w-6 h-6 animate-spin text-yellow-400 mx-auto" />
        </div>
    )
    return (
        <div className="bg-zinc-950 rounded-[3rem] p-6 md:p-10 text-white border border-white/10 shadow-2xl relative overflow-hidden">
            {lastFoundCourse && (
                <div className="absolute top-0 left-0 right-0 bg-yellow-400 text-black py-2 px-4 text-center font-black uppercase text-[9px] tracking-widest animate-in slide-in-from-top duration-300 z-50 flex items-center justify-center gap-2">
                    <Sparkles className="w-3 h-3 fill-current" /> Đã xác định: {lastFoundCourse}
                </div>
            )}
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-yellow-400 flex items-center justify-center text-black shadow-lg shadow-yellow-400/20"><Target className="w-5 h-5" /></div>
                        <div>
                            <h2 className="text-lg font-black uppercase tracking-tight italic">Zero 2 Hero</h2>
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Live Roadmap Building</p>
                        </div>
                    </div>
                    {identifiedCourseIds.length > 0 && (
                        <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10 animate-in zoom-in">
                            <BookOpen className="w-3 h-3 text-yellow-400" />
                            <span className="text-[10px] font-black text-yellow-400">{identifiedCourseIds.length}</span>
                        </div>
                    )}
                </div>
                <div className="animate-in slide-in-from-right-4 fade-in duration-300">
                    <h3 className="text-2xl font-black leading-tight mb-2 uppercase tracking-tight">{currentQuestion.question}</h3>
                    <p className="text-gray-400 text-sm mb-8 font-medium italic">
                        {currentQuestion.description || 'Hãy chọn đáp án phản ánh đúng nhất trạng thái của bạn.'}
                    </p>
                    {currentQuestion.type === 'CHOICE' && (
                        <div className="grid grid-cols-1 gap-3">
                            {currentQuestion.options?.map((opt: any) => (
                                <button key={opt.id} onClick={() => handleNext(opt.id, opt.label)} className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/10 p-5 rounded-2xl transition-all flex items-center justify-between group active:scale-[0.98]">
                                    <span className="font-bold text-gray-200 group-hover:text-white">{opt.label}</span>
                                    <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-yellow-400" />
                                </button>
                            ))}
                        </div>
                    )}
                    {currentQuestion.type === 'FREE_TEXT' && (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-gray-500 ml-1 italic">Câu trả lời của bạn</label>
                                <textarea
                                    value={freeText}
                                    onChange={e => setFreeText(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm font-bold outline-none focus:ring-2 focus:ring-yellow-400 min-h-[120px] transition-all"
                                    placeholder="Nhập nội dung trả lời tại đây..."
                                />
                            </div>
                            <button
                                onClick={() => {
                                    if (!freeText.trim()) return alert('Vui lòng nhập câu trả lời của bạn.');
                                    handleNext('free_text_submit', freeText);
                                    setFreeText(''); // Reset cho câu sau
                                }}
                                className="w-full bg-yellow-400 text-black py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-yellow-500 transition-all active:scale-95 shadow-lg shadow-yellow-400/10 flex items-center justify-center gap-2"
                            >
                                <Send className="w-3 h-3" /> Tiếp tục khảo sát
                            </button>
                        </div>
                    )}
                    {currentQuestion.type === 'INPUT_ACCOUNT' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-gray-500 ml-1 italic">Tên Kênh / Lĩnh vực</label>
                                    <input type="text" value={input1} onChange={e => setInput1(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-yellow-400" placeholder="Nhập tên..." />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-gray-500 ml-1 italic">Link TikTok / Bio</label>
                                    <input type="text" value={input2} onChange={e => setInput2(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-yellow-400" placeholder="@id_cua_ban" />
                                </div>
                            </div>
                            <div className="flex gap-3">
                                {currentQuestion.options?.map((opt: any) => (
                                    <button key={opt.id} onClick={() => handleNext(opt.id, opt.label)} className={`flex-1 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${opt.label?.toLowerCase() === 'tiếp tục' || opt.label?.toLowerCase() === 'xác nhận' ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/10' : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'}`}>{opt.label}</button>
                                ))}
                            </div>
                        </div>
                    )}
                    {currentQuestion.type === 'INPUT_GOAL' && (
                        <div className="space-y-6 text-black">
                            <div className="bg-white p-8 rounded-[2rem] border-2 border-yellow-400/20 space-y-6">
                                <div className="flex flex-wrap items-center gap-3 text-sm font-black leading-relaxed">
                                    <span>TÔI CAM KẾT LÀM</span>
                                    <input type="number" value={videoPerDay} onChange={e => setVideoPerDay(e.target.value)} className="w-16 bg-gray-100 border-none rounded-lg px-2 py-1 text-center text-yellow-600 outline-none" />
                                    <span>VIDEO/NGÀY TRONG</span>
                                    <input type="number" value={days} onChange={e => setDays(e.target.value)} className="w-16 bg-gray-100 border-none rounded-lg px-2 py-1 text-center text-yellow-600 outline-none" />
                                    <span>NGÀY ĐỂ ĐẠT</span>
                                    <input type="number" value={targetVal} onChange={e => setTargetVal(e.target.value)} className="w-24 bg-gray-100 border-none rounded-lg px-2 py-1 text-center text-yellow-600 outline-none" />
                                    <span className="text-gray-400 font-bold uppercase">FOLLOW / ĐƠN HÀNG</span>
                                </div>
                            </div>
                            <button disabled={isSubmitting} onClick={() => handleNext('yes', 'Xác nhận')} className="w-full bg-yellow-400 text-black py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-2 shadow-xl hover:bg-yellow-500 transition-all active:scale-95 disabled:opacity-50">{isSubmitting ? <Loader2 className="animate-spin" /> : <Send className="w-4 h-4" />} Xác nhận lộ trình & Cam kết thực hiện</button>
                        </div>
                    )}
                </div>
            </div>
            {showAdvice && <AdviceModal videoUrl={showAdvice} onClose={() => setShowAdvice(null)} />}
        </div>
    )
}
```

## File: app/admin/roadmap/page.tsx
```typescript
'use client'
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { QuestionNode, OptionNode, CourseNode, AdviceNode, FinishNode } from '@/components/admin/roadmap/CustomNodes';
import {
  getAllSurveys, createSurvey,
  saveSurveyFlow, activateSurvey, deleteSurvey,
  getCoursesForBuilder
} from '@/app/actions/roadmap-actions';
import { surveyQuestions } from '@/lib/survey-data';
import { Loader2, ArrowLeft, Plus, CheckCircle, Trash2, Edit3, Settings, Save, RefreshCw, X, ChevronUp, ChevronDown } from 'lucide-react';
const nodeTypes = {
  questionNode: QuestionNode,
  optionNode: OptionNode,
  courseNode: CourseNode,
  adviceNode: AdviceNode,
  finishNode: FinishNode,
};
let idCounter = 0;
const getId = () => `node_${Date.now()}_${idCounter++}`;
const RoadmapBuilderContent = () => {
  const [view, setView] = useState<'LIST' | 'EDITOR'>('LIST');
  const [currentSurveyId, setCurrentSurveyId] = useState<number | null>(null);
  const [surveys, setSurveys] = useState<any[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showMobileProps, setShowMobileProps] = useState(false);
  const reactFlowWrapper = useRef<any>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  useEffect(() => {
    loadSurveys();
    loadCourses();
  }, []);
  const loadSurveys = async () => {
    try {
        setIsInitializing(true);
        const list = await getAllSurveys();
        if (list.length === 0) {
            const res = await createSurvey('Lộ trình Zero 2 Hero (Bản gốc)');
            if (res.success) loadSurveys();
        } else {
            setSurveys(list);
        }
    } catch (err) {
        console.error(err);
    } finally {
        setIsInitializing(false);
    }
  };
  const loadCourses = async () => {
    const list = await getCoursesForBuilder();
    setCourses(list || []);
  };
  const handleCreateNew = async () => {
    const name = window.prompt('Nhập tên cho bài khảo sát mới:');
    if (!name) return;
    const res = await createSurvey(name);
    if (res.success) loadSurveys();
  };
  const handleEdit = (survey: any) => {
    setCurrentSurveyId(survey.id);
    const flow = survey.flow as any;
    setNodes(Array.isArray(flow?.nodes) ? flow.nodes : []);
    setEdges(Array.isArray(flow?.edges) ? flow.edges : []);
    setView('EDITOR');
    setSelectedNode(null);
  };
  const handleActivate = async (id: number) => {
    if (window.confirm('Kích hoạt bài khảo sát này?')) {
      const res = await activateSurvey(id);
      if (res.success) loadSurveys();
    }
  };
  const handleDelete = async (id: number) => {
    if (window.confirm('Xóa vĩnh viễn bài này?')) {
      const res = await deleteSurvey(id);
      if (res.success) loadSurveys();
    }
  };
  const onSave = async () => {
    if (!currentSurveyId) return;
    setIsSaving(true);
    const result = await saveSurveyFlow(currentSurveyId, { nodes, edges });
    if (result.success) {
      alert('Đã lưu thành công!');
      const updatedSurveys = await getAllSurveys();
      setSurveys(updatedSurveys);
    } else {
      alert('Lỗi: ' + result.error);
    }
    setIsSaving(false);
  };
  const onConnect = useCallback((params: any) => setEdges((eds: any) => addEdge(params, eds)), [setEdges]);
  const onDragOver = useCallback((event: any) => {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }, []);
  const onDrop = useCallback((event: any) => {
    event.preventDefault();
    if (!reactFlowInstance) return;
    const type = event.dataTransfer.getData('application/reactflow');
    if (!type) return;
    const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const newNode = {
      id: getId(),
      type,
      position,
      data: { label: `Nội dung mới...` },
    };
    setNodes((nds: any) => nds.concat(newNode));
  }, [reactFlowInstance, setNodes]);
  const updateNodeData = (newData: any) => {
    if (!selectedNode) return;
    setNodes((nds: any) => nds.map((node: any) => node.id === selectedNode.id ? { ...node, data: { ...node.data, ...newData } } : node));
    setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, ...newData } });
  };
  const onMigrateFromOldVersion = () => {
    if (!window.confirm('CẢNH BÁO: Thao tác này sẽ XÓA TOÀN BỘ sơ đồ hiện tại và nạp lại dữ liệu từ file code gốc. Bạn có chắc chắn?')) return;
    const newNodes: any[] = [];
    const newEdges: any[] = [];
    let x = 100, y = 100, spacingX = 450, spacingY = 200;
    const questions = surveyQuestions as any;
    Object.keys(questions).forEach((qId, qIndex) => {
      const q = questions[qId];
      newNodes.push({
        id: qId,
        type: 'questionNode',
        position: { x: x + qIndex * spacingX, y },
        data: { label: q.question, type: q.type }
      });
      if (Array.isArray(q.options)) {
        q.options.forEach((opt: any, optIndex: number) => {
          const optNodeId = `opt_${qId}_${opt.id}`;
          newNodes.push({
            id: optNodeId,
            type: 'optionNode',
            position: { x: x + qIndex * spacingX + (optIndex * 180 - 150), y: y + spacingY },
            data: { label: opt.label }
          });
          newEdges.push({ id: `e_${qId}_${optNodeId}`, source: qId, target: optNodeId });
          if (opt.nextQuestionId && opt.nextQuestionId !== 'done') {
              newEdges.push({ id: `e_${optNodeId}_${opt.nextQuestionId}`, source: optNodeId, target: opt.nextQuestionId });
          }
        });
      }
    });
    setNodes(newNodes);
    setEdges(newEdges);
  };
  useEffect(() => {
    if (selectedNode) setShowMobileProps(true);
  }, [selectedNode]);
  if (isInitializing) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-yellow-400" /></div>;
  if (view === 'LIST') return (
    <div className="space-y-6 animate-in fade-in duration-500 text-black mx-auto px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-black uppercase tracking-tighter italic">Quản lý khảo sát</h2>
        <button onClick={handleCreateNew} className="w-full md:w-auto bg-black text-yellow-400 px-6 py-3 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 shadow-xl">
          <Plus className="w-4 h-4" /> Tạo bài mới
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {surveys.map((survey) => (
          <div key={survey.id} className={`bg-white rounded-[2.5rem] p-6 border-2 transition-all ${survey.isActive ? 'border-green-500 shadow-xl' : 'border-gray-100'}`}>
            <div className="flex justify-between items-start mb-4">
              <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${survey.isActive ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                {survey.isActive ? 'Đang chạy' : 'Bản nháp'}
              </span>
              <button onClick={() => handleDelete(survey.id)} className="text-red-400 p-1"><Trash2 className="w-4 h-4" /></button>
            </div>
            <h3 className="text-lg font-black text-black mb-4 uppercase truncate">{survey.name}</h3>
            <div className="grid grid-cols-1 gap-2">
              <button onClick={() => handleEdit(survey)} className="w-full bg-zinc-900 text-white py-3 rounded-xl font-black uppercase text-[9px] flex items-center justify-center gap-2">
                <Edit3 className="w-3 h-3" /> Thiết kế sơ đồ
              </button>
              {!survey.isActive && (
                <button onClick={() => handleActivate(survey.id)} className="w-full bg-green-50 text-green-600 py-3 rounded-xl font-black uppercase text-[9px] border border-green-100">
                  Kích hoạt ngay
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <div className="fixed inset-0 z-[100] md:relative md:h-[calc(100vh-150px)] flex flex-col bg-[#F8F9FA] overflow-hidden text-black">
      {}
      <div className="bg-black p-3 md:p-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
            <button onClick={() => setView('LIST')} className="p-2 bg-white/10 text-white rounded-xl"><ArrowLeft className="w-4 h-4" /></button>
            <div className="hidden md:block">
                <h2 className="text-white font-black uppercase text-sm italic">
                    {surveys.find(s => s.id === currentSurveyId)?.name}
                </h2>
            </div>
            <button
                onClick={onMigrateFromOldVersion}
                className="bg-white/10 text-white border border-white/20 px-3 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-white/20 transition-all flex items-center gap-2"
            >
                <RefreshCw className="w-3 h-3" /> <span className="hidden sm:inline">Nạp bản cũ</span>
            </button>
        </div>
        <button onClick={onSave} disabled={isSaving} className="bg-yellow-400 text-black px-5 md:px-8 py-2 md:py-2.5 rounded-xl font-black uppercase text-[9px] md:text-[11px] shadow-lg active:scale-95">
          {isSaving ? '...' : <div className="flex items-center gap-2"><Save className="w-3 h-3 md:w-4 md:h-4" /> Lưu</div>}
        </button>
      </div>
      {}
      <div className="bg-white border-b border-gray-200 p-2 overflow-x-auto flex flex-row gap-2 no-scrollbar shrink-0 md:hidden">
        {[
          { type: 'questionNode', color: 'orange', label: '❓ CÂU HỎI' },
          { type: 'optionNode', color: 'zinc', label: '🔘 ĐÁP ÁN' },
          { type: 'courseNode', color: 'purple', label: '🎓 KHÓA' },
          { type: 'adviceNode', color: 'blue', label: '💡 TƯ VẤN' },
          { type: 'finishNode', color: 'emerald', label: '🏁 ĐÍCH' }
        ].map(tool => (
          <div
            key={tool.type}
            className="shrink-0 p-3 bg-gray-50 border-2 border-gray-100 rounded-xl font-black text-[9px] uppercase active:bg-yellow-50 active:border-yellow-400 transition-colors"
            onClick={() => {
                const newNode = {
                    id: getId(),
                    type: tool.type,
                    position: reactFlowInstance ? reactFlowInstance.getViewport() : { x: 100, y: 100 },
                    data: { label: `Nội dung mới...` },
                };
                setNodes((nds: any) => nds.concat(newNode));
            }}
          >
            {tool.label}
          </div>
        ))}
      </div>
      <div className="flex flex-1 overflow-hidden relative">
        {}
        <aside className="hidden md:flex w-72 bg-gray-50 border-r border-gray-200 p-6 flex-col gap-4 overflow-y-auto">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 border-b border-gray-200 pb-2">Thư viện khối</div>
          <div className="grid grid-cols-1 gap-3">
            {[
              { type: 'questionNode', label: '❓ CÂU HỎI', desc: 'Nội dung khảo sát' },
              { type: 'optionNode', label: '🔘 ĐÁP ÁN', desc: 'Các lựa chọn rẽ nhánh' },
              { type: 'courseNode', label: '🎓 KHÓA HỌC', desc: 'Khóa học được cấp' },
              { type: 'adviceNode', label: '💡 TƯ VẤN', desc: 'Video định hướng' },
              { type: 'finishNode', label: '🏁 ĐÍCH ĐẾN', desc: 'Chốt mục tiêu' }
            ].map(tool => (
              <div key={tool.type} className="p-4 bg-white border-2 border-gray-100 rounded-2xl cursor-grab hover:border-gray-500 transition-all shadow-sm" onDragStart={(e) => e.dataTransfer.setData('application/reactflow', tool.type)} draggable>
                <div className="text-zinc-600 text-[11px] font-black uppercase">{tool.label}</div>
                <div className="text-[9px] text-gray-400 font-bold mt-1 uppercase italic">{tool.desc}</div>
              </div>
            ))}
          </div>
          {selectedNode && (
            <div className="mt-8 pt-8 border-t-2 border-dashed border-gray-200 space-y-4">
              <div className="text-[10px] font-black uppercase text-black">Thuộc tính</div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-gray-400 ml-1 italic">Câu hỏi chính</label>
                <textarea className="w-full p-4 text-xs font-bold border-2 border-gray-50 rounded-2xl outline-none focus:border-yellow-400 text-black" value={selectedNode.data?.label || ''} onChange={(e) => updateNodeData({ label: e.target.value })} rows={3} />
              </div>
              {selectedNode.type === 'questionNode' && (
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-gray-400 ml-1 italic">Mô tả chi tiết (Tùy chọn)</label>
                  <textarea className="w-full p-4 text-xs font-bold border-2 border-gray-50 rounded-2xl outline-none focus:border-orange-400 text-black" value={selectedNode.data?.description || ''} onChange={(e) => updateNodeData({ description: e.target.value })} rows={2} placeholder="Giúp học viên hiểu rõ câu hỏi hơn..." />
                </div>
              )}
              {selectedNode.type === 'questionNode' && (
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-orange-500 ml-1 italic">Loại nhập liệu</label>
                  <select
                    className="w-full p-4 text-xs font-bold border-2 border-orange-50 rounded-2xl outline-none focus:border-orange-500 text-black bg-white"
                    value={selectedNode.data?.type || 'CHOICE'}
                    onChange={(e) => updateNodeData({ type: e.target.value })}
                  >
                    <option value="CHOICE">🔘 Các nút Lựa chọn</option>
                    <option value="INPUT_ACCOUNT">📱 Form Thông tin kênh</option>
                    <option value="INPUT_GOAL">🏁 Form Cam kết mục tiêu</option>
                    <option value="FREE_TEXT">📝 Form Tự nhập câu trả lời</option>
                  </select>
                </div>
              )}
              {selectedNode.type === 'courseNode' && (
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-gray-400 ml-1 italic">Chọn khóa học</label>
                  <select
                    className="w-full p-4 text-xs font-bold border-2 border-gray-50 rounded-2xl outline-none text-black bg-white"
                    value={selectedNode.data?.courseId || ''}
                    onChange={(e) => {
                        const courseId = parseInt(e.target.value);
                        const course = courses.find(c => c.id === courseId);
                        updateNodeData({ courseId, courseName: course?.name_lop });
                    }}
                  >
                    <option value="">-- Chọn khóa học --</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name_lop}</option>)}
                  </select>
                </div>
              )}
              <button onClick={() => { setNodes((nds: any) => nds.filter((n: any) => n.id !== selectedNode.id)); setSelectedNode(null); }} className="w-full py-4 bg-red-50 text-red-600 text-[10px] font-black uppercase rounded-2xl border-2 border-red-100 hover:bg-red-500 hover:text-white transition-all">Xóa khối</button>
            </div>
          )}
        </aside>
        {/* 3. Canvas Area (Full space) */}
        <div className="flex-1 relative" ref={reactFlowWrapper}>
          <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onInit={setReactFlowInstance} onDrop={onDrop} onDragOver={onDragOver} onNodeClick={(_, node) => setSelectedNode(node)} nodeTypes={nodeTypes} fitView minZoom={0.1} maxZoom={2} panOnScroll={true} selectionOnDrag={true}>
            <Background color="#E5E7EB" variant={"dots" as any} gap={20} size={1} />
            <Controls className="!bg-white !border-gray-200 !rounded-xl md:!rounded-2xl !shadow-2xl overflow-hidden" />
          </ReactFlow>
        </div>
        {/* 4. Mobile Properties Overlay (Bottom Sheet) */}
        {selectedNode && (
            <div className={`md:hidden fixed bottom-0 left-0 right-0 z-[150] transition-transform duration-300 transform ${showMobileProps ? 'translate-y-0' : 'translate-y-[85%]'}`}>
                <div className="bg-white rounded-t-[2.5rem] shadow-[0_-20px_50px_rgba(0,0,0,0.15)] border-t border-gray-100">
                    <button onClick={() => setShowMobileProps(!showMobileProps)} className="w-full py-4 flex flex-col items-center gap-1 border-b border-gray-50">
                        <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{showMobileProps ? 'Gạt xuống để ẩn' : 'Gạt lên để sửa'}</span>
                    </button>
                    <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-black uppercase text-yellow-600 bg-yellow-50 px-4 py-1.5 rounded-xl border border-yellow-100">{selectedNode.type}</span>
                            <button onClick={() => { setNodes((nds: any) => nds.filter((n: any) => n.id !== selectedNode.id)); setSelectedNode(null); }} className="p-3 bg-red-50 text-red-500 rounded-xl"><Trash2 className="w-4 h-4" /></button>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Nội dung hiển thị</label>
                            <textarea className="w-full p-4 text-sm font-bold border-2 border-gray-100 rounded-[1.5rem] outline-none focus:border-yellow-400 text-black bg-gray-50" value={selectedNode.data?.label || ''} onChange={(e) => updateNodeData({ label: e.target.value })} rows={3} placeholder="Nhập chữ..." />
                        </div>
                        {selectedNode.type === 'questionNode' && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Loại nhập liệu</label>
                                <select className="w-full p-4 text-sm font-bold border-2 border-gray-100 rounded-[1.5rem] outline-none text-black bg-gray-50" value={selectedNode.data?.type || 'CHOICE'} onChange={(e) => updateNodeData({ type: e.target.value })}>
                                    <option value="CHOICE">Lựa chọn (Choice)</option>
                                    <option value="INPUT_ACCOUNT">Thông tin kênh (Account)</option>
                                    <option value="INPUT_GOAL">Cam kết mục tiêu (Goal)</option>
                                </select>
                            </div>
                        )}
                        {selectedNode.type === 'courseNode' && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Chọn khóa học</label>
                                <select className="w-full p-4 text-sm font-bold border-2 border-gray-100 rounded-[1.5rem] outline-none text-black bg-gray-50" value={selectedNode.data?.courseId || ''} onChange={(e) => {
                                    const courseId = parseInt(e.target.value);
                                    const course = courses.find(c => c.id === courseId);
                                    updateNodeData({ courseId, courseName: course?.name_lop });
                                }}><option value="">-- Chọn khóa --</option>{courses.map(c => <option key={c.id} value={c.id}>{c.name_lop}</option>)}</select>
                            </div>
                        )}
                        <div className="py-4"></div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
export default function RoadmapBuilder() {
    return (
        <ReactFlowProvider>
            <RoadmapBuilderContent />
        </ReactFlowProvider>
    );
}
```

## File: components/course/CoursePlayer.tsx
```typescript
'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import Link from "next/link"
import {
    ArrowLeft, ListVideo, FileText, X, ClipboardCheck,
    Loader2, CheckCircle2, PlayCircle, Lock, CalendarDays, RefreshCw
} from "lucide-react"
import { cn } from "@/lib/utils"
import LessonSidebar from "./LessonSidebar"
import VideoPlayer from "./VideoPlayer"
import AssignmentForm from "./AssignmentForm"
import ChatSection from "./ChatSection"
import StartDateModal from "./StartDateModal"
import {
    confirmStartDateAction,
    saveVideoProgressAction,
    submitAssignmentAction,
    updateLastLessonAction
} from "@/app/actions/course-actions"
interface CoursePlayerProps {
    course: any
    enrollment: any
    session: any
}
type MobileTab = 'list' | 'content' | 'record'
export default function CoursePlayer({ course, enrollment: initialEnrollment, session }: CoursePlayerProps) {
    const [enrollment, setEnrollment] = useState(initialEnrollment)
    const isSubmittingRef = useRef(false)
    const [isMounted, setIsMounted] = useState(false)
    const filteredLessonProgress = enrollment.lessonProgress.filter((p: any) => p.status !== 'RESET')
    const [currentLessonId, setCurrentLessonId] = useState<string>(course.lessons[0]?.id)
    const [videoPercent, setVideoPercent] = useState(0)
    const [mobileTab, setMobileTab] = useState<MobileTab>('content')
    const [progressMap, setProgressMap] = useState<Record<string, any>>(() =>
        filteredLessonProgress.reduce((acc: any, p: any) => {
            acc[p.lessonId] = p
            return acc
        }, {})
    )
    const [showContentModal, setShowContentModal] = useState(false)
    const [currentFormData, setCurrentFormData] = useState<{ reflection: string; links: string[]; supports: boolean[] } | null>(null)
    const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'loading' | 'success' | 'error' } | null>(null)
    const assignmentFormRef = useRef<(() => Promise<void>) | undefined>(undefined)
    const lastSavedPercentRef = useRef<number>(-1)
    const videoProgressRef = useRef<{ maxTime: number; duration: number } | null>(null)
    const prevMobileTabRef = useRef(mobileTab)
    useEffect(() => {
        setIsMounted(true)
        if (enrollment.lastLessonId) {
            setCurrentLessonId(enrollment.lastLessonId)
        } else {
            const incomplete = filteredLessonProgress
                .filter((p: any) => p.status !== 'COMPLETED')
                .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            if (incomplete[0]?.lessonId) {
                setCurrentLessonId(incomplete[0].lessonId)
            }
        }
    }, [])
    const notify = useCallback((text: string, type: 'loading' | 'success' | 'error' = 'success', duration = 3000) => {
        setStatusMsg({ text, type })
        if (type !== 'loading') {
            setTimeout(() => setStatusMsg(null), duration)
        }
    }, [])
    const checkIsOnTime = useCallback((startedAt: Date | null, lessonOrder: number): boolean => {
        if (!startedAt) return false
        const deadline = new Date(startedAt)
        deadline.setDate(deadline.getDate() + (lessonOrder - 1))
        deadline.setHours(23, 59, 59, 999)
        return new Date() <= deadline
    }, [])
    const [isMobile, setIsMobile] = useState(false)
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 767px)')
        setIsMobile(mq.matches)
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
        mq.addEventListener('change', handler)
        return () => mq.removeEventListener('change', handler)
    }, [])
    useEffect(() => {
        const handleTabChange = async () => {
            const prevTab = prevMobileTabRef.current
            const currentTab = mobileTab
            if (currentTab !== prevTab) {
                if (prevTab === 'record' && currentTab === 'content' && assignmentFormRef.current && !isSubmittingRef.current) {
                    await assignmentFormRef.current().catch(() => {})
                }
            }
            prevMobileTabRef.current = mobileTab
        }
        handleTabChange()
    }, [mobileTab])
    const handleLessonSelect = async (lessonId: string) => {
        if (isSubmittingRef.current) return
        if (assignmentFormRef.current) {
            await assignmentFormRef.current().catch(() => {})
        }
        if (currentLessonId && videoProgressRef.current) {
            await saveVideoProgressAction({
                enrollmentId: enrollment.id,
                lessonId: currentLessonId,
                maxTime: videoProgressRef.current.maxTime,
                duration: videoProgressRef.current.duration
            }).catch(() => {})
        }
        setCurrentLessonId(lessonId)
        setVideoPercent(0)
        setMobileTab('content')
        setShowContentModal(false)
        updateLastLessonAction(enrollment.id, lessonId).catch(() => {})
    }
    const handleVideoProgress = useCallback(async (maxTime: number, duration: number) => {
        if (!currentLessonId || duration === 0) return
        const pct = Math.min(100, Math.round((maxTime / duration) * 100))
        setVideoPercent(pct)
        videoProgressRef.current = { maxTime, duration }
        const threshold = Math.floor(pct / 10) * 10
        if ((threshold > lastSavedPercentRef.current || pct === 100) && threshold <= 100) {
            lastSavedPercentRef.current = threshold
            saveVideoProgressAction({ enrollmentId: enrollment.id, lessonId: currentLessonId, maxTime, duration }).catch(() => {})
        }
    }, [currentLessonId, enrollment.id])
    const handleSubmitAssignment = async (data: any, isUpdate: boolean = false) => {
        if (isSubmittingRef.current) return
        isSubmittingRef.current = true
        notify(isUpdate ? 'Đang cập nhật bài học...' : 'Đang chấm điểm...', 'loading')
        try {
            const currentProg = progressMap[currentLessonId!]
            const currentLessonData = course.lessons.find((l: any) => l.id === currentLessonId)
            const result = await submitAssignmentAction({
                enrollmentId: enrollment.id,
                lessonId: currentLessonId!,
                reflection: data.reflection,
                links: data.links,
                supports: data.supports,
                isUpdate,
                lessonOrder: currentLessonData?.order,
                startedAt: enrollment.startedAt,
                existingVideoScore: currentProg?.scores?.video,
                existingTimingScore: currentProg?.scores?.timing
            })
            if (!(result as any)?.success) {
                notify((result as any)?.message || 'Lỗi xử lý dữ liệu!', 'error')
                return
            }
            const res = result as any
            notify(res.totalScore >= 5 ? `✅ Hoàn thành! Điểm: ${res.totalScore}/10` : `📊 Đã ghi nhận: ${res.totalScore}/10đ`, 'success')
            const updatedProgress = {
                ...(progressMap[currentLessonId!] || {}),
                assignment: { reflection: data.reflection, links: data.links, supports: data.supports },
                status: res.totalScore >= 5 ? 'COMPLETED' : 'IN_PROGRESS',
                totalScore: res.totalScore
            }
            setProgressMap(prev => ({ ...prev, [currentLessonId!]: updatedProgress }))
            if (res.totalScore >= 5 && !isUpdate) {
                const currentIndex = course.lessons.findIndex((l: any) => l.id === currentLessonId)
                if (currentIndex < course.lessons.length - 1) {
                    setTimeout(() => handleLessonSelect(course.lessons[currentIndex + 1].id), 2000)
                }
            }
        } catch (error: any) {
            console.error("[SUBMIT-ERROR]", error)
            notify('Lỗi kết nối máy chủ!', 'error')
        } finally {
            isSubmittingRef.current = false
            setStatusMsg(null)
        }
    }
    const currentLesson = course.lessons.find((l: any) => l.id === currentLessonId)
    const currentProgress = progressMap[currentLessonId]
    const initialPercent = !currentLesson?.videoUrl ? 100 : (
        currentProgress?.duration ? (currentProgress.maxTime / currentProgress.duration) * 100 : 0
    )
    const completedCount = Object.values(progressMap).filter((p: any) => p.status === 'COMPLETED').length
    const startedAt = enrollment.startedAt ? new Date(enrollment.startedAt) : null
    if (!isMounted) {
        return <div className="h-screen w-full bg-black flex items-center justify-center text-zinc-700 font-mono text-xs">Đang tải ứng dụng...</div>
    }
    return (
        <div className="flex flex-col h-full bg-black text-zinc-300">
            {}
            <header className="h-14 shrink-0 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-900 z-50 fixed top-0 left-0 right-0">
                <div className="flex items-center gap-3 min-w-0">
                    <Link href="/" className="shrink-0 text-zinc-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="font-bold text-white truncate text-sm sm:text-base">{course.name_lop}</h1>
                </div>
                {statusMsg && (
                    <div className={`absolute left-1/2 -translate-x-1/2 top-16 px-4 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 transition-all duration-300 z-[100] ${
                        statusMsg.type === 'loading' ? 'bg-orange-500 text-white' :
                        statusMsg.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                    }`}>
                        {statusMsg.type === 'loading' && <Loader2 className="w-3 h-3 animate-spin" />}
                        {statusMsg.text}
                    </div>
                )}
                <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] sm:text-xs text-zinc-400 font-mono">{completedCount}/{course.lessons.length}</span>
                        <div className="relative h-2 w-16 sm:w-24 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${(completedCount / course.lessons.length) * 100}%` }} />
                        </div>
                        <span className="text-[10px] sm:text-xs font-bold text-emerald-400 min-w-[35px] text-right">
                            {Math.round((completedCount / course.lessons.length) * 100)}%
                        </span>
                    </div>
                </div>
            </header>
            <div className={`flex flex-1 min-h-0 pt-14 ${isMobile ? 'pb-14' : ''}`}>
                {!isMobile && (
                    <LessonSidebar
                        lessons={course.lessons}
                        currentLessonId={currentLessonId}
                        onLessonSelect={handleLessonSelect}
                        progress={progressMap}
                        startedAt={startedAt}
                        resetAt={enrollment.resetAt}
                        onResetStartDate={async (d: Date) => {
                            await confirmStartDateAction(course.id, d)
                            window.location.reload()
                        }}
                    />
                )}
                <main className="flex-1 flex flex-col min-h-0 overflow-hidden items-center bg-zinc-950">
                    <div className={isMobile ? 'shrink-0 w-full' : 'p-5 pb-0 shrink-0 w-full max-w-5xl'}>
                        <div className={isMobile ? '' : 'overflow-hidden border-2 border-white shadow-2xl bg-black'}>
                            <VideoPlayer
                                key={currentLessonId}
                                enrollmentId={enrollment.id}
                                lessonId={currentLessonId!}
                                videoUrl={currentLesson?.videoUrl || null}
                                lessonContent={currentLesson?.content || null}
                                initialMaxTime={currentProgress?.maxTime || 0}
                                playlistData={currentProgress?.scores?.playlist}
                                lastVideoIndex={currentProgress?.scores?.lastVideoIndex}
                                onProgress={handleVideoProgress}
                                onPercentChange={setVideoPercent}
                            />
                        </div>
                    </div>
                    {!isMobile && (
                        <div className="p-5 flex-1 flex flex-col gap-4 min-h-0 overflow-hidden w-full max-w-5xl">
                            <div className="shrink-0">
                                <h2 className="text-lg font-bold text-white">{currentLesson?.title}</h2>
                                {currentLesson?.content && !currentLesson.content.includes('docs.google.com') && (
                                    <div className="text-zinc-400 mt-1 text-sm leading-relaxed line-clamp-2 hover:line-clamp-none transition-all">{currentLesson.content}</div>
                                )}
                            </div>
                            <div className="flex-1 min-h-0 border border-zinc-800 rounded-xl bg-zinc-900/30 overflow-hidden">
                                <ChatSection lessonId={currentLessonId!} session={session} />
                            </div>
                        </div>
                    )}
                    {}
                    {isMounted && isMobile && (
                        <>
                            <div className="flex-1 min-h-0 w-full flex flex-col">
                                {mobileTab === 'list' && (
                                    <div className="flex-1 overflow-y-auto">
                                        <LessonSidebarMobile
                                            lessons={course.lessons}
                                            currentLessonId={currentLessonId}
                                            onLessonSelect={handleLessonSelect}
                                            progress={progressMap}
                                            startedAt={startedAt}
                                            onResetStartDate={async (d: Date) => { await confirmStartDateAction(course.id, d); window.location.reload(); }}
                                        />
                                    </div>
                                )}
                                {mobileTab === 'content' && (
                                    <div className="flex-1 flex flex-col min-h-0">
                                        <div className="px-4 py-4 bg-zinc-900 border-b border-zinc-800 shrink-0">
                                            <p className="text-base font-bold text-white leading-tight">{currentLesson?.title}</p>
                                            <button onClick={() => setShowContentModal(true)} className="text-xs text-orange-400 mt-2">Xem chi tiết nội dung →</button>
                                        </div>
                                        <div className="flex-1 min-h-0">
                                            <ChatSection lessonId={currentLessonId!} session={session} />
                                        </div>
                                    </div>
                                )}
                                {mobileTab === 'record' && (
                                    <div className="flex-1 overflow-hidden">
                                        <AssignmentForm
                                            key={currentLessonId}
                                            lessonId={currentLessonId!}
                                            lessonOrder={currentLesson?.order ?? 1}
                                            startedAt={startedAt}
                                            videoPercent={videoPercent}
                                            videoUrl={currentLesson?.videoUrl || null}
                                            onSubmit={handleSubmitAssignment}
                                            initialData={{ ...currentProgress, enrollmentId: enrollment.id }}
                                            onSaveDraft={assignmentFormRef}
                                            onFormDataChange={setCurrentFormData}
                                            onDraftSaved={(draftData) => {
                                                setProgressMap(prev => ({
                                                    ...prev,
                                                    [currentLessonId!]: { ...prev[currentLessonId!], assignment: { ...prev[currentLessonId!]?.assignment, ...draftData } }
                                                }))
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                            <nav className="h-14 bg-zinc-900 border-t border-zinc-800 flex fixed bottom-0 left-0 right-0 z-50">
                                {[
                                    { id: 'list', icon: ListVideo, label: 'Danh sách' },
                                    { id: 'content', icon: FileText, label: 'Nội dung' },
                                    { id: 'record', icon: ClipboardCheck, label: 'Ghi nhận' },
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setMobileTab(tab.id as MobileTab)}
                                        className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] ${mobileTab === tab.id ? 'text-orange-400 bg-orange-400/5 border-t-2 border-orange-400' : 'text-zinc-500'}`}
                                    >
                                        <tab.icon className="w-5 h-5" />
                                        {tab.label}
                                    </button>
                                ))}
                            </nav>
                        </>
                    )}
                </main>
                {!isMobile && (
                    <div className="w-[400px] shrink-0 border-l border-zinc-800 flex flex-col">
                        <AssignmentForm
                            key={currentLessonId}
                            lessonId={currentLessonId!}
                            lessonOrder={currentLesson?.order ?? 1}
                            startedAt={startedAt}
                            videoPercent={videoPercent}
                            videoUrl={currentLesson?.videoUrl || null}
                            onSubmit={handleSubmitAssignment}
                            initialData={{ ...currentProgress, enrollmentId: enrollment.id }}
                            onSaveDraft={assignmentFormRef}
                            onFormDataChange={setCurrentFormData}
                            onDraftSaved={(draftData) => {
                                setProgressMap(prev => ({
                                    ...prev,
                                    [currentLessonId!]: { ...prev[currentLessonId!], assignment: { ...prev[currentLessonId!]?.assignment, ...draftData } }
                                }))
                            }}
                        />
                    </div>
                )}
            </div>
            {}
            {showContentModal && (
                <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={() => setShowContentModal(false)}>
                    <div className="bg-zinc-900 rounded-2xl border border-zinc-700 max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
                            <h2 className="text-white font-bold text-sm truncate pr-4">{currentLesson?.title}</h2>
                            <button onClick={() => setShowContentModal(false)}><X className="w-5 h-5 text-zinc-400" /></button>
                        </div>
                        <div className="overflow-y-auto p-5 text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">
                            {currentLesson?.content}
                        </div>
                    </div>
                </div>
            )}
            <StartDateModal isOpen={!enrollment.startedAt} onConfirm={async (d) => { await confirmStartDateAction(course.id, d); window.location.reload(); }} />
        </div>
    )
}
function LessonSidebarMobile({ lessons, currentLessonId, onLessonSelect, progress, startedAt, onResetStartDate }: any) {
    const [showDatePicker, setShowDatePicker] = useState(false)
    const [dateInput, setDateInput] = useState(startedAt ? new Date(startedAt).toISOString().slice(0, 10) : '')
    const [saving, setSaving] = useState(false)
    // Lọc progress chỉ hiển thị các bài học không bị reset
    const filteredProgress = Object.entries(progress).reduce((acc: any, [id, p]: [string, any]) => {
        if (p.status !== 'RESET') acc[id] = p;
        return acc
    }, {})
    const handleReset = async () => {
        if (!dateInput) return
        const confirmReset = window.confirm("⚠️ Cảnh báo: Dữ liệu học tập cũ sẽ không được tính vào lộ trình mới.\n\nNhấn OK để xác nhận đổi ngày bắt đầu mới.")
        if (!confirmReset) return
        setSaving(true)
        try {
            await onResetStartDate(new Date(dateInput))
            setShowDatePicker(false)
        } finally {
            setSaving(false)
        }
    }
    const completedCount = lessons.filter((l: any) => filteredProgress[l.id]?.status === 'COMPLETED').length
    return (
        <div className="flex flex-col h-full w-full bg-zinc-900 overflow-hidden">
            {}
            <div className="shrink-0 bg-zinc-900 border-b border-zinc-800 p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <CalendarDays className="w-4 h-4 text-orange-400 shrink-0" />
                        <div>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Ngày bắt đầu</p>
                            <p className="text-sm font-bold text-white leading-tight">
                                {startedAt ? new Date(startedAt).toLocaleDateString('vi-VN') : '-- / -- / ----'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        className="flex items-center gap-1 text-[11px] text-orange-400 border border-orange-500/30 rounded-lg px-2.5 py-1 font-bold active:scale-95 transition-all"
                    >
                        <RefreshCw className="w-3 h-3" /> Đặt lại
                    </button>
                </div>
                {showDatePicker && (
                    <div className="bg-zinc-800 rounded-xl p-3 space-y-2.5 border border-zinc-700 shadow-xl">
                        <p className="text-[10px] text-zinc-400 font-medium">Chọn ngày mới cho lộ trình:</p>
                        <input
                            type="date"
                            value={dateInput}
                            onChange={e => setDateInput(e.target.value)}
                            className="w-full bg-zinc-700 text-white text-sm rounded-lg px-3 py-2 border border-zinc-600 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleReset}
                                disabled={!dateInput || saving}
                                className="flex-1 text-xs font-black bg-orange-500 text-white rounded-lg py-2 disabled:opacity-50"
                            >
                                {saving ? 'Đang lưu...' : 'XÁC NHẬN'}
                            </button>
                            <button
                                onClick={() => setShowDatePicker(false)}
                                className="flex-1 text-xs font-bold text-zinc-400 border border-zinc-700 rounded-lg py-2"
                            >
                                HỦY
                            </button>
                        </div>
                    </div>
                )}
            </div>
            {}
            <div className="shrink-0 px-4 py-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest text-white/60">Lộ trình học tập</span>
                <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                    {completedCount}/{lessons.length} BÀI
                </span>
            </div>
            {}
            <div className="flex-1 overflow-y-auto overscroll-contain">
                {lessons.map((lesson: any) => {
                    const prog = filteredProgress[lesson.id]
                    const isActive = currentLessonId === lesson.id
                    const unlocked = lesson.order === 1 || (filteredProgress[lessons.find((l:any)=>l.order===lesson.order-1)?.id]?.status === 'COMPLETED')
                    return (
                        <button
                            key={lesson.id}
                            onClick={() => unlocked && onLessonSelect(lesson.id)}
                            className={cn(
                                'w-full flex items-center gap-3 px-4 py-4 text-left border-b border-zinc-800/50 transition-all active:bg-zinc-800',
                                isActive && 'bg-zinc-800 border-l-4 border-l-orange-500',
                                !unlocked && 'opacity-40 grayscale'
                            )}
                        >
                            <div className="shrink-0">
                                {prog?.status === 'COMPLETED' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : isActive ? <PlayCircle className="w-5 h-5 text-orange-400 animate-pulse" /> : !unlocked ? <Lock className="w-4 h-4 text-zinc-600" /> : <div className="w-4 h-4 rounded-full border border-zinc-700 flex items-center justify-center text-[8px] text-zinc-500">{lesson.order}</div>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={cn('text-sm leading-snug', isActive ? 'text-white font-black' : 'text-zinc-400 font-medium')}>{lesson.title}</p>
                                {prog?.totalScore !== undefined && <p className={cn('text-[10px] mt-1 font-bold', prog.totalScore >= 5 ? 'text-emerald-500' : 'text-orange-400')}>{prog.totalScore >= 5 ? '✓' : '✗'} Kết quả: {prog.totalScore}/10đ</p>}
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
```
