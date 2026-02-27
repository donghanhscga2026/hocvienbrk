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

        if (result.success) {
            const userData = await getUserWithAccounts()
            if (userData) {
                setUser(userData as UserData)
                setAccounts(userData.accounts || [])
                setName(userData.name || '')
                setPhone(userData.phone || '')
                setAvatarUrl(userData.image || '')
            }
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

                {/* Avatar Section */}
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
                                    type="text" 
                                    placeholder="Nhập URL ảnh..."
                                    value={avatarUrl}
                                    onChange={(e) => setAvatarUrl(e.target.value)}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                            </label>
                        </div>
                        <div className="flex-1">
                            <p className="text-sm text-zinc-400 mb-2">Nhập URL ảnh đại diện:</p>
                            <input
                                type="text"
                                value={avatarUrl}
                                onChange={(e) => setAvatarUrl(e.target.value)}
                                placeholder="https://example.com/avatar.jpg"
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                            />
                        </div>
                    </div>
                </div>

                {/* Profile Info */}
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

                {/* Change Password */}
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
