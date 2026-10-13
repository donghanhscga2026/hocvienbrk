'use client'
import { useEffect, useRef, useState } from 'react'
import { Download, Loader2, X } from 'lucide-react'

export default function CourseExportButton({ courseIds, filteredUserIds, label = 'Xuất Excel', courseName }: { courseIds: number[]; filteredUserIds?: number[]; label?: string; courseName?: string }) {
  const [open, setOpen] = useState(false)
  const [reports, setReports] = useState(false)
  const [status, setStatus] = useState('ALL')
  const [scope, setScope] = useState('all')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  const activeRequest = useRef<AbortController | null>(null)
  useEffect(() => { if (open) dialog.current?.showModal(); else dialog.current?.close() }, [open])
  useEffect(() => () => activeRequest.current?.abort(), [])
  async function download() {
    if (busy) return
    setBusy(true); setError('')
    const controller = new AbortController(); activeRequest.current = controller
    const timer = setTimeout(() => controller.abort(), 90000)
    try {
      const response = await fetch('/api/courses/member-export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal, body: JSON.stringify({ courseIds, status, reports, ...(scope === 'filtered' ? { userIds: filteredUserIds } : {}) }) })
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'Không xuất được Excel.') }
      const blob = await response.blob()
      if (!response.headers.get('content-type')?.includes('spreadsheetml')) throw new Error('Máy chủ chưa trả về file Excel. Hãy đăng nhập lại và thử tiếp.')
      const url = URL.createObjectURL(blob), anchor = document.createElement('a')
      const name = (courseName || 'KhoaHoc').replace(/[<>:"/\\|?*]/g, '').slice(0, 70)
      anchor.href = url; anchor.download = `HocVien_${name}_${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(anchor); anchor.click(); anchor.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setOpen(false)
    } catch (error) { setError(controller.signal.aborted ? 'Xuất báo cáo quá lâu. Hãy chọn ít học viên/khóa học hơn và thử lại.' : error instanceof Error ? error.message : 'Không tải được file Excel.') }
    finally { clearTimeout(timer); activeRequest.current = null; setBusy(false) }
  }
  const field = 'mt-1 min-h-11 w-full rounded-xl border border-brk-outline bg-white px-3 text-sm'
  return <>
    <button type="button" onClick={() => { setError(''); setOpen(true) }} disabled={!courseIds.length} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-brk-outline bg-white px-4 text-sm font-semibold text-brk-primary disabled:opacity-50"><Download size={17} />{label}</button>
    <dialog ref={dialog} aria-label="Xuất thông tin học viên ra Excel" onCancel={event => { event.preventDefault(); if (!busy) setOpen(false) }} className="m-auto w-[calc(100%_-_2rem)] max-w-lg rounded-2xl bg-white p-5 text-brk-on-surface shadow-xl backdrop:bg-black/50">
      <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold">Xuất thông tin học viên</h2><button type="button" aria-label="Đóng lựa chọn xuất" disabled={busy} onClick={() => setOpen(false)} className="flex min-h-11 min-w-11 items-center justify-center"><X size={20} /></button></div>
      <p className="mt-2 text-sm leading-6 text-brk-muted">{courseName || `${courseIds.length} khóa học đã chọn`}. File Excel gồm tên, số điện thoại, email và khóa đăng ký; ô chưa có thông tin được để trống.</p>
      <fieldset disabled={busy} className="mt-4 space-y-4"><label className="block text-sm font-semibold">Trạng thái đăng ký<select value={status} onChange={event => setStatus(event.target.value)} className={field}><option value="ALL">Tất cả người đăng ký</option><option value="ACTIVE">Đã kích hoạt</option><option value="PENDING">Chờ kích hoạt</option></select></label>
        {filteredUserIds && <label className="block text-sm font-semibold">Phạm vi học viên<select value={scope} onChange={event => setScope(event.target.value)} className={field}><option value="all">Tất cả học viên thuộc khóa</option><option value="filtered" disabled={!filteredUserIds.length}>Theo bộ lọc đang xem ({filteredUserIds.length} học viên)</option></select></label>}
        <label className="flex min-h-11 items-start gap-3 rounded-xl bg-brk-background p-3"><input type="checkbox" checked={reports} onChange={event => setReports(event.target.checked)} className="mt-1 h-4 w-4 accent-green-700" /><span className="text-sm"><strong>Kèm báo cáo nộp bài</strong><span className="mt-1 block text-brk-muted">Thêm bảng tổng hợp từng bài và chi tiết nội dung báo cáo, link minh chứng, thời gian nộp, điểm.</span></span></label>
        {courseIds.length > 50 && <p role="alert" className="text-sm text-red-700">Chọn tối đa 50 khóa mỗi lần xuất.</p>}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button type="button" disabled={busy || courseIds.length > 50 || (scope === 'filtered' && !filteredUserIds?.length)} onClick={() => void download()} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brk-primary px-4 font-semibold text-white disabled:opacity-50">{busy ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}{busy ? 'Đang tạo file Excel…' : 'Tải Excel (.xlsx)'}</button>
      </fieldset>
    </dialog>
  </>
}
