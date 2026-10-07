'use client'

import React from 'react'
import { bindingSchema, controlsSchema, resolveControlAction } from '@/lib/course-page/importer/controls'
import { zipFrameSource, zipSelectedBlockKeys, zipCourseLinks } from '@/lib/course-page/importer/source-url'

type Props = {
  hasDefaultRegistration?: boolean
  testMode?: boolean
  allowedCourseHrefs?: string[]
  id?: string
  sourceEndpoint?: string
  content: any
  onAction?: (actionType: string, target?: string) => void
}

function safeExternal(value: unknown) {
  if (typeof value !== 'string') return undefined
  try {
    const url = new URL(value)
    return ['http:', 'https:', 'tel:', 'mailto:'].includes(url.protocol) ? value : undefined
  } catch {
    return undefined
  }
}

export default function ZipSourceSection({ id, content, onAction, hasDefaultRegistration = true, testMode = false, allowedCourseHrefs, sourceEndpoint = '/api/course-template-source' }: Props) {
  const [controlMessage,setControlMessage] = React.useState('')
  const rawControls = content?.controls
  const parsedControls = controlsSchema.safeParse(rawControls && {...rawControls,bindings:Array.isArray(rawControls.bindings)?rawControls.bindings.map((b:any)=>bindingSchema.safeParse(b).success?b:{id:b?.id,action:'pending',target:''}):[]})
  const controls = parsedControls.success ? parsedControls.data : undefined
  const controlsKey = JSON.stringify(controls)
  const frameRef = React.useRef<HTMLIFrameElement | null>(null)
  const [height, setHeight] = React.useState(900)
  const sourceUrl = content?.exactSource?.url || content?.importedSource?.exactSource?.url || ''
  const selectedBlockKeys = zipSelectedBlockKeys(content?.selectedBlockKeys)
  const registrationBlockKeys: string[] = Array.isArray(content?.registrationBlockKeys)
    ? content.registrationBlockKeys.filter((value: unknown): value is string => typeof value === 'string')
    : []

  React.useEffect(() => {
    const frame = frameRef.current
    if (!frame) return

    const sendAnchorToFrame = () => {
      const rawHash = window.location.hash
      if (!rawHash || rawHash === '#') return
      let anchor = rawHash.slice(1)
      try { anchor = decodeURIComponent(anchor) } catch {}
      try {
        frame.contentWindow?.postMessage({
          source: 'mfc-zip-parent',
          type: 'navigate_anchor',
          anchor,
        }, '*')
      } catch {}
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.source !== frame.contentWindow) return
      const data = event.data || {}

      if ((data.source === 'mfc-zip-source' || data.source === 'dhcc') && data.type === 'height' && Number.isFinite(data.height)) {
        setHeight(Math.max(300, Math.min(20000, Math.ceil(data.height))))
        return
      }

      if (data.source === 'mfc-zip-source' && data.type === 'scroll' && Number.isFinite(data.top)) {
        const rect = frameRef.current?.getBoundingClientRect()
        if (!rect) return

        if (data.updateHash !== false && typeof data.anchor === 'string' && data.anchor) {
          const url = new URL(window.location.href)
          const previousHash = url.hash
          url.hash = data.anchor
          if (url.hash !== previousHash) {
            window.history.pushState(null, '', `${url.pathname}${url.search}${url.hash}`)
          }
        }

        const absoluteTop = window.scrollY + rect.top + Number(data.top) - 72
        window.scrollTo({ top: Math.max(0, absoluteTop), behavior: 'smooth' })
        return
      }

      // Không nhận URL từ iframe: tra ID trong cấu hình đã lưu và kiểm tra lại phạm vi khóa học.
      if (data.source === 'mfc-zip-source' && data.type === 'control_action') {
        const b=controls?.bindings.find(item=>item.id===data.controlId)
        const item=controls?.items.find(item=>item.id===data.controlId)
        if(!b || !item)return
        if(b.action==='pending'){setControlMessage(`“${item.label}” cần cấu hình hành động.`);return}
        if(['tab','scroll'].includes(b.action)){setControlMessage(`Đã thử “${item.label}”: ${b.action==='tab'?'chuyển tab':'cuộn nội dung'}.`);return}
        const resolved=resolveControlAction(b,window.location.href,allowedCourseHrefs)
        if(resolved.kind==='blocked'){setControlMessage('Khóa học hoặc đường dẫn này không còn hợp lệ trong website.');return}
        if(resolved.kind==='registration'&&!hasDefaultRegistration){setControlMessage('Chọn khóa học cho nút đăng ký hoặc thêm Form tư vấn trong Page.');return}
        if(testMode){setControlMessage(`“${item.label}” → ${resolved.kind==='link'?resolved.url:'Đăng ký khóa học đang áp dụng / Form của Page'}`);return}
        if(resolved.kind==='registration')onAction?.('open_registration')
        if(resolved.kind==='link')window.location.assign(resolved.url)
        return
      }
      if (data.source === 'mfc-zip-source' && data.type === 'action') {
        const actionType = typeof data.actionType === 'string' ? data.actionType : 'open_registration'
        if (actionType === 'course_link') {
          const allowedTargets = Object.values(zipCourseLinks(window.location.pathname))
          if (typeof data.target === 'string' && allowedTargets.includes(data.target)) {
            window.location.assign(data.target)
          }
          return
        }
        if (actionType === 'external_link') {
          const target = safeExternal(data.target)
          if (target) onAction?.('external_link', target)
          return
        }
        if (['open_registration', 'open_share'].includes(actionType)) {
          if (actionType === 'open_registration' && data.updateHash !== false && typeof data.anchor === 'string') {
            const url = new URL(window.location.href)
            url.hash = data.anchor
            if (url.hash !== window.location.hash) window.history.pushState(null, '', `${url.pathname}${url.search}${url.hash}`)
          }
          onAction?.(actionType)
        }
        return
      }

      if (data.source === 'dhcc' && data.type === 'scroll' && Number.isFinite(data.top)) {
        const rect = frame.getBoundingClientRect()
        const absoluteTop = window.scrollY + rect.top + Number(data.top) - 72
        window.scrollTo({ top: Math.max(0, absoluteTop), behavior: 'smooth' })
      }
    }

    const sendConfiguration = () => {
      try {
        frame.contentWindow?.postMessage({
          source: 'mfc-zip-parent',
          type: 'configure',
          controlBindings: controls?.bindings || [],
          selectedBlockKeys,
          registrationBlockKeys,
          pageUrl: window.location.origin + window.location.pathname,
          courseLinks: zipCourseLinks(window.location.pathname),
        }, '*')
      } catch {}
    }

    const sendViewport = () => {
      const rect = frame.getBoundingClientRect()
      const top = Math.max(0, -rect.top)
      const viewportHeight = window.innerHeight
      try {
        frame.contentWindow?.postMessage({ source: 'mfc-zip-parent', type: 'viewport', top, height: viewportHeight }, '*')
        // Backward-compatible bridge for the supplied "Đồng Hành Cùng Con" source package.
        frame.contentWindow?.postMessage({ source: 'dhcc-parent', type: 'viewport', top, height: viewportHeight }, '*')
      } catch {}
    }

    window.addEventListener('message', handleMessage)
    window.addEventListener('scroll', sendViewport, { passive: true })
    window.addEventListener('resize', sendViewport)
    window.addEventListener('hashchange', sendAnchorToFrame)
    window.addEventListener('popstate', sendAnchorToFrame)
    const timer = window.setTimeout(() => {
      sendConfiguration()
      sendViewport()
      sendAnchorToFrame()
    }, 250)

    return () => {
      window.removeEventListener('message', handleMessage)
      window.removeEventListener('scroll', sendViewport)
      window.removeEventListener('resize', sendViewport)
      window.removeEventListener('hashchange', sendAnchorToFrame)
      window.removeEventListener('popstate', sendAnchorToFrame)
      window.clearTimeout(timer)
    }
  }, [onAction, sourceUrl, controlsKey, testMode, hasDefaultRegistration, allowedCourseHrefs?.join('|'), selectedBlockKeys?.join('|'), registrationBlockKeys.join('|')])

  if (!sourceUrl) {
    return (
      <section id={id} className="mx-auto max-w-3xl p-8 text-center text-sm text-red-600">
        Không tìm thấy nguồn HTML của mẫu.
      </section>
    )
  }

  return (
    <div>{controlMessage && <p role="status" className="rounded border bg-violet-50 p-3 text-sm text-violet-900">{controlMessage}</p>}<iframe
      ref={frameRef}
      id={id}
      title={content?.exactSource?.entryPath || 'Mẫu HTML nguyên trang'}
      src={zipFrameSource(sourceUrl, process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/^\/api\/course-template-source(?=\?)/, sourceEndpoint)}
      sandbox="allow-scripts"
      referrerPolicy="no-referrer"
      scrolling="no"
      className="block w-full border-0 bg-white"
      style={{ height }}
      onLoad={() => {
        try {
          frameRef.current?.contentWindow?.postMessage({
            source: 'mfc-zip-parent',
            type: 'configure',
            controlBindings: controls?.bindings || [],
            selectedBlockKeys,
            registrationBlockKeys,
            pageUrl: window.location.origin + window.location.pathname,
            courseLinks: zipCourseLinks(window.location.pathname),
          }, '*')
          const rawHash = window.location.hash
          if (rawHash && rawHash !== '#') {
            let anchor = rawHash.slice(1)
            try { anchor = decodeURIComponent(anchor) } catch {}
            frameRef.current?.contentWindow?.postMessage({
              source: 'mfc-zip-parent',
              type: 'navigate_anchor',
              anchor,
            }, '*')
          }
        } catch {}
      }}
    /></div>
  )
}
