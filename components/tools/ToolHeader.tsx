'use client'

import Link from 'next/link'
import Image from 'next/image'

interface ToolHeaderProps {
  title?: string
  backUrl?: string
  toolSlug?: string
}

export default function ToolHeader({ title, backUrl }: ToolHeaderProps) {
  const pageTitle = title || 'CÔNG CỤ'
  const effectiveBackUrl = backUrl || (title ? '/tools' : '/')
  const isHome = effectiveBackUrl === '/'

  return (
    <header className="bg-brk-surface text-brk-on-surface shadow-lg sticky top-0 z-50">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-1">
          <Link 
            href={effectiveBackUrl} 
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <Image
              src="/icon Back.png"
              alt="Quay lại"
              width={36}
              height={36}
              className="object-contain"
              style={{ width: 'auto', height: '28px' }}
            />
            <span className="text-xs font-medium uppercase hidden sm:inline">{isHome ? 'TRANG CHỦ' : 'QUAY LẠI'}</span>
          </Link>
        </div>
        
        <h1 className="text-sm font-bold uppercase absolute left-1/2 -translate-x-1/2">{pageTitle}</h1>
        
        <div className="w-20" />
      </div>
    </header>
  )
}