'use client'
import { useEffect, useRef } from 'react'
import CoursePageView from '@/components/course-page/CoursePageView'
import type { CoursePage } from '@/lib/course-page/types'

// Chỉ mẫu hệ thống tin cậy mới xuất DOM/CSS để tạo bản HTML có thể chỉnh sửa.
export default function TemplateRenderedPreview({ page, exportable, token }: { page: CoursePage; exportable: boolean; token: string }) {
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!exportable) return
    const send = async () => {
      await document.fonts?.ready
      const clone = root.current?.cloneNode(true) as HTMLElement | undefined
      if (!clone) return
      clone.querySelectorAll('script').forEach(script => script.remove())
      clone.querySelectorAll('button').forEach(button => { if (/đăng ký|kích hoạt|tham gia/i.test(button.textContent || '')) button.setAttribute('data-mfc-register', '') })
      clone.querySelectorAll('[src]').forEach(element => { const src = element.getAttribute('src'); if (src && src.startsWith('/')) element.setAttribute('src', new URL(src, location.origin).href) })
      let css = ''
      for (const sheet of [...document.styleSheets]) {
        try { css += [...sheet.cssRules].map(rule => rule.cssText.replace(/url\((['"]?)([^'")]+)\1\)/gi, (all, quote, url) => `url("${new URL(url, sheet.href || location.href).href}")`)).join('\n') } catch {}
      }
      const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css.replace(/<\/style/gi, '<\\/style')}</style></head><body>${clone.outerHTML}</body></html>`
      parent.postMessage({ source: 'course-template-builtin', token, html }, location.origin)
    }
    const timer = setTimeout(() => void send(), 700)
    return () => clearTimeout(timer)
  }, [exportable, token])
  return <div ref={root} onClickCapture={event => { const target = (event.target as HTMLElement).closest('a,button'); if (target && (target.tagName === 'A' || /đăng ký|kích hoạt|tham gia/i.test(target.textContent || ''))) { event.preventDefault(); event.stopPropagation() } }}>
    <CoursePageView coursePage={page} course={{ id: 0, name_lop: page.name || 'Tên khóa học', id_khoa: 'template-preview', phi_coc: 0 }} session={null} userPhone="" userId={null} />
  </div>
}
