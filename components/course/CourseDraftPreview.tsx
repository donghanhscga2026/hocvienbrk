'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import CourseThemeProvider from '@/components/course-page/CourseThemeProvider'
import SectionRenderer from '@/components/course-page/SectionRenderer'
import type { CoursePage } from '@/lib/course-page/types'

// Preview chỉ đọc state trong trình duyệt: không lưu DB, không mở đăng ký/thanh toán.
export default function CourseDraftPreview({ page, width, selectedKey, onSelect, registered = false }: { page: CoursePage; width: number; selectedKey?: string; onSelect: (key: string) => void; registered?: boolean }) {
  const host = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const [body, setBody] = useState<HTMLElement | null>(null)
  const [available, setAvailable] = useState(600)
  useEffect(() => {
    const element = host.current
    if (!element) return
    const resize = () => setAvailable(element.clientWidth || 600)
    resize()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(resize)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    if (!body) return
    const doc = body.ownerDocument
    // Đồng bộ CSS của ứng dụng để breakpoint hoạt động theo chiều rộng iframe.
    const sync = () => {
      doc.head.querySelectorAll('[data-preview-style]').forEach(node => node.remove())
      document.head.querySelectorAll('link[rel="stylesheet"],style').forEach(node => { const copy = node.cloneNode(true) as HTMLElement; copy.setAttribute('data-preview-style', ''); doc.head.appendChild(copy) })
    }
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(document.head, { childList: true, subtree: true, characterData: true })
    return () => observer.disconnect()
  }, [body])
  useEffect(() => {
    if (!body) return
    const selected = [...body.querySelectorAll<HTMLElement>('[data-editor-section]')].find(node => node.dataset.editorSection === selectedKey)
    selected?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
  }, [body, selectedKey])
  const scale = Math.min(1, available / width)
  const sections = page.sections.map(section => ({
    ...section,
    // Khối mới thêm có nội dung rỗng vẫn phải preview được.
    content: { items: [], instructors: [], plans: [], paragraphs: [], phases: [], conditions: [], primaryCta: { label: 'Đăng ký khóa học', action: 'open_registration' }, ...section.content },
  })) as CoursePage['sections']
  return <div ref={host} className="w-full overflow-hidden rounded-xl border border-brk-outline bg-white" style={{ height: 660 }}>
    <iframe ref={frame} title="Xem trước bản nháp" sandbox="allow-same-origin" srcDoc={'<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"></body></html>'} onLoad={() => setBody(frame.current?.contentDocument?.body || null)} style={{ display: 'block', border: 0, width, height: 660 / scale, transform: `scale(${scale})`, transformOrigin: 'top left' }} />
    {body && createPortal(<CourseThemeProvider theme={page.theme}>
      {sections.filter(section => section.enabled && (registered ? section.visibility !== 'unregistered' : section.visibility !== 'registered')).map(section => <div key={section.sectionKey} data-editor-section={section.sectionKey} style={{ outline: section.sectionKey === selectedKey ? '3px solid #28735e' : undefined, outlineOffset: '-3px', cursor: 'pointer' }} onClickCapture={event => { event.preventDefault(); event.stopPropagation(); onSelect(section.sectionKey) }}>
        <SectionRenderer sections={[section]} isEnrolled={registered} course={{ id: 0, id_khoa: page.slug, name_lop: page.name }} session={null} onAction={() => {}} />
      </div>)}
      {!sections.some(section => section.enabled) && <p style={{ padding: 24 }}>Thêm hoặc bật nội dung để xem bản nháp.</p>}
    </CourseThemeProvider>, body)}
  </div>
}
