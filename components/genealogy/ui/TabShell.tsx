'use client'

import { cn } from '@/lib/utils'

interface TabShellProps {
  header: React.ReactNode
  children: React.ReactNode
  statusBar?: React.ReactNode
  className?: string
}

export default function TabShell({ header, children, statusBar, className }: TabShellProps) {
  return (
    <div className={cn('flex-1 flex flex-col overflow-hidden min-h-0', className)}>
      {/* Header — FIXED */}
      {header && (
        <div className="shrink-0 border-b border-slate-200 bg-white z-10">
          {header}
        </div>
      )}

      {/* Content — SCROLL */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {children}
      </div>

      {/* Status Bar — FIXED BOTTOM */}
      {statusBar && (
        <div className="shrink-0 border-t border-slate-200 bg-white z-10">
          {statusBar}
        </div>
      )}
    </div>
  )
}
