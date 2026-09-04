'use client'

import { useState, useEffect } from 'react'
import { Zap, Loader2, AlertTriangle } from 'lucide-react'
import TabShell from '@/components/genealogy/ui/TabShell'
import GenealogyAdminTab from '@/components/genealogy/settings/AdminTab'
import { getSystemPromotionLogicAction, switchSystemPromotionLogicAction, getAvailableSystemsAction } from '@/app/actions/admin-actions'
import type { SystemTreeInfo } from '@/app/actions/admin-actions'

export default function SettingsTab() {
  const [selectedSystem, setSelectedSystem] = useState<number | null>(null)
  const [availableSystems, setAvailableSystems] = useState<SystemTreeInfo[]>([])
  const [promotionLogic, setPromotionLogic] = useState<'A' | 'B'>('B')
  const [switchingLogic, setSwitchingLogic] = useState(false)

  useEffect(() => {
    getAvailableSystemsAction().then(res => {
      if (res.success && Array.isArray(res.systems)) {
        setAvailableSystems(res.systems)
      }
    })
  }, [])

  useEffect(() => {
    if (selectedSystem) {
      getSystemPromotionLogicAction(selectedSystem).then(res => {
        if (res.success && res.logic) {
          setPromotionLogic(res.logic as 'A' | 'B')
        }
      })
    }
  }, [selectedSystem])

  const handleSwitchLogic = async (method: 'A' | 'B') => {
    if (!selectedSystem || selectedSystem !== 4 || switchingLogic) return
    const confirmMsg = `Chuyển sang Phương án ${method}? Hệ thống sẽ xóa và tính toán lại toàn bộ dữ liệu.`
    if (!confirm(confirmMsg)) return
    setSwitchingLogic(true)
    try {
      const res = await switchSystemPromotionLogicAction(selectedSystem, method)
      if (res.success) {
        setPromotionLogic(method)
        alert('Chuyển đổi thành công!')
        window.location.reload()
      } else {
        alert('Lỗi: ' + (res.error || ''))
      }
    } catch (err: any) {
      alert('Lỗi: ' + err.message)
    } finally {
      setSwitchingLogic(false)
    }
  }

  const header = (
    <div className="px-4 py-3">
      <h1 className="text-sm font-black text-slate-800 uppercase tracking-tight">Quản trị Hệ thống</h1>
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Cài đặt & Quản lý</p>
    </div>
  )

  return (
    <TabShell header={header}>
      <div className="p-3 sm:p-4 space-y-4 sm:space-y-6">
        {/* Promotion Logic Section */}
        <div className="bg-white rounded-2xl border border-slate-100 p-3 sm:p-4 shadow-sm">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Promotion Logic</h3>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 mb-3">
            <select
              value={selectedSystem ?? ''}
              onChange={(e) => setSelectedSystem(e.target.value ? Number(e.target.value) : null)}
              className="flex-1 bg-slate-50 text-slate-700 text-xs font-black px-3 py-2 rounded-xl border border-slate-200 outline-none"
            >
              <option value="">Chọn hệ thống...</option>
              {availableSystems.map(sys => (
                <option key={sys.onSystem} value={sys.onSystem}>{sys.nameSystem || sys.onSystem}</option>
              ))}
            </select>
          </div>

          {selectedSystem === 4 && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 p-3 bg-slate-50 rounded-xl">
              <span className="text-xs font-bold text-slate-600">Phương án hiện tại:</span>
              <select
                disabled={switchingLogic}
                value={promotionLogic}
                onChange={(e) => handleSwitchLogic(e.target.value as 'A' | 'B')}
                className="bg-white text-xs font-black px-3 py-1.5 rounded-lg border border-slate-200 outline-none cursor-pointer disabled:opacity-50"
              >
                <option value="B">B (Daily 00:00)</option>
                <option value="A">A (Real-time)</option>
              </select>
              {switchingLogic && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
            </div>
          )}

          {selectedSystem !== 4 && selectedSystem !== null && (
            <p className="text-[10px] text-slate-400 font-bold">Chỉ hệ thống MFC (#4) hỗ trợ chuyển đổi Promotion Logic</p>
          )}
        </div>

        {/* Admin Management */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <GenealogyAdminTab />
        </div>
      </div>
    </TabShell>
  )
}
