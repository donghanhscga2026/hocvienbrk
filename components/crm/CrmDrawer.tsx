'use client'
import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

export default function CrmDrawer({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { const node = ref.current; node?.showModal(); return () => node?.close() }, [])
  return <dialog ref={ref} aria-label={title} onCancel={event => { event.preventDefault(); onClose() }} className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-dvh w-full max-w-full overflow-y-auto border-l border-slate-200 bg-white p-0 text-slate-800 shadow-2xl backdrop:bg-slate-900/35 sm:max-w-2xl"><header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6"><h2 className="min-w-0 break-words text-lg font-bold">{title}</h2><button type="button" aria-label="Đóng hồ sơ" onClick={onClose} className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border"><X size={18} /></button></header><div className="space-y-5 p-4 sm:p-6">{children}</div></dialog>
}
