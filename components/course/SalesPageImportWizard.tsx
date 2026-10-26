'use client'
import { useMemo, useState } from 'react'
import { Check, Image as ImageIcon, MousePointerClick, Blocks, X } from 'lucide-react'
import { applyEventMap, applyImageMap, extractBlocks, extractImageInventory, extractInteractiveElements, type ImportEventAction } from '@/lib/course-page/import-review'

export type ImageCheckResult = { url: string; ok: boolean; status: number; contentType: string | null; isImage: boolean }
export type ImportBlockKeys = { selectedBlockKeys: string[] | null; registrationBlockKeys: string[] }

type Props = {
  sourceHtml: string
  sourceLabel: string
  onCheckImageUrls: (urls: string[]) => Promise<ImageCheckResult[]>
  onApply: (html: string, blockKeys: ImportBlockKeys) => void
  onClose: () => void
}

const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-brk-outline bg-white px-4 text-sm font-semibold text-brk-primary disabled:opacity-50'
const primary = button + ' !bg-brk-primary !text-white'
const input = 'min-h-11 w-full rounded-xl border border-brk-outline bg-white px-3 text-sm'
const ACTION_OPTIONS: Array<{ value: ImportEventAction; label: string }> = [
  { value: 'register', label: 'Mở đăng ký khóa học' },
  { value: 'share', label: 'Mở chia sẻ affiliate' },
  { value: 'scroll', label: 'Cuộn tới khối' },
  { value: 'external', label: 'Mở link ngoài' },
  { value: 'course', label: 'Tới khóa học khác' },
  { value: 'none', label: 'Giữ nguyên' },
]

export default function SalesPageImportWizard({ sourceHtml, sourceLabel, onCheckImageUrls, onApply, onClose }: Props) {
  const images = useMemo(() => extractImageInventory(sourceHtml), [sourceHtml])
  const items = useMemo(() => extractInteractiveElements(sourceHtml), [sourceHtml])
  const blocks = useMemo(() => extractBlocks(sourceHtml), [sourceHtml])
  const [imageMap, setImageMap] = useState<Record<string, { url: string; alt: string }>>(() => Object.fromEntries(images.map(item => [item.id, { url: item.kind === 'url' ? item.currentUrl : '', alt: item.alt || '' }])))
  const [eventMap, setEventMap] = useState<Record<string, { action: ImportEventAction; href: string; target: string }>>(() => Object.fromEntries(items.map(item => [item.id, { action: item.suggestedAction, href: item.href || '', target: '' }])))
  const [blockState, setBlockState] = useState<Record<string, { visible: boolean; registration: boolean }>>(() => Object.fromEntries(blocks.map(block => [block.key, { visible: true, registration: false }])))
  const [checkResults, setCheckResults] = useState<Record<string, ImageCheckResult>>({})
  const [checking, setChecking] = useState(false)
  const [checkError, setCheckError] = useState('')
  const [applyWarnings, setApplyWarnings] = useState<string[]>([])

  const blockers: string[] = []
  for (const item of images) {
    const assigned = (imageMap[item.id]?.url || '').trim()
    if (item.kind === 'data' && !assigned) blockers.push(`Ảnh ${item.id} đang nhúng trong trang, cần gán link HTTPS.`)
    else if (assigned && !assigned.startsWith('https://')) blockers.push(`Link của ảnh ${item.id} phải bắt đầu bằng https://.`)
    else if (!assigned && item.kind === 'url' && !item.currentUrl.startsWith('https://')) blockers.push(`Ảnh ${item.id} chưa có link HTTPS (${item.currentUrl.slice(0, 60)}).`)
  }
  const blocked = blockers.length > 0

  async function checkImages() {
    const urls = [...new Set(images.map(item => (imageMap[item.id]?.url || '').trim() || (item.kind === 'url' ? item.currentUrl : '')).filter(url => url.startsWith('https://')))].slice(0, 30)
    if (!urls.length) { setCheckError('Chưa có link ảnh HTTPS nào để kiểm tra.'); return }
    setChecking(true); setCheckError('')
    try {
      const results = await onCheckImageUrls(urls)
      setCheckResults(Object.fromEntries(results.map(result => [result.url, result])))
    } catch (error) { setCheckError(error instanceof Error ? error.message : 'Không kiểm tra được link ảnh.') }
    finally { setChecking(false) }
  }

  function apply() {
    const imageAssignments: Record<string, { url: string; alt?: string }> = {}
    for (const item of images) {
      const entry = imageMap[item.id]
      if (!entry) continue
      if (entry.url.trim()) imageAssignments[item.id] = { url: entry.url.trim(), alt: entry.alt }
      else if (entry.alt && entry.alt !== (item.alt || '')) imageAssignments[item.id] = { url: '', alt: entry.alt }
    }
    const withImages = applyImageMap(sourceHtml, imageAssignments)
    const eventAssignments = Object.fromEntries(Object.entries(eventMap).map(([id, entry]) => [id, { action: entry.action, href: entry.href || undefined, target: entry.target || undefined }]))
    const { html, warnings } = applyEventMap(withImages, eventAssignments)
    if (warnings.length) { setApplyWarnings(warnings); return }
    const selected = blocks.filter(block => blockState[block.key]?.visible !== false).map(block => block.key)
    const registration = blocks.filter(block => blockState[block.key]?.registration).map(block => block.key)
    onApply(html, { selectedBlockKeys: blocks.length ? selected : null, registrationBlockKeys: registration })
  }

  return (
    <section className="min-w-0 space-y-4 rounded-2xl border border-brk-outline bg-white p-4" aria-label="Rà soát trang nhập">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="font-bold">Rà soát trang nhập</h2><p className="mt-1 text-sm text-brk-muted">Nguồn: {sourceLabel}. Ảnh phải dùng link HTTPS từ nền tảng bên ngoài — hệ thống không lưu ảnh. Kiểm tra 3 mục dưới đây rồi đưa vào trình sửa code.</p></div>
        <button type="button" onClick={onClose} className={button}><X size={16} />Đóng</button>
      </div>

      <div className="space-y-3">
        <h3 className="flex items-center gap-2 font-semibold"><ImageIcon size={17} />Ảnh ({images.length})</h3>
        {images.length === 0 && <p className="text-sm text-brk-muted">Trang không có ảnh.</p>}
        {images.map(item => {
          const current = (imageMap[item.id]?.url || '').trim() || (item.kind === 'url' ? item.currentUrl : '')
          const result = checkResults[current]
          return (
            <div key={item.id} className="grid gap-2 rounded-xl border border-brk-outline p-3 md:grid-cols-[64px_minmax(0,1fr)_minmax(0,1fr)]">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg bg-brk-background text-xs text-brk-muted">{item.kind === 'url' ? <img src={item.currentUrl} alt="" className="h-full w-full object-cover" /> : `${Math.max(1, Math.round((item.bytes || 0) / 1024))} KB`}</div>
              <div className="min-w-0 text-sm"><p className="font-semibold">{item.id} · {item.source === 'css' ? 'Ảnh trong CSS' : 'Ảnh trong trang'}</p><p className="mt-1 break-all text-xs text-brk-muted">{item.kind === 'data' ? `Đang nhúng trong trang (${item.summary || 'data:'}, ${item.bytes || 0} bytes) — cần gán link ngoài.` : item.currentUrl}</p>{result && <p className={`mt-1 text-xs ${result.ok && result.isImage ? 'text-green-700' : 'text-red-600'}`}>{result.ok && result.isImage ? `Link tốt (HTTP ${result.status}${result.contentType ? ', ' + result.contentType : ''})` : `Có vấn đề: HTTP ${result.status || 'không tới được'}${result.contentType ? ', ' + result.contentType : ''}${result.ok && !result.isImage ? ' — không phải file ảnh' : ''}`}</p>}</div>
              <div className="space-y-2">
                <input aria-label={`Link HTTPS cho ảnh ${item.id}`} value={imageMap[item.id]?.url || ''} onChange={event => setImageMap(current => ({ ...current, [item.id]: { ...(current[item.id] || { alt: '' }), url: event.target.value } }))} placeholder="Dán link ảnh https://…" className={input} />
                <input aria-label={`Chữ thay thế (alt) cho ảnh ${item.id}`} value={imageMap[item.id]?.alt || ''} onChange={event => setImageMap(current => ({ ...current, [item.id]: { ...(current[item.id] || { url: '' }), alt: event.target.value } }))} placeholder="Chữ thay thế (alt)" className={input} />
              </div>
            </div>
          )
        })}
        <div className="flex flex-wrap items-center gap-2"><button type="button" disabled={checking} onClick={() => void checkImages()} className={button}><Check size={16} />{checking ? 'Đang kiểm tra…' : 'Kiểm tra link ảnh'}</button>{checkError && <p role="alert" className="text-sm text-red-600">{checkError}</p>}</div>
      </div>

      <div className="space-y-3">
        <h3 className="flex items-center gap-2 font-semibold"><MousePointerClick size={17} />Sự kiện ({items.length})</h3>
        {items.length === 0 && <p className="text-sm text-brk-muted">Không tìm thấy nút, liên kết hay biểu mẫu nào.</p>}
        {items.map(item => {
          const entry = eventMap[item.id] || { action: item.suggestedAction, href: item.href || '', target: '' }
          const setEntry = (patch: Partial<typeof entry>) => setEventMap(current => ({ ...current, [item.id]: { ...(current[item.id] || entry), ...patch } }))
          return (
            <div key={item.id} className="grid gap-2 rounded-xl border border-brk-outline p-3 md:grid-cols-[minmax(0,1fr)_220px_minmax(0,1fr)]">
              <div className="min-w-0 text-sm"><p className="font-semibold">{item.label || item.tag}</p><p className="mt-1 break-all text-xs text-brk-muted">&lt;{item.tag}&gt;{item.href ? ` · ${item.href}` : ''}</p></div>
              <select aria-label={`Hành động cho ${item.label || item.tag}`} value={entry.action} onChange={event => setEntry({ action: event.target.value as ImportEventAction })} className={input}>{ACTION_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
              <div>
                {entry.action === 'scroll' && <select aria-label="Khối đích" value={entry.target} onChange={event => setEntry({ target: event.target.value })} className={input}><option value="">Chọn khối đích…</option>{blocks.map(block => <option key={block.key} value={block.key}>{block.key}{block.heading ? ` — ${block.heading}` : ''}</option>)}</select>}
                {entry.action === 'external' && <input aria-label="Link ngoài" value={entry.href} onChange={event => setEntry({ href: event.target.value })} placeholder="https://… hoặc tel:/mailto:" className={input} />}
                {entry.action === 'course' && <input aria-label="Khóa học đích" value={entry.target} onChange={event => setEntry({ target: event.target.value })} placeholder="Slug khóa học hoặc /khoa-hoc/<slug>" className={input} />}
                {(entry.action === 'register' || entry.action === 'share' || entry.action === 'none') && <p className="text-xs leading-5 text-brk-muted">{entry.action === 'register' ? 'Bấm vào sẽ mở đăng ký của hệ thống.' : entry.action === 'share' ? 'Bấm vào sẽ mở chia sẻ link affiliate.' : 'Giữ nguyên hành vi gốc của trang.'}</p>}
              </div>
            </div>
          )
        })}
      </div>

      <div className="space-y-3">
        <h3 className="flex items-center gap-2 font-semibold"><Blocks size={17} />Khối trên trang ({blocks.length})</h3>
        {blocks.length === 0 && <p className="text-sm text-brk-muted">Không tìm thấy khối cấu trúc cấp cao nhất.</p>}
        {blocks.map(block => (
          <div key={block.key} className="flex flex-wrap items-center gap-4 rounded-xl border border-brk-outline p-3 text-sm">
            <span className="min-w-0 flex-1"><strong>{block.key}</strong> <span className="text-brk-muted">&lt;{block.tag}&gt;{block.heading ? ` — ${block.heading}` : ''}</span></span>
            <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={blockState[block.key]?.visible !== false} onChange={event => { const prev = blockState[block.key] || { visible: true, registration: false }; setBlockState(current => ({ ...current, [block.key]: { ...prev, visible: event.target.checked } })) }} />Hiển thị</label>
            <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={!!blockState[block.key]?.registration} onChange={event => { const prev = blockState[block.key] || { visible: true, registration: false }; setBlockState(current => ({ ...current, [block.key]: { ...prev, registration: event.target.checked } })) }} />Khối đăng ký</label>
          </div>
        ))}
      </div>

      {applyWarnings.map(warning => <p key={warning} role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{warning}</p>)}
      {blockers.map(blocker => <p key={blocker} className="text-sm text-red-600">{blocker}</p>)}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={blocked} onClick={apply} className={primary}>Đưa vào trình sửa code</button>
        <button type="button" onClick={onClose} className={button}>Huỷ rà soát</button>
      </div>
    </section>
  )
}
