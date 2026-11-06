'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Share2 } from 'lucide-react'
const ShareModal = dynamic(() => import('@/components/share/ShareModal'), { ssr: false })

export default function OfferingShare({ course, userId, siteName, compact = false }: { course: { id_khoa: string; name_lop: string; productGroup: string }; userId: number | null; siteName: string; compact?: boolean }) {
  const [open, setOpen] = useState(false)
  return <><button type="button" aria-label={'Chia sẻ ' + course.name_lop} title="Chia sẻ" onClick={() => setOpen(true)} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-brk-outline px-4 text-sm font-semibold text-brk-primary"><Share2 className="h-4 w-4" />{!compact && 'Chia sẻ'}</button>{open && <ShareModal isOpen onClose={() => setOpen(false)} course={course} affiliateCode={userId != null ? String(userId) : null} siteName={siteName} />}</>
}
