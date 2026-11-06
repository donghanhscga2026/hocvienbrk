'use client'
import { useState } from 'react'
export default function OfferingServiceReply({
  id,
  version,
  value,
  onChange,
  onSaved,
}: {
  id: string
  version: number
  value: string
  onChange: (value: string) => void
  onSaved: () => void
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [conflict, setConflict] = useState(false)
  async function send(event: React.FormEvent) {
    event.preventDefault()
    if (busy || conflict || !value.trim()) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/crm/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, version, action: 'SEND_REPLY', publicReply: value }),
      })
      const data = await response.json()
      if (!response.ok) {
        if (response.status === 409) setConflict(true)
        throw new Error(data.error || 'Không gửi được phản hồi.')
      }
      onChange('')
      onSaved()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Không gửi được phản hồi.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <form onSubmit={send} className="space-y-3 border-t pt-3">
      <label className="block text-sm font-semibold">
        Phản hồi cho khách
        <textarea
          aria-label={'Phản hồi yêu cầu ' + id}
          maxLength={4000}
          rows={4}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="mt-2 w-full rounded-xl border bg-white p-3"
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      )}
      <button
        disabled={busy || conflict || !value.trim()}
        type="submit"
        className="min-h-12 rounded-xl bg-brk-primary px-4 font-semibold text-white disabled:opacity-40"
      >
        {busy ? 'Đang gửi…' : 'Gửi phản hồi'}
      </button>
      <p className="text-xs text-brk-muted">
        Phản hồi được gửi vào Yêu cầu của tôi và chuông thông báo của khách.
      </p>
    </form>
  )
}
