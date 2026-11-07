'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { startOfferingTrialAction } from '@/app/actions/offering-trial-actions'

export default function OfferingTrialStart({ slug, days }: { slug: string; days: number }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  async function start() {
    setPending(true)
    setError('')
    try {
      const result = await startOfferingTrialAction(slug)
      if (!result.ok) {
        setError(result.error || 'Không bắt đầu dùng thử được.')
        return
      }
      router.refresh()
    } catch {
      setError('Không bắt đầu dùng thử được. Vui lòng thử lại sau.')
    } finally {
      setPending(false)
    }
  }
  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pending}
        onClick={start}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brk-primary px-4 text-center font-semibold text-white disabled:opacity-60"
      >
        {pending ? 'Đang bắt đầu…' : `Dùng thử miễn phí ${days} ngày`}
      </button>
      <p className="text-center text-xs text-brk-muted">Mỗi tài khoản dùng thử 1 lần. Không tự động thu tiền.</p>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
    </div>
  )
}
