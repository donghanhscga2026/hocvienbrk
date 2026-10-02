'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell, X } from 'lucide-react'

type Preview = { pushEnabled?: boolean; pushRecipientCount?: number; pushDeviceCount?: number; recipientCount: number; defaultTitle: string; lastSent: { createdAt: string; recipientCount: number } | null }
export function LessonAnnouncementModal({ courseId, lesson, onClose }: { courseId: string; lesson: { id: string; title: string }; onClose: () => void }) {
  const [preview,setPreview] = useState<Preview | null>(null)
  const [title,setTitle] = useState('')
  const [error,setError] = useState('')
  const [sending,setSending] = useState(false)
  const [result,setResult] = useState<{ pushRecipientCount?: number; pushDeviceCount?: number; recipientCount: number; createdAt: string } | null>(null)
  const attempt = useRef<{ id: string; title: string } | null>(null)
  const busy = useRef(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const url = '/api/courses/' + encodeURIComponent(courseId) + '/lessons/' + encodeURIComponent(lesson.id) + '/announce'
  useEffect(() => {
    const controller = new AbortController()
    const element = dialog.current
    element?.showModal()
    fetch(url,{cache:'no-store',signal:controller.signal}).then(async response => {
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Không thể xem trước.')
      setPreview(data); setTitle(data.defaultTitle)
    }).catch(err => { if (!controller.signal.aborted) setError(err.message || 'Không thể xem trước.') })
    return () => { controller.abort(); element?.close() }
  },[url])
  async function send() {
    if (busy.current || result || !preview || !title.trim()) return
    busy.current = true; setSending(true); setError('')
    // Giữ nguyên mã và nội dung nếu chưa biết server đã gửi thành công hay chưa.
    if (!attempt.current) attempt.current = { id: crypto.randomUUID(), title: title.trim() }
    try {
      const response = await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(attempt.current)})
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Không thể gửi thông báo.')
      setResult(data)
    } catch (err) { setError(err instanceof Error ? err.message : 'Lỗi mạng. Bấm thử lại với cùng nội dung để tránh gửi trùng.') }
    finally { busy.current = false; setSending(false) }
  }
  return <dialog ref={dialog} aria-labelledby="lesson-announcement-heading" onCancel={event => { if (busy.current) event.preventDefault(); else onClose() }} className="m-auto w-[calc(100%_-_2rem)] max-w-lg max-h-[90dvh] overflow-y-auto rounded-2xl bg-white p-5 text-gray-900 shadow-xl backdrop:bg-black/50">
    <div className="flex items-start justify-between gap-3">
      <h2 id="lesson-announcement-heading" className="text-lg font-bold flex items-center gap-2"><Bell className="h-5 w-5 shrink-0" />Thông báo học viên</h2>
      <button type="button" aria-label="Đóng" disabled={sending} onClick={onClose} className="h-11 w-11 shrink-0 grid place-items-center rounded-xl bg-gray-100 disabled:opacity-50"><X className="h-5 w-5" /></button>
    </div>
    <p className="mt-2 break-words text-sm text-gray-600">{lesson.title}</p>
    {!preview && !error && <p role="status" className="mt-4">Đang tính số người nhận…</p>}
    {preview && <div className="mt-4 space-y-4">
      <div className="rounded-xl bg-blue-50 p-3 text-sm"><strong>{preview.recipientCount} học viên</strong> đã được kích hoạt, gồm cả học dự thính. Số người nhận được kiểm tra lại lúc gửi.</div>
      <p className="text-sm text-gray-600">{preview.pushEnabled ? `${preview.pushRecipientCount ?? 0} học viên đã bật thông báo trên ${preview.pushDeviceCount ?? 0} thiết bị. Thiết bị sẽ nhận thêm thông báo ngoài web.` : 'Thông báo ngoài web chưa được bật cho website này. Học viên vẫn nhận trong chuông.'}</p>
      <p className="text-sm text-gray-500">{preview.lastSent ? 'Lần gửi gần nhất: ' + new Date(preview.lastSent.createdAt).toLocaleString('vi-VN') + ' · ' + preview.lastSent.recipientCount + ' người nhận' : 'Bài học này chưa gửi thông báo.'}</p>
      <label className="block text-sm font-semibold" htmlFor="lesson-announcement-title">Nội dung hiển thị trong chuông thông báo</label>
      <textarea id="lesson-announcement-title" value={title} disabled={sending || !!result || !!attempt.current} onChange={event => setTitle(event.target.value)} rows={4} maxLength={500} className="w-full rounded-xl border border-gray-300 p-3 text-base disabled:bg-gray-50" />
      <p className="text-sm text-gray-500">Bấm thông báo để mở đúng bài học. Lưu bài học sẽ không tự gửi thông báo.</p>
      {!preview.recipientCount && <p className="text-sm text-amber-700">Chưa có học viên được kích hoạt để nhận thông báo.</p>}
    </div>}
    {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {result && <p role="status" className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-700">Đã gửi tới {result.recipientCount} học viên lúc {new Date(result.createdAt).toLocaleString('vi-VN')}.{!!result.pushDeviceCount && <> Đã xếp hàng gửi thêm tới {result.pushDeviceCount} thiết bị của {result.pushRecipientCount} học viên.</>}</p>}
    <div className="mt-5 flex flex-wrap justify-end gap-2">
      <button type="button" disabled={sending} onClick={onClose} className="min-h-11 rounded-xl border px-4 disabled:opacity-50">{result ? 'Đóng' : 'Hủy'}</button>
      {!result && <button type="button" onClick={send} disabled={sending || !preview?.recipientCount || !title.trim()} className="min-h-11 rounded-xl bg-indigo-600 px-4 font-semibold text-white disabled:opacity-50">{sending ? 'Đang gửi…' : attempt.current ? 'Thử lại cùng thông báo' : preview?.lastSent ? 'Gửi lại thông báo' : 'Gửi thông báo'}</button>}
    </div>
  </dialog>
}
