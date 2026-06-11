'use client'

import { useState } from 'react'
import { resendVerificationAction } from '@/app/actions/admin-actions'
import { Mail, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ResendVerificationButton({ studentId, studentEmail }: { studentId: number; studentEmail: string }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleResend = async () => {
    setStatus('loading')
    setMessage('')
    try {
      const res = await resendVerificationAction(studentId)
      if (res.success) {
        setStatus('success')
        setMessage(res.message || 'Đã gửi OTP thành công!')
      } else {
        setStatus('error')
        setMessage(res.error || 'Lỗi không xác định')
      }
    } catch {
      setStatus('error')
      setMessage('Lỗi kết nối server')
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={handleResend}
        disabled={status === 'loading'}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2"
      >
        {status === 'loading' ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Đang gửi...</>
        ) : (
          <><Mail className="w-4 h-4" /> Gửi lại mã xác minh</>
        )}
      </Button>
      {status === 'success' && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 p-2.5 rounded-xl">
          <CheckCircle className="w-4 h-4 shrink-0" />
          {message}
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 p-2.5 rounded-xl">
          <XCircle className="w-4 h-4 shrink-0" />
          {message}
        </div>
      )}
    </div>
  )
}
