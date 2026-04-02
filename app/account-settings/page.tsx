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

    // Form states
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

    // Hàm nén ảnh về kích thước 50x50px
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
                // Vẽ ảnh thu nhỏ
                ctx.drawImage(img, 0, 0, maxWidth, maxHeight)
                // Chuyển thành base64 với chất lượng 70%
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
                // Nén ảnh về 50x50px
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

    // Tải và nén ảnh từ URL (khi user dán link)
    async function handleUrlAvatarChange(e: React.FocusEvent<HTMLInputElement>) {
        const url = e.target.value.trim()
        if (!url) return

        // Nếu đã là base64 thì không cần tải lại
        if (url.startsWith('data:')) return

        setMessage({ type: 'success', text: 'Đang tải ảnh...' })

        try {
            // Tải ảnh từ URL
            const response = await fetch(url)
            if (!response.ok) throw new Error('Cannot download image')
            
            const blob = await response.blob()
            
            // Kiểm tra loại file
            if (!blob.type.startsWith('image/')) {
                setMessage({ type: 'error', text: 'URL không phải là ảnh hợp lệ' })
                return
            }

            // Convert blob to base64
            const reader = new FileReader()
            reader.onload = async (event) => {
                try {
                    const result = event.target?.result as string
                    // Nén ảnh về 50x50px
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
                            ? 'bg-brk-accent-20 border border-brk-accent text-brk-accent' 
                            : 'bg-brk-accent-20 border border-brk-accent text-brk-accent'
                    }`}>
                        {message.type === 'success' ? <Check className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                        {message.text}
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
                                <div>
                                    <label className="block text-sm text-brk-muted mb-2">Mật khẩu hiện tại</label>
                                    <input
                                        type="password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        required
                                        className="w-full bg-brk-background border border-brk-outline rounded-lg px-4 py-3 text-brk-on-surface focus:outline-none focus:ring-2 focus:ring-brk-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-brk-muted mb-2">Mật khẩu mới</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                        className="w-full bg-brk-background border border-brk-outline rounded-lg px-4 py-3 text-brk-on-surface focus:outline-none focus:ring-2 focus:ring-brk-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-brk-muted mb-2">Xác nhận mật khẩu mới</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        className="w-full bg-brk-background border border-brk-outline rounded-lg px-4 py-3 text-brk-on-surface focus:outline-none focus:ring-2 focus:ring-brk-primary"
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
                                        className="flex-1 bg-brk-background hover:bg-brk-surface text-brk-on-surface font-medium py-3 rounded-xl transition-colors"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex-1 bg-brk-primary hover:bg-brk-primary-hover text-brk-on-surface font-bold py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
