'use client'
import { useEffect, useId, useRef, useState } from 'react'
import { Download, Loader2, X, Users, FileText } from 'lucide-react'

export type ImageExportOptions = { userIds?: number[]; fromDate?: string; toDate?: string }
type Props = { courseIds: number[]; filteredUserIds?: number[]; selectedUserIds?: number[]; label?: string; courseName?: string; onImageExport?: (options?: ImageExportOptions) => void | Promise<void>; imageBusy?: boolean; imageCount?: number }
export default function CourseExportButton({ courseIds, filteredUserIds, selectedUserIds, label = 'Xuất dữ liệu', courseName, onImageExport, imageBusy, imageCount }: Props) {
  const [open, setOpen] = useState(false), [content, setContent] = useState<'students' | 'reports'>('students'), [includeReports, setIncludeReports] = useState(false), [format, setFormat] = useState<'EXCEL' | 'GOOGLE' | 'PNG'>('EXCEL')
  const [status, setStatus] = useState('ALL'), [scope, setScope] = useState('all'), [fromDate, setFromDate] = useState(''), [toDate, setToDate] = useState('')
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [sheetUrl, setSheetUrl] = useState('')
  const dialog = useRef<HTMLDialogElement>(null), activeRequest = useRef<AbortController | null>(null)
  const radioGroup = useId()
  const reports = content === 'reports' || includeReports
  useEffect(() => { if (open) dialog.current?.showModal(); else dialog.current?.close() }, [open])
  useEffect(() => () => activeRequest.current?.abort(), [])
  const userIds = scope === 'filtered' ? filteredUserIds : scope === 'selected' ? selectedUserIds : undefined
  const invalidScope = scope !== 'all' && !userIds?.length
  const invalidRange = reports && !!fromDate && !!toDate && fromDate > toDate
  async function download() {
    if (busy || imageBusy || invalidScope || invalidRange) return
    setBusy(true); setError(''); setSheetUrl('')
    const controller = new AbortController(); activeRequest.current = controller
    const timer = setTimeout(() => controller.abort(), 120000)
    try {
      const range = reports ? { ...(fromDate ? { fromDate } : {}), ...(toDate ? { toDate } : {}) } : {}
      if (format === 'PNG') {
        if (!onImageExport) throw new Error('Xuất ảnh chưa được hỗ trợ tại đây.')
        await onImageExport({ ...(userIds ? { userIds } : {}), ...range }); setOpen(false); return
      }
      const response = await fetch('/api/courses/member-export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal, body: JSON.stringify({ courseIds, status, reports, format, ...(userIds ? { userIds } : {}), ...range }) })
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
  function changeContent(value: 'students' | 'reports') { setContent(value); if (value === 'students' && format === 'PNG') setFormat('EXCEL'); setSheetUrl(''); setError('') }
  const field = 'mt-1 min-h-11 w-full rounded-xl border border-brk-outline bg-white px-3 text-sm'
  return <>
    <button type="button" onClick={() => { setError(''); setSheetUrl(''); setScope(selectedUserIds?.length ? 'selected' : 'all'); setOpen(true) }} disabled={!courseIds.length || imageBusy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-brk-outline bg-white px-4 text-sm font-semibold text-brk-primary disabled:opacity-50"><Download size={17} />{imageBusy ? 'Đang tạo ảnh…' : label}</button>
    <dialog ref={dialog} aria-label="Xuất dữ liệu khóa học" onCancel={event => { event.preventDefault(); if (!busy) setOpen(false) }} className="m-auto max-h-[95dvh] w-[calc(100%_-_2rem)] max-w-xl overflow-y-auto rounded-2xl bg-white p-5 text-brk-on-surface shadow-xl backdrop:bg-black/50">
      <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold">Xuất dữ liệu</h2><button type="button" aria-label="Đóng lựa chọn xuất" disabled={busy} onClick={() => setOpen(false)} className="flex min-h-11 min-w-11 items-center justify-center"><X size={20} /></button></div>
      <p className="mt-2 text-sm text-brk-muted">{courseName || `${courseIds.length} khóa học đã chọn`}</p>
      <fieldset disabled={busy} className="mt-4 space-y-4">
        <fieldset className="grid gap-3 sm:grid-cols-2"><legend className="mb-2 text-sm font-semibold">Bạn muốn xuất dữ liệu gì?</legend>{([{ value: 'students', label: 'Thông tin học viên', description: 'Tên, số điện thoại, email và khóa đăng ký.', Icon: Users }, { value: 'reports', label: 'Báo cáo nộp bài', description: 'Bài nộp, ngày nộp, nội dung và điểm đang lưu.', Icon: FileText }] as const).map(({ value, label, description, Icon }) => <label key={value} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${content === value ? 'border-brk-primary bg-brk-background' : 'border-brk-outline'}`}><input type="radio" name={radioGroup} value={value} checked={content === value} onChange={() => changeContent(value)} className="mt-1 accent-green-700" /><span className="min-w-0"><Icon aria-hidden="true" size={20} className="mb-2 text-brk-primary" /><span className="block text-sm font-semibold">{label}</span><span className="mt-1 block text-xs leading-5 text-brk-muted">{description}</span></span></label>)}</fieldset>
        {content === 'students' && <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={includeReports} onChange={event => { setIncludeReports(event.target.checked); setSheetUrl('') }} />Kèm các sheet báo cáo nộp bài</label>}
        <label className="block text-sm font-semibold">Định dạng<select aria-label="Định dạng xuất" value={format} onChange={event => { setFormat(event.target.value as typeof format); setSheetUrl(''); setError('') }} className={field}><option value="EXCEL">Excel (.xlsx)</option><option value="GOOGLE">Google Sheet</option>{onImageExport && content === 'reports' && <option value="PNG">Ảnh bảng nộp bài (.png)</option>}</select></label>
        {(filteredUserIds || selectedUserIds) && <label className="block text-sm font-semibold">Phạm vi học viên<select aria-label="Phạm vi học viên" value={scope} onChange={event => { setScope(event.target.value); setSheetUrl('') }} className={field}><option value="all">Tất cả học viên thuộc khóa</option>{filteredUserIds && <option value="filtered" disabled={!filteredUserIds.length}>Theo bộ lọc đang xem ({filteredUserIds.length})</option>}{selectedUserIds && <option value="selected" disabled={!selectedUserIds.length}>Học viên đã tích chọn ({selectedUserIds.length})</option>}</select></label>}
        {format !== 'PNG' ? <label className="block text-sm font-semibold">Trạng thái đăng ký<select aria-label="Trạng thái đăng ký xuất" value={status} onChange={event => { setStatus(event.target.value); setSheetUrl('') }} className={field}><option value="ALL">Tất cả người đăng ký</option><option value="ACTIVE">Đã kích hoạt</option><option value="PENDING">Chờ kích hoạt</option></select></label> : <p className="rounded-xl bg-brk-background p-3 text-xs leading-6">Ảnh xuất bảng nộp bài theo ngày lịch của học viên đã kích hoạt trong phạm vi đã chọn. Không chứa số điện thoại/email. Bảng hiện có {imageCount ?? 0} học viên đã kích hoạt; nếu chọn người chưa kích hoạt sẽ bỏ qua khi xuất ảnh.</p>}
        {reports && <fieldset><legend className="text-sm font-semibold">Khoảng ngày báo cáo</legend><div className="mt-2 grid grid-cols-2 gap-3"><label className="text-xs">Từ ngày<input aria-label="Từ ngày xuất báo cáo" type="date" value={fromDate} max={toDate || undefined} onChange={event => { setFromDate(event.target.value); setSheetUrl('') }} className={field} /></label><label className="text-xs">Đến ngày<input aria-label="Đến ngày xuất báo cáo" type="date" value={toDate} min={fromDate || undefined} onChange={event => { setToDate(event.target.value); setSheetUrl('') }} className={field} /></label></div><p className="mt-2 text-xs leading-5 text-brk-muted">{format === 'PNG' ? 'Chọn các cột ngày lịch trong ảnh. Tối đa 366 ngày mỗi lần; bảng dài tự tách thành nhiều ảnh.' : 'Lọc theo thời gian nộp bài, giờ Việt Nam. Danh sách học viên giữ nguyên phạm vi đã chọn.'} Để trống để lấy toàn bộ thời gian.</p></fieldset>}
        {reports && format !== 'PNG' && <p className="text-xs text-brk-muted">Gồm danh sách học viên, tổng hợp nộp bài và chi tiết nội dung báo cáo, link minh chứng, ngày nộp, điểm.</p>}
        {format === 'GOOGLE' && <p className="text-xs leading-5 text-brk-muted">Tạo bảng tính mới và cấp quyền cho email đã xác minh của bạn. Cần kết nối Google của hệ thống.</p>}
        {invalidRange && <p role="alert" className="text-sm text-red-700">Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.</p>}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {sheetUrl ? <a href={sheetUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center justify-center rounded-xl bg-brk-primary px-4 font-semibold text-white">Đã tạo · Mở Google Sheet ↗</a> : <button type="button" disabled={busy || invalidScope || invalidRange || courseIds.length > 50 || format === 'PNG' && !imageCount} onClick={() => void download()} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brk-primary px-4 font-semibold text-white disabled:opacity-50">{busy ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}{busy ? 'Đang xuất dữ liệu…' : format === 'EXCEL' ? 'Tải Excel (.xlsx)' : format === 'GOOGLE' ? 'Tạo Google Sheet' : 'Tải ảnh báo cáo (.png)'}</button>}
      </fieldset>
    </dialog>
  </>
}
