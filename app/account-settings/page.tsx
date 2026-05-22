'use client'

import { useState, useEffect } from 'react'
import { getUserWithAccounts, updateUserProfile, changePassword } from '@/app/actions/account-actions'
import { Camera, User, Phone, Mail, Key, Check, AlertCircle, Loader2, ArrowLeft, Eye, EyeOff, Hash } from 'lucide-react'
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
    const [hasPassword, setHasPassword] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    // Form states
    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [avatarUrl, setAvatarUrl] = useState('')
    
    // Password states
    const [showPasswordForm, setShowPasswordForm] = useState(false)
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isSavingPassword, setIsSavingPassword] = useState(false)
    // Toggle show/hide password
    const [showCurrentPwd, setShowCurrentPwd] = useState(false)
    const [showNewPwd, setShowNewPwd] = useState(false)
    const [showConfirmPwd, setShowConfirmPwd] = useState(false)

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

    // Kiểm tra user có password thật không (an toàn, không expose hash)
    useEffect(() => {
        async function checkPassword() {
            try {
                const res = await fetch('/api/auth/has-password')
                if (res.ok) {
                    const data = await res.json()
                    setHasPassword(data.hasPassword)
                }
            } catch (error) {
                console.error('Error checking password:', error)
            }
        }
        if (user) checkPassword()
    }, [user])

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

    // Hàm tối ưu ảnh đại diện: Nén về 400x400px, giữ tỷ lệ vuông (crop cover)
    function resizeImage(base64: string, targetWidth = 400, targetHeight = 400): Promise<string> {
        return new Promise((resolve, reject) => {
            const img = new Image()
            img.onload = () => {
                const canvas = document.createElement('canvas')
                canvas.width = targetWidth
                canvas.height = targetHeight
                const ctx = canvas.getContext('2d')
                if (!ctx) {
                    reject(new Error('Cannot get canvas context'))
                    return
                }

                // Logic crop cover để giữ tỷ lệ khung hình
                const scale = Math.max(targetWidth / img.width, targetHeight / img.height)
                const scaledWidth = img.width * scale
                const scaledHeight = img.height * scale
                const dx = (targetWidth - scaledWidth) / 2
                const dy = (targetHeight - scaledHeight) / 2

                // Vẽ ảnh với chất lượng cao
                ctx.imageSmoothingEnabled = true
                ctx.imageSmoothingQuality = 'high'
                ctx.drawImage(img, dx, dy, scaledWidth, scaledHeight)
                
                // Chuyển thành base64 với chất lượng 90% (tối ưu nét)
                const resized = canvas.toDataURL('image/jpeg', 0.9)
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

        // Kiểm tra kích thước file (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setMessage({ type: 'error', text: 'Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 5MB' })
            return
        }

        // Kiểm tra loại file
        if (!file.type.startsWith('image/')) {
            setMessage({ type: 'error', text: 'Vui lòng chọn file ảnh' })
            return
        }

        // Đọc file và convert thành base64
        const reader = new FileReader()
        reader.onload = async (event) => {
            try {
                const result = event.target?.result as string
                // Tối ưu ảnh đại diện về chuẩn 400x400px sắc nét
                const resized = await resizeImage(result, 400, 400)
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

    // Tải và nén ảnh từ URL (khi user dán link)
    async function handleUrlAvatarChange(e: React.FocusEvent<HTMLInputElement>) {
        const url = e.target.value.trim()
        if (!url) return

        // Nếu đã là base64 thì không cần tải lại
        if (url.startsWith('data:')) return

        setMessage({ type: 'success', text: 'Đang tải ảnh...' })

        try {
            // Tải ảnh qua proxy API (bỏ qua CORS)
            const response = await fetch('/api/upload/url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            })
            const data = await response.json()
            
            if (!data.success || !data.base64) {
                setMessage({ type: 'error', text: data.error || 'URL không trỏ đến một ảnh hợp lệ' })
                return
            }

            // Nén ảnh về 50x50px từ chuỗi base64 trả về
            const resized = await resizeImage(data.base64, 50, 50)
            setAvatarUrl(resized)
            setMessage({ type: 'success', text: 'Ảnh đã được tải và nén!' })
        } catch (error) {
            setMessage({ type: 'error', text: 'Không thể tải ảnh từ URL này' })
        }
    }

    // Validation mật khẩu nhất quán với trang register
    function validateNewPassword(pwd: string): string | null {
        if (pwd.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự'
        if (!/[A-Z]/.test(pwd)) return 'Cần ít nhất 1 chữ hoa (A-Z)'
        if (!/[a-z]/.test(pwd)) return 'Cần ít nhất 1 chữ thường (a-z)'
        if (!/[0-9]/.test(pwd)) return 'Cần ít nhất 1 chữ số (0-9)'
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) return 'Cần ít nhất 1 ký tự đặc biệt (!@#$...)'
        return null
    }

    async function handleChangePassword(e: React.FormEvent) {
        e.preventDefault()
        setMessage(null)

        // Validate client-side trước
        const pwdError = validateNewPassword(newPassword)
        if (pwdError) {
            setMessage({ type: 'error', text: pwdError })
            return
        }

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'Xác nhận mật khẩu không khớp với mật khẩu mới' })
            return
        }

        setIsSavingPassword(true)

        const result = await changePassword(currentPassword, newPassword)
        
        setMessage({
            type: result.success ? 'success' : 'error',
            text: result.message
        })

        if (result.success) {
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
            setShowCurrentPwd(false)
            setShowNewPwd(false)
            setShowConfirmPwd(false)
            setShowPasswordForm(false)
        }
        setIsSavingPassword(false)
    }

    const hasGoogle = accounts.some(a => a.provider === 'google')

    const userInitials = user?.name 
        ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
        : '?'

    if (loading) {
        return (
            <div className="min-h-screen bg-brk-surface flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-brk-primary" />
            </div>
        )
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-brk-surface flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-brk-accent mx-auto mb-4" />
                    <p className="text-brk-on-surface">Vui lòng đăng nhập để truy cập</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-brk-surface py-12 px-4">
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/" className="shrink-0 p-2 rounded-lg bg-brk-background text-brk-muted hover:text-brk-on-surface hover:bg-brk-surface transition-colors">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <h1 className="text-2xl font-bold text-brk-on-surface">Cài đặt tài khoản</h1>
                </div>

                {message && (
                    <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
                        message.type === 'success' 
                            ? 'bg-green-500/10 border border-green-500/50 text-green-400' 
                            : 'bg-red-500/10 border border-red-500/50 text-red-400'
                    }`}>
                        {message.type === 'success' 
                            ? <Check className="h-5 w-5 shrink-0" /> 
                            : <AlertCircle className="h-5 w-5 shrink-0" />}
                        <span>{message.text}</span>
                    </div>
                )}

                {/* Avatar Section */}
                <div className="bg-brk-background rounded-2xl border border-brk-outline p-6 mb-6">
                    <h2 className="text-lg font-semibold text-brk-on-surface mb-4">Ảnh đại diện</h2>
                    <div className="flex items-center gap-6">
                        <div className="relative">
                            {avatarUrl ? (
                                <img 
                                    src={avatarUrl} 
                                    alt="Avatar" 
                                    className="w-24 h-24 rounded-full object-cover border-4 border-brk-outline"
                                />
                            ) : (
                                <div className="w-24 h-24 rounded-full bg-brk-primary flex items-center justify-center text-3xl font-black text-brk-on-primary border-4 border-brk-outline">
                                    {userInitials}
                                </div>
                            )}
                            <label className="absolute bottom-0 right-0 bg-brk-primary p-2 rounded-full cursor-pointer hover:bg-brk-primary transition-colors">
                                <Camera className="h-4 w-4 text-brk-on-primary" />
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    onChange={handleAvatarChange}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                            </label>
                        </div>
                        <div className="flex-1">
                            <p className="text-sm text-brk-muted mb-2">Dán link ảnh (Drive, PostImg, ...):</p>
                            <input
                                type="text"
                                value={avatarUrl}
                                onChange={(e) => setAvatarUrl(e.target.value)}
                                onBlur={handleUrlAvatarChange}
                                placeholder="https://drive.google.com/... hoặc https://postimg.cc/..."
                                className="w-full bg-brk-background border border-brk-outline rounded-lg px-4 py-2 text-brk-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-brk-primary"
                            />
                            <p className="text-xs text-brk-muted mt-2">Hệ thống sẽ tự động tải và nén ảnh về 50x50px</p>
                        </div>
                    </div>
                </div>

                {/* Profile Info */}
                <div className="bg-brk-background rounded-2xl border border-brk-outline p-6 mb-6">
                    <h2 className="text-lg font-semibold text-brk-on-surface mb-4">Thông tin tài khoản</h2>
                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                        <div>
                            <label className="block text-sm text-brk-muted mb-2">
                                <Hash className="inline h-4 w-4 mr-2" />
                                ID Học viên
                            </label>
                            <input
                                type="text"
                                value={user.id}
                                disabled
                                className="w-full bg-brk-background border border-brk-outline rounded-lg px-4 py-3 text-brk-muted cursor-not-allowed font-mono"
                            />
                            <p className="text-xs text-brk-muted mt-1">ID định danh duy nhất của bạn trên hệ thống</p>
                        </div>
                        <div>
                            <label className="block text-sm text-brk-muted mb-2">
                                <User className="inline h-4 w-4 mr-2" />
                                Họ và tên
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-brk-background border border-brk-outline rounded-lg px-4 py-3 text-brk-on-surface focus:outline-none focus:ring-2 focus:ring-brk-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-brk-muted mb-2">
                                <Mail className="inline h-4 w-4 mr-2" />
                                Email
                            </label>
                            <input
                                type="email"
                                value={user.email || ''}
                                disabled
                                className="w-full bg-brk-background border border-brk-outline rounded-lg px-4 py-3 text-brk-muted cursor-not-allowed"
                            />
                            <p className="text-xs text-brk-muted mt-1">Email không thể thay đổi</p>
                        </div>
                        <div>
                            <label className="block text-sm text-brk-muted mb-2">
                                <Phone className="inline h-4 w-4 mr-2" />
                                Số điện thoại
                            </label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="Nhập số điện thoại"
                                className="w-full bg-brk-background border border-brk-outline rounded-lg px-4 py-3 text-brk-on-surface focus:outline-none focus:ring-2 focus:ring-brk-primary"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full bg-brk-primary hover:bg-brk-primary-hover text-brk-on-surface font-bold py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                            Lưu thay đổi
                        </button>
                    </form>
                </div>

                {/* Connected Accounts */}
                <div className="bg-brk-background rounded-2xl border border-brk-outline p-6 mb-6">
                    <h2 className="text-lg font-semibold text-brk-on-surface mb-4">Tài khoản liên kết</h2>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-brk-background rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-brk-primary rounded-full flex items-center justify-center">
                                    <span className="text-brk-on-primary font-bold text-sm">G</span>
                                </div>
                                <div>
                                    <p className="text-brk-on-surface font-medium">Google</p>
                                    <p className="text-xs text-brk-muted">{hasGoogle ? 'Đã liên kết' : 'Chưa liên kết'}</p>
                                </div>
                            </div>
                            {hasGoogle && (
                                <span className="text-brk-accent text-sm">✓</span>
                            )}
                        </div>
                        <div className="flex items-center justify-between p-3 bg-brk-background rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-brk-primary rounded-full flex items-center justify-center">
                                    <span className="text-brk-on-primary font-bold text-sm">f</span>
                                </div>
                                <div>
                                    <p className="text-brk-on-surface font-medium">Facebook</p>
                                    <p className="text-xs text-brk-muted">Chưa liên kết</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Change Password */}
                {hasPassword && (
                    <div className="bg-brk-background rounded-2xl border border-brk-outline p-6">
                        <h2 className="text-lg font-semibold text-brk-on-surface mb-4">Đổi mật khẩu</h2>
                        {!showPasswordForm ? (
                            <button
                                onClick={() => setShowPasswordForm(true)}
                                className="flex items-center gap-2 text-brk-primary hover:text-brk-primary-hover transition-colors"
                            >
                                <Key className="h-4 w-4" />
                                Đổi mật khẩu
                            </button>
                        ) : (
                            <form onSubmit={handleChangePassword} className="space-y-4">
                                {/* Mật khẩu hiện tại */}
                                <div>
                                    <label className="block text-sm text-brk-muted mb-2">Mật khẩu hiện tại</label>
                                    <div className="relative">
                                        <input
                                            type={showCurrentPwd ? 'text' : 'password'}
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            required
                                            placeholder="Nhập mật khẩu hiện tại"
                                            className="w-full bg-brk-background border border-brk-outline rounded-lg px-4 py-3 pr-12 text-brk-on-surface focus:outline-none focus:ring-2 focus:ring-brk-primary"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-brk-muted hover:text-brk-on-surface transition-colors"
                                        >
                                            {showCurrentPwd ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>
                                {/* Mật khẩu mới */}
                                <div>
                                    <label className="block text-sm text-brk-muted mb-2">Mật khẩu mới</label>
                                    <div className="relative">
                                        <input
                                            type={showNewPwd ? 'text' : 'password'}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            required
                                            placeholder="Ít nhất 8 ký tự, chữ hoa, số, ký tự đặc biệt"
                                            className="w-full bg-brk-background border border-brk-outline rounded-lg px-4 py-3 pr-12 text-brk-on-surface focus:outline-none focus:ring-2 focus:ring-brk-primary"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPwd(!showNewPwd)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-brk-muted hover:text-brk-on-surface transition-colors"
                                        >
                                            {showNewPwd ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                    <p className="mt-1 text-[11px] text-brk-muted italic">
                                        Yêu cầu: ≥ 8 ký tự, 1 chữ Hoa, 1 chữ thường, 1 số, 1 ký tự đặc biệt (vd: Brk$9319)
                                    </p>
                                </div>
                                {/* Xác nhận mật khẩu */}
                                <div>
                                    <label className="block text-sm text-brk-muted mb-2">Xác nhận mật khẩu mới</label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPwd ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            placeholder="Nhập lại mật khẩu mới"
                                            className={`w-full bg-brk-background border rounded-lg px-4 py-3 pr-12 text-brk-on-surface focus:outline-none focus:ring-2 focus:ring-brk-primary ${
                                                confirmPassword && confirmPassword !== newPassword
                                                    ? 'border-red-500/60 focus:ring-red-500'
                                                    : 'border-brk-outline'
                                            }`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-brk-muted hover:text-brk-on-surface transition-colors"
                                        >
                                            {showConfirmPwd ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                    {/* Inline feedback khớp mật khẩu */}
                                    {confirmPassword && confirmPassword !== newPassword && (
                                        <p className="mt-1 text-[11px] text-red-400">Mật khẩu chưa khớp</p>
                                    )}
                                    {confirmPassword && confirmPassword === newPassword && newPassword && (
                                        <p className="mt-1 text-[11px] text-green-400 flex items-center gap-1"><Check className="h-3 w-3" /> Mật khẩu khớp</p>
                                    )}
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowPasswordForm(false)
                                            setCurrentPassword('')
                                            setNewPassword('')
                                            setConfirmPassword('')
                                            setShowCurrentPwd(false)
                                            setShowNewPwd(false)
                                            setShowConfirmPwd(false)
                                            setMessage(null)
                                        }}
                                        className="flex-1 bg-brk-background hover:bg-brk-surface text-brk-on-surface font-medium py-3 rounded-xl transition-colors border border-brk-outline"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSavingPassword}
                                        className="flex-1 bg-brk-primary hover:bg-brk-primary-hover text-brk-on-surface font-bold py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isSavingPassword ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Key className="h-4 w-4" /> Xác nhận đổi</>}
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
