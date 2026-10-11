'use client'

import { useState } from 'react'
import Image from 'next/image'
import { BookOpen } from 'lucide-react'
import { isValidImageUrl } from '@/lib/image-validation'

export default function Wi300CourseCover({ src }: { src?: string | null }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const imageSrc = src?.trim() || ''
  return <div aria-hidden="true" className="relative aspect-video w-full overflow-hidden border-b border-brk-outline bg-brk-background">
    {isValidImageUrl(imageSrc) && imageSrc !== failedSrc
      ? <Image src={imageSrc} alt="" fill unoptimized sizes="(max-width: 639px) 100vw, 384px" className="object-cover" onError={() => setFailedSrc(imageSrc)} />
      : <div className="flex h-full items-center justify-center text-brk-primary"><BookOpen className="h-10 w-10" strokeWidth={1.5} /></div>}
  </div>
}
