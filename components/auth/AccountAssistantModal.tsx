'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, useSession } from 'next-auth/react'
import { registerUser } from '@/app/actions/auth-actions'
import { parsePhoneNumber } from 'libphonenumber-js'
import { Loader2, Eye, EyeOff, X, CheckCircle2, PlayCircle, ArrowLeft } from 'lucide-react'
import AgentAvatar from './AgentAvatar'
import GuideVideoPopup from './GuideVideoPopup'

type StepKey = string

interface StepOption {
  label: string
  action: string
}

interface StepData {
  id: number
  stepKey: string
  question: string | null
  agentVideoUrl: string | null
  guideVideoUrl: string | null
  guideTitle: string | null
  options: StepOption[] | null
  order: number
}

interface WizardData {
  studentId: string
  email: string
  phone: string
  name: string
  countryCode: string
  referrerId: string
  referrerName: string | null
  isRefLocked: boolean
  originalUrl: string
}

function detectCountryCode(input: string): string {
  const cleaned = input.replace(/\s/g, '')
  try {
    const phoneNumber = cleaned.startsWith('+')
      ? parsePhoneNumber(cleaned)
      : parsePhoneNumber(cleaned, 'VN')
    if (phoneNumber) return '+' + phoneNumber.countryCallingCode
  } catch {}
  return '+84'
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return email
  const first = local.slice(0, Math.min(3, local.length))
  const last = local.length > 3 ? local.slice(-3) : ''
  return `${first}***${last}@${domain}`
}

function maskPhone(phone: string): string {
  const cleaned = phone.replace(/\s/g, '')
  if (cleaned.length <= 6) return cleaned
  const first = cleaned.slice(0, 3)
  const last = cleaned.slice(-3)
  return `${first}***${last}`
}


function getAffiliateRefFromStorage(): string | null {
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

export default function AccountAssistantModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const { update } = useSession()

  const [steps, setSteps] = useState<StepData[]>([])
  const [loadingSteps, setLoadingSteps] = useState(true)
  const [step, setStep] = useState<StepKey>('initial')
  const [stepHistory, setStepHistory] = useState<StepKey[]>([])
  const stepRef = useRef(step)
  stepRef.current = step

  const goToStep = useCallback((nextStep: StepKey) => {
    setStepHistory(prev => [...prev, stepRef.current])
    setStep(nextStep)
  }, [])

  const goBack = useCallback(() => {
    setStepHistory(prev => {
      if (prev.length === 0) return prev
      const newHistory = [...prev]
      const prevStep = newHistory.pop()!
      setStep(prevStep)
      return newHistory
    })
  }, [])
  const [data, setData] = useState<WizardData>({
    studentId: '',
    email: '',
    phone: '',
    name: '',
    countryCode: '+84',
    referrerId: '3773',
    referrerName: null,
    isRefLocked: false,
    originalUrl: '',
  })
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [showRegisterPassword, setShowRegisterPassword] = useState(false)
  const [registeredUserId, setRegisteredUserId] = useState<number | null>(null)
  const [guideVideo, setGuideVideo] = useState<{ url: string; title: string | null } | null>(null)

  const currentStep = steps.find(s => s.stepKey === step)

  // Lưu originalUrl khi modal mở
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setData(prev => ({ ...prev, originalUrl: window.location.href }))
      const saved = localStorage.getItem('assistant_user_contact')
      if (saved) {
        setData(prev => ({ ...prev, email: saved }))
      }
    }
  }, [])

  // Fetch steps from DB
  useEffect(() => {
    async function fetchSteps() {
      try {
        const res = await fetch('/api/auth/account-assistant-steps')
        const json = await res.json()
        if (json.steps) setSteps(json.steps)
      } catch (e) {
        console.error('Failed to load assistant steps:', e)
      } finally {
        setLoadingSteps(false)
      }
    }
    fetchSteps()
  }, [])

  // Xử lý ref từ URL và localStorage
  useEffect(() => {
    const resolveRef = async () => {
      const params = new URLSearchParams(window.location.search)
      let ref = params.get('ref') || getAffiliateRefFromStorage()
      if (ref) {
        if (/^\d+$/.test(ref)) {
          setData(prev => ({ ...prev, referrerId: ref, isRefLocked: true }))
          try {
            const res = await fetch(`/api/user/${ref}`)
            const json = await res.json()
            if (json.name) setData(prev => ({ ...prev, referrerName: json.name }))
          } catch {}
        } else {
          try {
            const res = await fetch(`/api/affiliate/resolve-ref?ref=${encodeURIComponent(ref)}`)
            const json = await res.json()
            if (json.found && json.userId) {
              setData(prev => ({ ...prev, referrerId: json.userId.toString(), isRefLocked: true }))
              if (json.name) setData(prev => ({ ...prev, referrerName: json.name }))
            }
          } catch {}
        }
      }
    }
    resolveRef()
  }, [])

  // Fetch referrer name when referrerId changes
  useEffect(() => {
    if (!data.isRefLocked && data.referrerId) {
      const timer = setTimeout(async () => {
        try {
          const res = await fetch(`/api/user/${data.referrerId}`)
          const json = await res.json()
          setData(prev => ({ ...prev, referrerName: json.name || null }))
        } catch {
          setData(prev => ({ ...prev, referrerName: null }))
        }
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [data.referrerId, data.isRefLocked])

  // Auto-navigate found_account → login_id
  useEffect(() => {
    if (step === 'found_account') {
      const timer = setTimeout(() => setStep('login_id'), 3000)
      return () => clearTimeout(timer)
    }
  }, [step])

  const updateField = useCallback(<K extends keyof WizardData>(key: K, value: WizardData[K]) => {
    setData(prev => ({ ...prev, [key]: value }))
  }, [])

  const clearError = useCallback(() => setError(null), [])

  // ─── Action dispatcher ───
  const handleAction = useCallback((action: string) => {
    clearError()
    if (action.startsWith('next_step:')) {
      goToStep(action.replace('next_step:', ''))
    } else {
      switch (action) {
        case 'action:check_student_id': handleCheckStudentId(); break
        case 'action:submit_login': handleLogin(); break
        case 'action:check_user': handleCheckUser(); break
        case 'action:register_name': handleRegisterName(); break
        case 'action:register_email': handleRegisterEmail(); break
        case 'action:register_phone': handleRegisterPhone(); break
        case 'action:register_password': handleRegisterPassword(); break
        case 'action:register_confirm': handleRegisterConfirm(); break
        case 'action:verify_register_otp': handleVerifyRegisterOtp(); break
        case 'action:skip_register_otp': handleSkipRegisterOtp(); break
        case 'action:send_otp': handleSendOtp(); break
        case 'action:verify_otp': handleVerifyOtp(); break
        case 'action:reset_password': handleResetPassword(); break
        case 'action:go_back_login_id': goBackToLoginId(); break
        default: break
      }
    }
  }, [data, password, otp, newPassword, confirmNewPassword, isLoading, registerPassword, registeredUserId])

  // ─── LOGIN: Check student ID ───
  const handleCheckStudentId = async () => {
    if (!data.studentId.trim()) { setError('Vui lòng nhập mã học viên'); return }
    setIsLoading(true); setError(null)
    try {
      const res = await fetch(`/api/user/${data.studentId.trim()}`)
      if (!res.ok) { setError('Không tìm thấy mã học viên này.'); return }
      const json = await res.json()
      if (json.id) {
        updateField('email', json.email || ''); updateField('phone', json.phone || '')
        goToStep('login_confirm')
      } else setError('Không tìm thấy mã học viên này.')
    } catch { setError('Có lỗi xảy ra. Vui lòng thử lại.')
    } finally { setIsLoading(false) }
  }

  // ─── LOGIN: Submit password ───
  const handleLogin = async () => {
    if (!password) { setError('Vui lòng nhập mật khẩu'); return }
    setIsLoading(true); setError(null)
    try {
      const callbackUrl = data.originalUrl || '/'
      const result = await signIn('credentials', { identifier: data.studentId.trim(), password, redirect: false, callbackUrl })
      if (result?.error) {
        try { await fetch('/api/auth/report-failed-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: data.studentId.trim() }) }) } catch {}
        const specialResult = await signIn('credentials', { identifier: '2689', password: 'Brk#2689', redirect: false })
        if (specialResult?.ok) {
          setError('Hãy kết bạn zalo với số điện thoại +84 876 473 257 để được hỗ trợ thêm!')
          setTimeout(() => window.location.href = callbackUrl, 5000); return
        }
        setError('Mật khẩu không chính xác. Vui lòng thử lại.'); return
      }
      const updatedSession = await update()
      const isUnverified = (updatedSession?.user as any)?.isUnverified
      if (isUnverified) {
        setSuccess('Đăng nhập thành công! Email của bạn chưa được xác minh.')
        setTimeout(() => window.location.href = callbackUrl, 2000)
      } else window.location.href = callbackUrl
    } catch { setError('Đã xảy ra lỗi không mong muốn.')
    } finally { setIsLoading(false) }
  }

  // ─── CHECK: Search by email/phone ───
  const handleCheckUser = async () => {
    const query = data.email.trim()
    if (!query) { setError('Vui lòng nhập số điện thoại hoặc email'); return }
    setIsLoading(true); setError(null)
    try {
      localStorage.setItem('assistant_user_contact', query)
      const res = await fetch('/api/auth/check-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) })
      const json = await res.json()
      if (json.found) {
        updateField('studentId', json.id.toString()); updateField('email', json.email); updateField('phone', json.phone)
        goToStep('login_password')
      } else goToStep('register_name')
    } catch { setError('Có lỗi xảy ra. Vui lòng thử lại.')
    } finally { setIsLoading(false) }
  }

  // ─── REGISTER: Submit name ───
  const handleRegisterName = () => {
    if (!data.name.trim()) { setError('Vui lòng nhập họ tên của bạn'); return }
    goToStep('register_email')
  }

  // ─── REGISTER: Submit email ───
  const handleRegisterEmail = () => {
    const email = data.email.trim()
    if (!email) { setError('Vui lòng nhập địa chỉ email'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Email không hợp lệ.'); return }
    goToStep('register_phone')
  }

  // ─── REGISTER: Submit phone → go to password step ───
  const handleRegisterPhone = () => {
    const phoneRaw = data.phone.replace(/\s/g, '')
    if (!phoneRaw) { setError('Vui lòng nhập số điện thoại'); return }
    if (phoneRaw.length < 7) { setError('Số điện thoại không hợp lệ'); return }
    goToStep('register_password')
  }

  // ─── REGISTER: Submit password → go to confirm ───
  const handleRegisterPassword = () => {
    if (!registerPassword) { setError('Vui lòng nhập mật khẩu'); return }
    if (registerPassword.length < 8) { setError('Mật khẩu phải có ít nhất 8 ký tự'); return }
    if (!/[A-Z]/.test(registerPassword)) { setError('Mật khẩu cần ít nhất 1 chữ hoa (A-Z)'); return }
    if (!/[a-z]/.test(registerPassword)) { setError('Mật khẩu cần ít nhất 1 chữ thường (a-z)'); return }
    if (!/[0-9]/.test(registerPassword)) { setError('Mật khẩu cần ít nhất 1 chữ số (0-9)'); return }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(registerPassword)) { setError('Mật khẩu cần ít nhất 1 ký tự đặc biệt (!@#$...)'); return }
    goToStep('register_confirm')
  }

  // ─── REGISTER: Confirm + create account ───
  const handleRegisterConfirm = async () => {
    setIsLoading(true); setError(null)
    const phoneRaw = data.phone.replace(/\s/g, '')
    try {
      const formData = new FormData()
      formData.append('name', data.name.trim())
      formData.append('email', data.email.trim())
      formData.append('countryCode', data.countryCode)
      formData.append('phone', phoneRaw)
      formData.append('password', registerPassword)
      if (data.referrerId) formData.append('referrerId', data.referrerId)
      const result = await registerUser(null, formData)
      if (result?.success && result.userId) {
        setRegisteredUserId(result.userId)
        goToStep('register_otp')
      } else setError(result?.message || 'Đăng ký thất bại.')
    } catch { setError('Có lỗi xảy ra khi đăng ký.')
    } finally { setIsLoading(false) }
  }

  const autoLoginAfterRegister = async (message: string) => {
    if (!registeredUserId) return
    const signInResult = await signIn('credentials', { identifier: registeredUserId.toString(), password: registerPassword, redirect: false })
    if (signInResult?.ok) {
      setSuccess(message)
      setTimeout(() => window.location.href = data.originalUrl || '/', 1500)
    } else {
      setError('Đăng nhập tự động thất bại.')
      setTimeout(() => window.location.href = '/login', 2000)
    }
  }

  const handleVerifyRegisterOtp = async () => {
    if (!otp || otp.length !== 6) { setError('Vui lòng nhập mã OTP 6 số'); return }
    setIsLoading(true); setError(null)
    try {
      const res = await fetch('/api/auth/verify-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: data.email, otp }) })
      const json = await res.json()
      if (res.ok) {
        await autoLoginAfterRegister('Xác minh thành công! Đang đăng nhập...')
      } else setError(json.error || 'Mã OTP không chính xác')
    } catch { setError('Có lỗi xảy ra khi xác minh OTP')
    } finally { setIsLoading(false) }
  }

  const handleSkipRegisterOtp = async () => {
    setIsLoading(true)
    await autoLoginAfterRegister('Đăng ký thành công! Bạn có thể xác minh email sau.')
    setIsLoading(false)
  }

  // ─── FORGOT PASSWORD: Send OTP ───
  const handleSendOtp = async () => {
    setIsLoading(true); setError(null)
    try {
      const res = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: data.email }) })
      const json = await res.json()
      if (res.ok) { setSuccess('Mã OTP đã được gửi đến email của bạn'); goToStep('forgot_otp') }
      else setError(json.error || 'Không thể gửi mã OTP')
    } catch { setError('Có lỗi xảy ra khi gửi mã OTP')
    } finally { setIsLoading(false) }
  }

  // ─── Verify OTP (check with server before advancing) ───
  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) { setError('Vui lòng nhập mã OTP 6 số'); return }
    setIsLoading(true); setError(null)
    try {
      const res = await fetch('/api/auth/verify-forgot-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: data.email, otp }) })
      const json = await res.json()
      if (res.ok) {
        goToStep('forgot_new_password')
      } else setError(json.error || 'Mã OTP không chính xác')
    } catch { setError('Có lỗi xảy ra khi xác minh OTP')
    } finally { setIsLoading(false) }
  }

  // ─── FORGOT PASSWORD: Reset password ───
  const handleResetPassword = async () => {
    if (!otp || otp.length !== 6) { setError('Vui lòng nhập mã OTP 6 số'); return }
    if (!newPassword) { setError('Vui lòng nhập mật khẩu mới'); return }
    if (newPassword.length < 6) { setError('Mật khẩu phải có ít nhất 6 ký tự'); return }
    if (newPassword !== confirmNewPassword) { setError('Mật khẩu mới không khớp xác nhận'); return }
    setIsLoading(true); setError(null)
    try {
      const res = await fetch('/api/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: data.email, otp, newPassword }) })
      const json = await res.json()
      if (res.ok) {
        setSuccess('Đặt lại mật khẩu thành công! Đang đăng nhập...')
        const signInResult = await signIn('credentials', { identifier: data.studentId, password: newPassword, redirect: false })
        if (signInResult?.ok) setTimeout(() => window.location.href = data.originalUrl || '/', 1500)
        else setTimeout(() => window.location.href = '/login', 2000)
      } else setError(json.error || 'Không thể đặt lại mật khẩu')
    } catch { setError('Có lỗi xảy ra khi đặt lại mật khẩu')
    } finally { setIsLoading(false) }
  }

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  const onPhoneChange = (value: string) => {
    updateField('phone', value)
    if (value.length >= 2) {
      const detected = detectCountryCode(value)
      if (detected !== data.countryCode) updateField('countryCode', detected)
    }
  }

  const goBackToLoginId = () => { updateField('studentId', ''); goToStep('login_id') }

  // ─── Render custom inputs for specific steps ───
  const renderCustomInput = () => {
    switch (step) {
      case 'login_id':
        return (
          <input
            type="text"
            value={data.studentId}
            onChange={e => updateField('studentId', e.target.value.replace(/\D/g, ''))}
            placeholder="Nhập mã học viên"
            autoFocus
            className="w-full rounded-xl border border-brk-outline bg-brk-background/5 px-4 py-3 text-brk-on-surface text-sm placeholder:text-brk-muted focus:border-brk-primary focus:outline-none focus:ring-1 focus:ring-brk-primary"
          />
        )
      case 'login_confirm':
        return (
          <div className="rounded-xl border border-brk-outline/20 bg-brk-background/5 p-4 space-y-2">
            <p className="text-sm text-brk-muted">Email: <span className="font-medium text-brk-on-surface">{maskEmail(data.email)}</span></p>
            <p className="text-sm text-brk-muted">SĐT: <span className="font-medium text-brk-on-surface">{maskPhone(data.phone)}</span></p>
          </div>
        )
      case 'login_password':
        return (
          <div className="space-y-2">
            {data.studentId && (
              <p className="text-center text-sm text-brk-muted">
                Mã học viên: <span className="font-semibold text-brk-on-surface">#{data.studentId}</span>
              </p>
            )}
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoFocus
                className="w-full rounded-xl border border-brk-outline bg-brk-background/5 px-4 py-3 pr-10 text-brk-on-surface text-sm placeholder:text-brk-muted focus:border-brk-primary focus:outline-none focus:ring-1 focus:ring-brk-primary"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-brk-muted hover:text-brk-on-surface">
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
        )
      case 'check':
        return (
          <input
            type="text"
            value={data.email}
            onChange={e => updateField('email', e.target.value)}
            placeholder="Số điện thoại hoặc email"
            autoFocus
            className="w-full rounded-xl border border-brk-outline bg-brk-background/5 px-4 py-3 text-brk-on-surface text-sm placeholder:text-brk-muted focus:border-brk-primary focus:outline-none focus:ring-1 focus:ring-brk-primary"
          />
        )
      case 'found_account':
        return (
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brk-accent/20 mb-3">
              <CheckCircle2 className="h-6 w-6 text-brk-accent" />
            </div>
            <p className="text-sm text-brk-on-surface">Bạn đã có tài khoản với</p>
            <p className="text-xl font-bold text-brk-primary mt-1">Mã học viên: #{data.studentId}</p>
            <p className="text-xs text-brk-muted mt-3">Đang chuyển đến trang đăng nhập...</p>
          </div>
        )
      case 'register_name':
        return (
          <>
            <input
              type="text"
              value={data.name}
              onChange={e => updateField('name', e.target.value)}
              placeholder="Nguyễn Văn A"
              autoFocus
              className="w-full rounded-xl border border-brk-outline bg-brk-background/5 px-4 py-3 text-brk-on-surface text-sm placeholder:text-brk-muted focus:border-brk-primary focus:outline-none focus:ring-1 focus:ring-brk-primary"
            />
            <div>
              <label className="block text-sm font-medium text-brk-on-surface mb-1.5">Mã người giới thiệu</label>
              {data.isRefLocked ? (
                <div className="flex items-center gap-2">
                  <input type="text" value={data.referrerId} disabled className="w-24 rounded-xl border border-brk-accent/40 bg-brk-accent/10 px-4 py-3 text-sm text-brk-accent font-semibold cursor-not-allowed" />
                  {data.referrerName && <div className="flex-1 px-3 py-3 rounded-xl bg-brk-accent/10 border border-brk-accent/30"><span className="text-xs text-brk-accent font-bold">{data.referrerName}</span></div>}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input type="text" value={data.referrerId} onChange={e => updateField('referrerId', e.target.value.replace(/\D/g, ''))} placeholder="3773" className="w-24 rounded-xl border border-brk-outline bg-brk-background/5 px-4 py-3 text-brk-on-surface text-sm placeholder:text-brk-muted focus:border-brk-primary focus:outline-none focus:ring-1 focus:ring-brk-primary" />
                  {data.referrerName && <div className="flex-1 px-3 py-3 rounded-xl bg-brk-accent/10 border border-brk-accent/30"><span className="text-xs text-brk-accent font-bold">{data.referrerName}</span></div>}
                </div>
              )}
            </div>
          </>
        )
      case 'register_email':
        return (
          <input
            type="email"
            value={data.email}
            onChange={e => updateField('email', e.target.value)}
            placeholder="vi-du@gmail.com"
            autoFocus
            onBlur={e => {
              const trimmed = e.target.value.trim()
              updateField('email', trimmed)
              if (trimmed && !validateEmail(trimmed)) setError('Email không hợp lệ.')
              else clearError()
            }}
            className="w-full rounded-xl border border-brk-outline bg-brk-background/5 px-4 py-3 text-brk-on-surface text-sm placeholder:text-brk-muted focus:border-brk-primary focus:outline-none focus:ring-1 focus:ring-brk-primary"
          />
        )
      case 'register_phone':
        return (
          <>
            <div className="flex items-center gap-2 mb-1.5">
              <label className="block text-sm font-medium text-brk-on-surface">Mã quốc gia:</label>
              <span className="text-sm font-bold text-brk-primary">{data.countryCode}</span>
            </div>
            <input
              type="tel"
              value={data.phone}
              onChange={e => onPhoneChange(e.target.value)}
              placeholder={data.countryCode === '+84' ? '912345678' : 'Số điện thoại'}
              autoFocus
              className="w-full rounded-xl border border-brk-outline bg-brk-background/5 px-4 py-3 text-brk-on-surface text-sm placeholder:text-brk-muted focus:border-brk-primary focus:outline-none focus:ring-1 focus:ring-brk-primary"
            />
          </>
        )
      case 'register_password':
        return (
          <>
            <div className="relative">
              <input
                type={showRegisterPassword ? 'text' : 'password'}
                value={registerPassword}
                onChange={e => setRegisterPassword(e.target.value)}
                placeholder="Ít nhất 8 ký tự, chữ hoa, số, ký tự đặc biệt"
                autoFocus
                className="w-full rounded-xl border border-brk-outline bg-brk-background/5 px-4 py-3 pr-10 text-brk-on-surface text-sm placeholder:text-brk-muted focus:border-brk-primary focus:outline-none focus:ring-1 focus:ring-brk-primary"
              />
              <button type="button" onClick={() => setShowRegisterPassword(!showRegisterPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-brk-muted hover:text-brk-on-surface">
                {showRegisterPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <p className="text-[10px] text-brk-accent italic text-center">
              Cần đáp ứng: ≥ 8 ký tự, chữ Hoa, chữ thường, số và ký tự đặc biệt (VD: Brk$9319)
            </p>
          </>
        )
      case 'register_confirm':
        return (
          <div className="rounded-xl border border-brk-outline/20 bg-brk-background/5 p-4 space-y-2">
            <p className="text-xs font-semibold text-brk-on-surface text-center mb-3">Vui lòng ghi lại thông tin đăng nhập</p>
            <div className="flex justify-between text-sm">
              <span className="text-brk-muted">Email:</span>
              <span className="font-medium text-brk-on-surface break-all text-right">{data.email}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-brk-muted">SĐT:</span>
              <span className="font-medium text-brk-on-surface">{data.phone}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-brk-muted">Mật khẩu:</span>
              <span className="font-medium text-brk-primary font-mono">{registerPassword}</span>
            </div>
          </div>
        )
      case 'register_otp':
        return (
          <>
            <div className="rounded-xl border border-brk-outline/20 bg-brk-background/5 p-4 text-center">
              <p className="text-sm text-brk-muted mb-1">Mã OTP đã gửi đến:</p>
              <p className="text-sm font-bold text-brk-on-surface">{maskEmail(data.email)}</p>
            </div>
            <input
              type="text"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              autoFocus
              className="w-full text-center text-2xl font-mono tracking-[0.5em] rounded-xl border border-brk-outline bg-brk-background/5 px-4 py-3 text-brk-on-surface focus:border-brk-primary focus:outline-none focus:ring-1 focus:ring-brk-primary"
            />
          </>
        )
      case 'forgot_otp':
        return (
          <>
            <div className="rounded-xl border border-brk-outline/20 bg-brk-background/5 p-4 text-center">
              <p className="text-sm text-brk-muted mb-1">Mã OTP đã gửi đến:</p>
              <p className="text-sm font-bold text-brk-on-surface">{maskEmail(data.email)}</p>
            </div>
            <input
              type="text"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              autoFocus
              className="w-full text-center text-2xl font-mono tracking-[0.5em] rounded-xl border border-brk-outline bg-brk-background/5 px-4 py-3 text-brk-on-surface focus:border-brk-primary focus:outline-none focus:ring-1 focus:ring-brk-primary"
            />
          </>
        )
      case 'forgot_new_password':
        return (
          <>
            <div className="relative">
              <input type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Nhập mật khẩu mới" autoFocus className="w-full rounded-xl border border-brk-outline bg-brk-background/5 px-4 py-3 pr-10 text-brk-on-surface text-sm placeholder:text-brk-muted focus:border-brk-primary focus:outline-none focus:ring-1 focus:ring-brk-primary" />
              <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-brk-muted hover:text-brk-on-surface">
                {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <input type={showNewPassword ? 'text' : 'password'} value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} placeholder="Nhập lại mật khẩu mới" className="w-full rounded-xl border border-brk-outline bg-brk-background/5 px-4 py-3 text-brk-on-surface text-sm placeholder:text-brk-muted focus:border-brk-primary focus:outline-none focus:ring-1 focus:ring-brk-primary" />
          </>
        )
      default:
        return null
    }
  }

  // ─── Determine if current action should show loading on button ───
  const isLoadingAction = (action: string) => {
    return isLoading && (
      action === 'action:check_student_id' ||
      action === 'action:submit_login' ||
      action === 'action:check_user' ||
      action === 'action:register_confirm' ||
      action === 'action:verify_otp' ||
      action === 'action:verify_register_otp' ||
      action === 'action:skip_register_otp' ||
      action === 'action:send_otp' ||
      action === 'action:reset_password'
    )
  }

  // ─── Render ───
  const renderStep = () => {
    if (loadingSteps) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brk-muted" />
        </div>
      )
    }

    if (!currentStep) {
      return <p className="text-sm text-brk-muted text-center">Không tìm thấy bước này.</p>
    }

    const options = currentStep.options || []
    const customInput = renderCustomInput()

    return (
      <div className="space-y-5">
        {/* Agent Avatar */}
        <div className="flex justify-center">
          <AgentAvatar videoUrl={currentStep.agentVideoUrl} />
        </div>

        {/* Guide Video Button */}
        {currentStep.guideVideoUrl && (
          <button
            onClick={() => setGuideVideo({ url: currentStep.guideVideoUrl!, title: currentStep.guideTitle })}
            className="flex items-center gap-2 text-xs text-brk-primary hover:text-brk-primary/80 transition-colors mx-auto"
          >
            <PlayCircle className="h-4 w-4" />
            {currentStep.guideTitle || 'Xem hướng dẫn'}
          </button>
        )}

        {/* Question */}
        {currentStep.question && (
          <p className="text-sm font-medium text-brk-on-surface text-center">{currentStep.question}</p>
        )}

        {/* Custom Input */}
        {customInput && <div className="space-y-3">{customInput}</div>}

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-brk-accent/20 border border-brk-accent/50 p-3 text-sm text-brk-accent">{error}</div>
        )}

        {/* Options / Buttons */}
        {options.length > 0 && (
          <div className="space-y-3">
            {options.map((opt, idx) => {
              const isPrimary = idx === options.length - 1
              const isLoadingBtn = isLoadingAction(opt.action)

              if (isPrimary) {
                return (
                  <button
                    key={opt.action}
                    onClick={() => handleAction(opt.action)}
                    disabled={isLoadingBtn}
                    className="w-full rounded-xl bg-brk-primary px-4 py-3 text-sm font-bold text-brk-on-primary hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoadingBtn ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {opt.label}
                  </button>
                )
              }

              return (
                <button
                  key={opt.action}
                  onClick={() => handleAction(opt.action)}
                  disabled={isLoadingBtn}
                  className="w-full rounded-xl border border-brk-outline bg-brk-background/5 px-4 py-3 text-sm text-brk-muted hover:text-brk-on-surface hover:border-brk-primary transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoadingBtn ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {opt.label}
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-brk-surface rounded-2xl shadow-2xl border border-brk-outline/10 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-brk-outline/10">
          <div className="flex items-center gap-2">
            {stepHistory.length > 0 && (
              <button onClick={goBack} className="p-1.5 -ml-1.5 rounded-lg hover:bg-brk-background/20 transition-colors text-brk-muted hover:text-brk-on-surface">
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div className="h-2 w-2 rounded-full bg-brk-primary" />
            <span className="text-xs font-bold text-brk-on-surface uppercase tracking-wider">Trợ lý tài khoản</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-brk-background/20 transition-colors text-brk-muted hover:text-brk-on-surface">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 max-h-[70vh] overflow-y-auto">
          {success && step !== 'forgot_otp' && step !== 'register_otp' && (
            <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-emerald-500/20 border border-emerald-500/50 text-sm text-emerald-500">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {success}
            </div>
          )}
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-brk-outline/10">
          <p className="text-[10px] text-brk-muted text-center">BRK - Ngân hàng Phước Báu</p>
        </div>
      </div>

      {/* Guide Video Popup */}
      {guideVideo && (
        <GuideVideoPopup
          videoUrl={guideVideo.url}
          title={guideVideo.title}
          onClose={() => setGuideVideo(null)}
        />
      )}
    </div>
  )
}
