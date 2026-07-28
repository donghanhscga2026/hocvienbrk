'use client'

import { BarChart3, GitBranch, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface TabItem {
  id: string
  label: string
  icon: 'BarChart3' | 'GitBranch' | 'Settings'
}

interface TabNavigationProps {
  tabs: TabItem[]
  active: string
  onChange: (id: string) => void
  className?: string
}

const iconMap = {
  BarChart3,
  GitBranch,
  Settings,
}

const tabStyles: Record<string, {
  baseBg: string
  activeBg: string
  activeText: string
  activeIcon: string
  activeBorder: string
  activeShadow: string
  indicator: string
  inactiveText: string
  inactiveHover: string
}> = {
  dashboard: {
    baseBg: 'bg-gradient-to-br from-emerald-50 to-teal-50',
    activeBg: 'bg-gradient-to-b from-emerald-100 via-teal-50 to-emerald-50',
    activeText: 'text-emerald-700',
    activeIcon: 'text-emerald-600',
    activeBorder: 'border-emerald-300',
    activeShadow: 'shadow-[0_0_15px_rgba(16,185,129,0.3),inset_0_1px_0_rgba(255,255,255,0.8)]',
    indicator: 'bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500',
    inactiveText: 'text-slate-400',
    inactiveHover: 'hover:bg-emerald-50/50 hover:text-emerald-600',
  },
  diagram: {
    baseBg: 'bg-gradient-to-br from-indigo-50 to-violet-50',
    activeBg: 'bg-gradient-to-b from-indigo-100 via-violet-50 to-indigo-50',
    activeText: 'text-indigo-700',
    activeIcon: 'text-indigo-600',
    activeBorder: 'border-indigo-300',
    activeShadow: 'shadow-[0_0_15px_rgba(99,102,241,0.3),inset_0_1px_0_rgba(255,255,255,0.8)]',
    indicator: 'bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-500',
    inactiveText: 'text-slate-400',
    inactiveHover: 'hover:bg-indigo-50/50 hover:text-indigo-600',
  },
  settings: {
    baseBg: 'bg-gradient-to-br from-amber-50 to-orange-50',
    activeBg: 'bg-gradient-to-b from-amber-100 via-orange-50 to-amber-50',
    activeText: 'text-amber-700',
    activeIcon: 'text-amber-600',
    activeBorder: 'border-amber-300',
    activeShadow: 'shadow-[0_0_15px_rgba(245,158,11,0.3),inset_0_1px_0_rgba(255,255,255,0.8)]',
    indicator: 'bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500',
    inactiveText: 'text-slate-400',
    inactiveHover: 'hover:bg-amber-50/50 hover:text-amber-600',
  },
}

export default function TabNavigation({ tabs, active, onChange, className }: TabNavigationProps) {
  return (
    <>
      <style jsx global>{`
        @keyframes tab-glow-pulse {
          0%, 100% {
            box-shadow: 0 0 12px rgba(99,102,241,0.25), inset 0 1px 0 rgba(255,255,255,0.8);
          }
          50% {
            box-shadow: 0 0 25px rgba(99,102,241,0.45), inset 0 1px 0 rgba(255,255,255,0.8);
          }
        }
        @keyframes tab-glow-pulse-emerald {
          0%, 100% {
            box-shadow: 0 0 12px rgba(16,185,129,0.25), inset 0 1px 0 rgba(255,255,255,0.8);
          }
          50% {
            box-shadow: 0 0 25px rgba(16,185,129,0.45), inset 0 1px 0 rgba(255,255,255,0.8);
          }
        }
        @keyframes tab-glow-pulse-amber {
          0%, 100% {
            box-shadow: 0 0 12px rgba(245,158,11,0.25), inset 0 1px 0 rgba(255,255,255,0.8);
          }
          50% {
            box-shadow: 0 0 25px rgba(245,158,11,0.45), inset 0 1px 0 rgba(255,255,255,0.8);
          }
        }
        .tab-glow-emerald { animation: tab-glow-pulse-emerald 2s ease-in-out infinite; }
        .tab-glow-indigo { animation: tab-glow-pulse 2s ease-in-out infinite; }
        .tab-glow-amber { animation: tab-glow-pulse-amber 2s ease-in-out infinite; }
      `}</style>
      <div className={cn('shrink-0 border-b border-slate-200/80 z-20 bg-slate-100/50', className)}>
        <div className="flex items-stretch gap-1 p-1">
          {tabs.map((tab) => {
            const Icon = iconMap[tab.icon]
            const isActive = tab.id === active
            const s = tabStyles[tab.id] || tabStyles.diagram
            const glowClass = tab.id === 'dashboard' ? 'tab-glow-emerald' : tab.id === 'diagram' ? 'tab-glow-indigo' : 'tab-glow-amber'
            return (
              <button
                key={tab.id}
                onClick={() => onChange(tab.id)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all duration-300 relative rounded-xl border-2',
                  isActive
                    ? cn(s.activeBg, s.activeText, s.activeBorder, s.activeShadow, glowClass, 'scale-[1.02]')
                    : cn(s.baseBg, s.inactiveText, 'border-transparent', s.inactiveHover, 'hover:scale-[1.01]')
                )}
              >
                {Icon && <Icon className={cn('w-4 h-4 shrink-0 transition-all duration-300', isActive && s.activeIcon)} />}
                <span className="transition-colors duration-200">{tab.label}</span>
                {/* Active glowing bottom border */}
                {isActive && (
                  <div className={cn('absolute -bottom-[5px] inset-x-2 h-[4px] rounded-full', s.indicator)} />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
