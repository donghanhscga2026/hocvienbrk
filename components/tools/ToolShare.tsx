'use client'

import { useRef, useState } from 'react'
import { Copy, Share2, X } from 'lucide-react'

interface Props { name: string; url: string; userId?: number }

// Dùng chung cho tiện ích công khai và công cụ cá nhân; dialog hỗ trợ bàn phím và Escape.
export default function ToolShare({ name, url, userId }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [shareUrl, setShareUrl] = useState('')
  const [message, setMessage] = useState('')
  const [copying, setCopying] = useState(false)
  function open() {
    const target = new URL(url, window.location.origin)
    if (!['http:', 'https:'].includes(target.protocol)) return
    // ID 0 vẫn là mã giới thiệu hợp lệ; không nối thêm ref trùng lặp.
    if (userId != null) target.searchParams.set('ref', String(userId))
    setShareUrl(target.toString())
    setMessage('')
    dialog.current?.showModal()
  }
  async function copy() {
    setCopying(true)
    try {
      await navigator.clipboard.writeText(shareUrl)
      setMessage('Đã sao chép liên kết.')
      // Giữ cơ chế ghi nhận lượt chia sẻ của trang công cụ cũ.
      if (userId != null) void fetch('/api/track/click?url=' + encodeURIComponent(shareUrl) + '&code=' + userId, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ref: String(userId) }),
      }).catch(() => { /* Không chặn chia sẻ khi ghi nhận lượt giới thiệu thất bại. */ })
    } catch { setMessage('Chưa sao chép được. Bạn có thể chọn và sao chép liên kết bên dưới.') }
    finally { setCopying(false) }
  }
  return <>
    <button type="button" aria-label={'Chia sẻ ' + name} onClick={open} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-brk-primary hover:bg-brk-background"><Share2 className="h-4 w-4" aria-hidden /></button>
    <dialog ref={dialog} aria-label={'Chia sẻ ' + name} className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-md rounded-2xl border border-brk-outline bg-brk-surface p-5 text-brk-on-surface shadow-xl backdrop:bg-black/50">
      <div className="flex items-center justify-between gap-3"><h2 className="min-w-0 break-words text-lg font-semibold">Chia sẻ {name}</h2><button type="button" aria-label="Đóng chia sẻ" onClick={() => dialog.current?.close()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"><X className="h-5 w-5" aria-hidden /></button></div>
      <p className="mt-2 text-sm text-brk-muted">{userId != null ? 'Liên kết có mã giới thiệu của bạn.' : 'Gửi liên kết này để chia sẻ tiện ích.'}</p>
      <label className="mt-4 block text-sm font-medium">Liên kết chia sẻ<input readOnly value={shareUrl} onFocus={event => event.target.select()} className="mt-2 block min-h-11 w-full min-w-0 rounded-xl border border-brk-outline bg-brk-background p-3 text-sm" /></label>
      <button type="button" disabled={copying} onClick={copy} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brk-primary px-4 text-sm font-semibold text-brk-on-primary disabled:opacity-60"><Copy className="h-4 w-4" aria-hidden />{copying ? 'Đang sao chép…' : 'Sao chép liên kết'}</button>
      <p role="status" className="mt-3 text-sm">{message}</p>
    </dialog>
  </>
}
