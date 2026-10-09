'use client'

import { Loader2 } from 'lucide-react'
import { useWi300Brand } from './Wi300BrandContext'

/** Khung chờ phản hồi server, không tạo khóa học hay số liệu giả. */
export default function Wi300Loading({ detail = false }: { detail?: boolean }) {
  const brand = useWi300Brand()
  if (!brand) return <div className={`flex min-h-screen items-center justify-center ${detail ? 'bg-white' : 'bg-gray-50'}`}><Loader2 className="h-8 w-8 animate-spin text-yellow-400" /></div>
  return <div role="status" aria-busy="true" className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <span className="sr-only">Đang tải nội dung…</span>
    <div aria-hidden="true" className="space-y-6 animate-pulse motion-reduce:animate-none">
      <div className="h-5 w-40 rounded bg-brk-outline/50" />
      <div className="h-10 w-3/4 max-w-xl rounded bg-brk-outline/50" />
      {detail ? <div className="grid gap-6 md:grid-cols-2"><div className="h-72 rounded-2xl bg-brk-outline/30" /><div className="space-y-5"><div className="h-6 rounded bg-brk-outline/30" /><div className="h-6 w-4/5 rounded bg-brk-outline/30" /><div className="h-28 rounded bg-brk-outline/30" /><div className="h-12 w-48 rounded bg-brk-outline/40" /></div></div> : <><div className="h-12 rounded-xl bg-brk-outline/30" /><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map(index => <div key={index} className="rounded-2xl border border-brk-outline p-4"><div className="aspect-video rounded-xl bg-brk-outline/30" /><div className="mt-5 h-6 rounded bg-brk-outline/30" /><div className="mt-3 h-4 w-3/4 rounded bg-brk-outline/30" /></div>)}</div></>}
    </div>
  </div>
}
