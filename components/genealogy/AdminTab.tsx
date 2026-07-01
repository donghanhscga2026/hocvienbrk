'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import CreateSystemModal from '@/components/admin/system/CreateSystemModal'
import DeleteConfirmDialog from '@/components/admin/system/DeleteConfirmDialog'
import { getSystemStatsAction } from '@/app/actions/system-actions'

interface SystemInfo {
  onSystem: number
  nameSystem: string
  systemCount: number
  closureCount: number
}

export default function GenealogyAdminTab() {
  const [systems, setSystems] = useState<SystemInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedSystem, setSelectedSystem] = useState<SystemInfo | null>(null)

  const loadSystems = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await getSystemStatsAction()
      if (result.success) {
        setSystems(result.systems || [])
      } else {
        setError(result.error || 'Lỗi khi tải dữ liệu')
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSystems() }, [])

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight">Quản Trị Hệ Thống</h1>
          <p className="text-xs text-gray-400 mt-0.5">Quản lý các hệ thống trong dự án</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-black text-yellow-400 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-gray-800 transition-all"
        >
          <Plus className="w-4 h-4" /> Tạo hệ thống
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Tổng hệ thống</p>
          <p className="text-2xl font-black">{systems.length}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Tổng nodes</p>
          <p className="text-2xl font-black text-green-500">{systems.reduce((sum, s) => sum + s.systemCount, 0)}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Tổng closures</p>
          <p className="text-2xl font-black text-purple-500">{systems.reduce((sum, s) => sum + s.closureCount, 0)}</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 rounded-2xl text-red-600 text-sm font-bold mb-6 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          <span className="ml-2 text-sm font-bold text-gray-400">Đang tải...</span>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase text-gray-400">Mã (onSystem)</th>
                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase text-gray-400">Tên hệ thống</th>
                  <th className="px-5 py-3 text-center text-[10px] font-black uppercase text-gray-400">Nodes</th>
                  <th className="px-5 py-3 text-center text-[10px] font-black uppercase text-gray-400">Closures</th>
                  <th className="px-5 py-3 text-center text-[10px] font-black uppercase text-gray-400">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {systems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-gray-400 text-xs font-black">
                      Chưa có hệ thống nào. Hãy tạo hệ thống mới.
                    </td>
                  </tr>
                ) : (
                  systems.map((system) => {
                    const isDefault = [0, 1, 2].includes(system.onSystem)
                    return (
                      <tr key={system.onSystem} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3">
                          <span className="font-bold text-black">{system.onSystem}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="font-medium">{system.nameSystem}</span>
                          {isDefault && (
                            <span className="ml-2 px-2 py-0.5 bg-amber-50 text-amber-600 text-[10px] font-bold rounded-full">
                              Mặc định
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold">{system.systemCount}</span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className="px-2.5 py-1 bg-purple-50 text-purple-600 rounded-full text-xs font-bold">{system.closureCount}</span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <button
                            onClick={() => { setSelectedSystem(system); setShowDeleteDialog(true) }}
                            disabled={isDefault}
                            className={`w-8 h-8 rounded-lg inline-flex items-center justify-center transition-all ${isDefault ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-red-50 text-red-500 hover:bg-red-100'}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CreateSystemModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onSuccess={loadSystems} />
      <DeleteConfirmDialog isOpen={showDeleteDialog} onClose={() => setShowDeleteDialog(false)} system={selectedSystem} onSuccess={loadSystems} />
    </div>
  )
}
