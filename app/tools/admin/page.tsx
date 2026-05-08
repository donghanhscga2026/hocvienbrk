'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Settings, ArrowLeft, Plus, Trash2, Loader2, AlertTriangle } from 'lucide-react'
import MainHeader from '@/components/layout/MainHeader'
import CreateSystemModal from '@/components/admin/system/CreateSystemModal'
import DeleteConfirmDialog from '@/components/admin/system/DeleteConfirmDialog'
import { getSystemStatsAction } from '@/app/actions/system-actions'
import { Role } from '@prisma/client'

interface SystemInfo {
  onSystem: number
  nameSystem: string
  systemCount: number
  closureCount: number
}

export default function AdminPage() {
  const { data: session } = useSession()
  const [systems, setSystems] = useState<SystemInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modal states
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

  useEffect(() => {
    loadSystems()
  }, [])

  const handleDeleteClick = (system: SystemInfo) => {
    setSelectedSystem(system)
    setShowDeleteDialog(true)
  }

  const handleSuccess = () => {
    loadSystems()
  }

  // Check admin access
  if (session?.user?.role !== Role.ADMIN) {
    return (
      <main>
        <MainHeader title="Không có quyền truy cập" />
        <div className="container mx-auto px-4 py-20 text-center">
          <AlertTriangle className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-red-600 mb-2">Không có quyền truy cập</h2>
          <p className="text-gray-600">Chỉ ADMIN mới có thể truy cập trang này.</p>
          <Link href="/tools" className="inline-block mt-6">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Quay lại Tools
            </Button>
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-brk-bg text-brk-on-surface">
      <MainHeader title="Quản Trị Hệ Thống" />

      <div className="container mx-auto px-4 py-8">
        {/* Header with create button */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-brk-on-surface">Quản Trị Hệ Thống</h1>
            <p className="text-brk-muted mt-1">Quản lý các hệ thống trong dự án</p>
          </div>
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="bg-brk-primary text-brk-on-primary hover:opacity-90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Tạo hệ thống mới
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-brk-surface p-6 rounded-2xl border border-brk-outline shadow-sm">
            <p className="text-sm text-brk-muted mb-1">Tổng số hệ thống</p>
            <p className="text-3xl font-black text-brk-primary">{systems.length}</p>
          </div>
          <div className="bg-brk-surface p-6 rounded-2xl border border-brk-outline shadow-sm">
            <p className="text-sm text-brk-muted mb-1">Tổng số nodes</p>
            <p className="text-3xl font-black text-green-500">
              {systems.reduce((sum, s) => sum + s.systemCount, 0)}
            </p>
          </div>
          <div className="bg-brk-surface p-6 rounded-2xl border border-brk-outline shadow-sm">
            <p className="text-sm text-brk-muted mb-1">Tổng closures</p>
            <p className="text-3xl font-black text-purple-500">
              {systems.reduce((sum, s) => sum + s.closureCount, 0)}
            </p>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 mb-6">
            <AlertTriangle className="w-5 h-5 inline mr-2" />
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-brk-primary" />
            <span className="ml-3 text-lg text-brk-muted">Đang tải...</span>
          </div>
        )}

        {/* Systems Table */}
        {!loading && (
          <div className="bg-brk-surface rounded-2xl border border-brk-outline shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-brk-bg border-b border-brk-outline">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-bold text-brk-on-surface">Mã (onSystem)</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-brk-on-surface">Tên hệ thống</th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-brk-on-surface">Số nodes</th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-brk-on-surface">Số closures</th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-brk-on-surface">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {systems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-brk-muted">
                        Chưa có hệ thống nào. Hãy tạo hệ thống mới.
                      </td>
                    </tr>
                  ) : (
                    systems.map((system) => {
                      const isDefault = [0, 1, 2].includes(system.onSystem)
                      return (
                        <tr key={system.onSystem} className="border-b border-brk-outline hover:bg-brk-bg/50 transition-colors">
                          <td className="px-6 py-4">
                            <span className="font-bold text-brk-primary">{system.onSystem}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-medium text-brk-on-surface">{system.nameSystem}</span>
                            {isDefault && (
                              <span className="ml-2 px-2 py-1 bg-amber-500/10 text-amber-500 text-xs font-bold rounded-full">
                                Mặc định
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="px-3 py-1 bg-brk-primary/10 text-brk-primary rounded-full text-sm font-bold">
                              {system.systemCount}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="px-3 py-1 bg-purple-500/10 text-purple-500 rounded-full text-sm font-bold">
                              {system.closureCount}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteClick(system)}
                              disabled={isDefault}
                              className={isDefault ? 'opacity-50 cursor-not-allowed border-brk-outline' : 'text-red-500 border-red-500/20 hover:bg-red-500/10'}
                              title={isDefault ? 'Hệ thống mặc định không thể xóa' : 'Xóa hệ thống'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
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
      </div>

      {/* Create Modal */}
      <CreateSystemModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleSuccess}
      />

      {/* Delete Dialog */}
      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        system={selectedSystem}
        onSuccess={handleSuccess}
      />
    </main>
  )
}
