'use client'

import TemplateControlEditor, { ControlCourse } from '@/components/course-page/TemplateControlEditor'
import { TemplateControls, controlsSchema } from '@/lib/course-page/importer/controls'
import { useState } from 'react'
import { prepareWebsiteZip } from '@/lib/course-page/importer/zip-browser'
import { makeNode, WebsiteNode } from '@/lib/website/document'
import ZipSourceSection from '@/components/course-page/sections/ZipSourceSection'

export default function WebsiteImport({ onApply, courses }: { courses: ControlCourse[]; onApply: (node: WebsiteNode) => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ url: string; warnings: string[]; controls?: TemplateControls } | null>(null)
  const [device, setDevice] = useState<'mobile' | 'tablet' | 'desktop'>('desktop')
  async function analyze() {
    if (!file || busy) return
    setBusy(true); setError(''); setResult(null)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 90_000)
    try {
      let html: string
      let warnings: string[] = []
      if (/\.zip$/i.test(file.name)) {
        const prepared = await prepareWebsiteZip(file, { preserveTailwindForCompilation: true })
        html = prepared.html; warnings = prepared.warnings
      } else {
        if (file.size > 8 * 1024 * 1024) throw new Error('HTML tối đa 8 MB.')
        html = await file.text()
      }
      const raw = new Blob([html], { type: 'text/html' })
      const body = typeof CompressionStream !== 'undefined' ? await new Response(raw.stream().pipeThrough(new CompressionStream('gzip'))).blob() : raw
      if (body.size > 4 * 1024 * 1024) throw new Error('Dữ liệu gửi vượt quá 4 MB sau nén.')
      const response = await fetch('/api/websites/import', { method: 'POST', headers: { 'Content-Type': body === raw ? 'text/html' : 'application/gzip' }, body, signal: controller.signal })
      let data
      try { data = await response.json() } catch { throw new Error(`Máy chủ chưa trả kết quả hợp lệ (HTTP ${response.status}).`) }
      if (!response.ok) throw new Error(data.error || 'Không thể nhập mẫu.')
      setResult({ url: data.url, controls: data.controls, warnings: [...new Set([...warnings, ...data.warnings])] })
    } catch (e) { setError(controller.signal.aborted ? 'Quá thời gian xử lý. Hãy thử lại với tệp nhỏ hơn.' : e instanceof Error ? e.message : 'Không thể nhập mẫu.') }
    finally { clearTimeout(timer); setBusy(false) }
  }
  return <section className="grid gap-3 rounded-xl border border-violet-200 p-3">
    <h2 className="font-bold">Nhập HTML / ZIP</h2>
    <input aria-label="File HTML hoặc ZIP" type="file" accept=".html,.htm,.zip" disabled={busy} onChange={e => { setFile(e.target.files?.[0] || null); setResult(null); setError('') }} className="w-full text-xs" />
    <button type="button" disabled={!file || busy} onClick={analyze} className="rounded-lg bg-violet-700 px-3 py-2 text-white disabled:opacity-40">{busy ? 'Đang xử lý…' : 'Phân tích & xem trước'}</button>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {result && <>
      <ul className="list-disc pl-4 text-xs text-amber-800">{result.warnings.map(w => <li key={w}>{w}</li>)}</ul>
      {result.controls && <TemplateControlEditor value={result.controls} courses={courses} onChange={controls=>setResult({...result,controls})}/>}
      <div className="flex flex-wrap gap-1">{(['mobile', 'tablet', 'desktop'] as const).map(d => <button key={d} type="button" aria-pressed={device === d} onClick={() => setDevice(d)} className={'rounded border px-2 py-1 text-xs ' + (device === d ? 'bg-violet-100' : '')}>{d === 'mobile' ? 'Điện thoại' : d === 'tablet' ? 'Tablet' : 'Máy tính'}</button>)}</div>
      <div className="max-h-[500px] overflow-auto border bg-gray-100"><div style={{ width: device === 'mobile' ? 390 : device === 'tablet' ? 768 : 1280 }}>
        <ZipSourceSection testMode content={{ exactSource: { url: result.url }, controls: result.controls }} sourceEndpoint="/api/website-template-source" />
      </div></div>
      <button type="button" className="rounded-lg border p-2 font-semibold" onClick={() => { if(result.controls&&!controlsSchema.safeParse(result.controls).success){setError('Có nút chưa chọn đích đến hợp lệ. Hãy kiểm tra phần Kết nối các nút.');return} const node = makeNode('imported-page'); node.url = result.url; node.text = file?.name || 'Trang nhập'; node.html = ''; node.css = ''; node.controls = result.controls; onApply(node) }}>Dùng cho trang đang chọn</button>
      <p className="text-xs text-gray-500">Chỉ thay nội dung trang đang chọn trong bản nháp. Có thể hoàn tác; cần lưu và xuất bản để hiển thị công khai.</p>
    </>}
  </section>
}
