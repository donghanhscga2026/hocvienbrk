'use client'
import { useEffect, useRef, useState } from 'react'
import { Download, Loader2, X } from 'lucide-react'

type Props = { courseIds: number[]; filteredUserIds?: number[]; label?: string; courseName?: string; onImageExport?: () => void; imageBusy?: boolean; imageCount?: number }
export default function CourseExportButton({ courseIds, filteredUserIds, label = 'Xuất dữ liệu', courseName, onImageExport, imageBusy, imageCount }: Props) {
  const [open, setOpen] = useState(false), [reports, setReports] = useState(false), [format, setFormat] = useState<'EXCEL' | 'GOOGLE' | 'PNG'>('EXCEL')
  const [status, setStatus] = useState('ALL'), [scope, setScope] = useState('all'), [busy, setBusy] = useState(false), [error, setError] = useState(''), [sheetUrl, setSheetUrl] = useState('')
  const dialog = useRef<HTMLDialogElement>(null), activeRequest = useRef<AbortController | null>(null)
  useEffect(() => { if (open) dialog.current?.showModal(); else dialog.current?.close() }, [open])
  useEffect(() => () => activeRequest.current?.abort(), [])
  async function download() {
    if (busy || imageBusy) return
    if (format === 'PNG') { onImageExport?.(); setOpen(false); return }
    setBusy(true); setError(''); setSheetUrl('')
    const controller = new AbortController(); activeRequest.current = controller
    const timer = setTimeout(() => controller.abort(), 120000)
    try {
      const response = await fetch('/api/courses/member-export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal, body: JSON.stringify({ courseIds, status, reports, format, ...(scope === 'filtered' ? { userIds: filteredUserIds } : {}) }) })
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'Không xuất được dữ liệu.') }
      if (format === 'GOOGLE') {
        const data = await response.json()
        if (!/^https:\/\/docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9_-]+$/.test(data.sheetUrl || '')) throw new Error('Chưa nhận được đường dẫn Google Sheet hợp lệ.')
        setSheetUrl(data.sheetUrl); return
      }
      if (!response.headers.get('content-type')?.includes('spreadsheetml')) throw new Error('Máy chủ chưa trả về file Excel. Hãy đăng nhập lại và thử tiếp.')
      const blob = await response.blob(), url = URL.createObjectURL(blob), anchor = document.createElement('a')
      const name = (courseName || 'KhoaHoc').replace(/[<>:"/\\|?*]/g, '').slice(0, 70)
      anchor.href = url; anchor.download = `HocVien_${name}_${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); setOpen(false)
    } catch (error) { setError(controller.signal.aborted ? 'Chưa nhận được kết quả xuất. Nếu dùng Google Sheet, kiểm tra Drive trước khi thử lại; hoặc chọn ít học viên hơn.' : error instanceof Error ? error.message : 'Không xuất được dữ liệu.') }
    finally { clearTimeout(timer); activeRequest.current = null; setBusy(false) }
  }
  const field = 'mt-1 min-h-11 w-full rounded-xl border border-brk-outline bg-white px-3 text-sm'
  return <>
    <button type="button" onClick={() => { setError(''); setSheetUrl(''); setOpen(true) }} disabled={!courseIds.length || imageBusy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-brk-outline bg-white px-4 text-sm font-semibold text-brk-primary disabled:opacity-50"><Download size={17} />{imageBusy ? 'Đang tạo ảnh…' : label}</button>
    <dialog ref={dialog} aria-label="Xuất dữ liệu khóa học" onCancel={event => { event.preventDefault(); if (!busy) setOpen(false) }} className="m-auto max-h-[95dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-2xl bg-white p-5 text-brk-on-surface shadow-xl backdrop:bg-black/50">
      <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold">Xuất dữ liệu</h2><button type="button" aria-label="Đóng lựa chọn xuất" disabled={busy} onClick={() => setOpen(false)} className="flex min-h-11 min-w-11 items-center justify-center"><X size={20} /></button></div>
      <p className="mt-2 text-sm text-brk-muted">{courseName || `${courseIds.length} khóa học đã chọn`}</p>
      <fieldset disabled={busy} className="mt-4 space-y-4">
        <label className="block text-sm font-semibold">Nội dung xuất<select value={reports ? 'reports' : 'students'} onChange={event => { const value = event.target.value === 'reports'; setReports(value); if (!value && format === 'PNG') setFormat('EXCEL'); setSheetUrl('') }} className={field}><option value="students">Danh sách học viên và khóa đăng ký</option><option value="reports">Báo cáo học tập, kèm danh sách học viên</option></select></label>
        <p className="text-xs leading-5 text-brk-muted">{reports ? 'Excel/Google Sheet gồm danh sách, tổng hợp từng bài và chi tiết nội dung báo cáo, link minh chứng, thời gian nộp, điểm.' : 'Gồm tên, số điện thoại, email, khóa đăng ký, trạng thái và ngày đăng ký. Thông tin chưa có được để trống.'}</p>
        <label className="block text-sm font-semibold">Định dạng<select value={format} onChange={event => { setFormat(event.target.value as typeof format); setSheetUrl(''); setError('') }} className={field}><option value="EXCEL">Excel (.xlsx)</option><option value="GOOGLE">Google Sheet</option>{onImageExport && reports && <option value="PNG">Ảnh báo cáo nộp bài (.png)</option>}</select></label>
        {format === 'PNG' ? <p className="rounded-xl bg-brk-background p-3 text-sm leading-6">Ảnh thể hiện bảng nộp bài theo ngày của {imageCount ?? ''} học viên đã kích hoạt trong bảng hiện tại. Ảnh không phải danh sách thông tin liên hệ; để lấy tên, số điện thoại, email và khóa đăng ký, chọn Excel hoặc Google Sheet.</p> : <>
          <label className="block text-sm font-semibold">Trạng thái đăng ký<select value={status} onChange={event => { setStatus(event.target.value); setSheetUrl('') }} className={field}><option value="ALL">Tất cả người đăng ký</option><option value="ACTIVE">Đã kích hoạt</option><option value="PENDING">Chờ kích hoạt</option></select></label>
          {filteredUserIds && <label className="block text-sm font-semibold">Phạm vi học viên<select value={scope} onChange={event => { setScope(event.target.value); setSheetUrl('') }} className={field}><option value="all">Tất cả học viên thuộc khóa</option><option value="filtered" disabled={!filteredUserIds.length}>Theo bộ lọc đang xem ({filteredUserIds.length} học viên)</option></select></label>}
          {format === 'GOOGLE' && <p className="text-xs leading-5 text-brk-muted">Tạo bảng tính mới và cấp quyền cho email đã xác minh của tài khoản bạn. Cần kết nối Google của hệ thống.</p>}
        </>}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {sheetUrl ? <a href={sheetUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center justify-center rounded-xl bg-brk-primary px-4 font-semibold text-white">Đã tạo · Mở Google Sheet ↗</a> : <button type="button" disabled={busy || courseIds.length > 50 || format === 'PNG' && !imageCount || format !== 'PNG' && scope === 'filtered' && !filteredUserIds?.length} onClick={() => void download()} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brk-primary px-4 font-semibold text-white disabled:opacity-50">{busy ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}{busy ? 'Đang xuất dữ liệu…' : format === 'EXCEL' ? 'Tải Excel (.xlsx)' : format === 'GOOGLE' ? 'Tạo Google Sheet' : 'Tải ảnh báo cáo (.png)'}</button>}
      </fieldset>
    </dialog>
  </>
}
