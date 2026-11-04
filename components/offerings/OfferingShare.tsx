'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
const ShareModal = dynamic(() => import('@/components/share/ShareModal'), { ssr: false })

export default function OfferingShare({ course, userId, siteName }: { course: { id_khoa: string; name_lop: string; productGroup: string }; userId: number | null; siteName: string }) {
  const [open, setOpen] = useState(false)
  return <><button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-brk-outline px-4 text-base font-semibold text-brk-primary">Chia sẻ</button>{open && <ShareModal isOpen onClose={() => setOpen(false)} course={course} affiliateCode={userId != null ? String(userId) : null} siteName={siteName} />}</>
}
