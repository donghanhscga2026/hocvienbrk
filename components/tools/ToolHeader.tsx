'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface ToolHeaderProps {
  title: string
  backUrl?: string
}

export default function ToolHeader({ title, backUrl = '/tools' }: ToolHeaderProps) {
  return (
    <header className="bg-brk-surface text-brk-on-surface shadow-lg sticky top-0 z-50">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-1">
          <Link 
            href={backUrl} 
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-xs font-medium">CÔNG CỤ</span>
          </Link>
        </div>
        
        <h1 className="text-sm font-bold absolute right-4">{title}</h1>
      </div>
    </header>
  )
}