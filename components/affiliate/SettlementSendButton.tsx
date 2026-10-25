'use client'

/**
 * Nút gửi báo cáo quyết toán qua email cho 1 giảng viên (Gói 2 affiliate).
 * Trạng thái "đã gửi" lấy từ ActivityLog SETTLEMENT_SENT do server truyền xuống;
 * sau khi gửi thành công, cập nhật ngay tại chỗ. Gửi lại được phép.
 */
import { useState } from 'react'

export default function SettlementSendButton({
  teacherId,
  period,
  sentAt,
}: {
  teacherId: number
  period: string
  sentAt: string | null
}) {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState<string | null>(sentAt)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const fmtSent = (iso: string) =>
    new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Saigon', hour12: false })

  const send = async () => {
    setSending(true)
    setMsg(null)
    try {
      const res = await fetch('/api/affiliate/settlement/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId, period }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMsg({ ok: false, text: data.error || 'Gửi thất bại' })
      } else {
        setSent(data.sentAt || new Date().toISOString())
        setMsg({ ok: true, text: `Đã gửi tới ${data.sentTo}` })
      }
    } catch {
      setMsg({ ok: false, text: 'Lỗi mạng, thử lại sau' })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex items-center gap-2 print:hidden">
      {sent && (
        <span className="text-xs font-medium text-emerald-600">Đã gửi {fmtSent(sent)}</span>
      )}
      <button
        onClick={send}
        disabled={sending}
        className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:bg-gray-300"
      >
        {sending ? 'Đang gửi...' : sent ? '✉ Gửi lại' : '✉ Gửi email báo cáo'}
      </button>
      {msg && (
        <span className={`text-xs ${msg.ok ? 'text-emerald-600' : 'text-red-600'}`}>{msg.text}</span>
      )}
    </div>
  )
}
