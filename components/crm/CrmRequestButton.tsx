'use client'

import { useEffect, useRef, useState } from 'react'
import { MessageCircle, X } from 'lucide-react'
import CrmRequestForm from './CrmRequestForm'
import { useDomainBrand } from '@/components/website/DomainShell'

export default function CrmRequestButton({ courseId, courseTitle, lessonId, lessonTitle, signedIn, learning = false, compact = false }: {
  courseId: number; courseTitle: string; lessonId?: string; lessonTitle?: string; signedIn: boolean; learning?: boolean; compact?: boolean;
}) {
  const [open, setOpen] = useState(false)
  const brand=useDomainBrand()
  const dialog = useRef<HTMLDialogElement>(null)
  const title = learning ? 'Hỏi giáo viên / Hỗ trợ' : 'Hỏi về khóa học này'
  useEffect(() => {
    const node = dialog.current
    if (open && !node?.open) node?.showModal()
    if (!open && node?.open) node.close()
  }, [open])
  if(brand && !brand.crm) return null
  return <>
    <button type="button" aria-haspopup="dialog" aria-label={title} title={title} onClick={() => setOpen(true)} className={'inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ' + (learning ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'border border-emerald-500 bg-white text-emerald-800 hover:bg-emerald-50')}>
      <MessageCircle size={16} aria-hidden="true" />{learning ? <span className={compact ? 'hidden sm:inline' : ''}>Hỏi giáo viên<span className="hidden sm:inline"> / Hỗ trợ</span></span> : <span className={compact ? 'hidden sm:inline' : ''}>{title}</span>}
    </button>
    <dialog ref={dialog} aria-label={title} onCancel={e => { e.preventDefault(); setOpen(false) }} className="m-auto max-h-[90dvh] w-[calc(100%_-_1.5rem)] max-w-lg overflow-y-auto rounded-2xl bg-white p-0 text-slate-800 shadow-2xl backdrop:bg-black/60">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-white p-4"><h2 className="font-bold">{title}</h2><button type="button" aria-label="Đóng yêu cầu" onClick={() => setOpen(false)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border"><X size={18} /></button></div>
      <div className="space-y-3 p-4"><div className="rounded-xl bg-slate-50 p-3 text-sm"><p className="break-words"><strong>Khóa học:</strong> {courseTitle}</p>{lessonTitle && <p className="mt-1 break-words"><strong>Bài đang xem:</strong> {lessonTitle}</p>}</div>
        <CrmRequestForm courseId={courseId} lessonId={lessonId} signedIn={signedIn} initiallyOpen hideTrigger defaultCategory={learning ? (lessonId ? 'LEARNING' : 'SUPPORT') : 'CONSULTATION'} />
      </div>
    </dialog>
  </>
}
