'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'

interface SyncHistory {
  id: number
  syncId: string
  action: string
  tableName: string
  recordId: number | null
  tcaId: number | null
  status: string
  createdAt: string
}

interface SyncStats {
  totalSyncs: number
  totalUsers: number
  totalSystems: number
  totalTCAMembers: number
  totalClosures: number
}

interface RollbackResult {
  success: boolean
  syncId: string
  deleted?: {
    users: number
    systems: number
    tcaMembers: number
    closures: number
  }
  message?: string
  error?: string
  hint?: string
}

export default function TCASyncAdminPage() {
  const { data: session, status } = useSession()
  const [history, setHistory] = useState<SyncHistory[]>([])
  const [stats, setStats] = useState<SyncStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [rollbackMode, setRollbackMode] = useState<'syncId' | 'tcaIds' | 'dateRange'>('syncId')
  const [rollbackInput, setRollbackInput] = useState('')
  const [rollbackResult, setRollbackResult] = useState<RollbackResult | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/signin')
    }
    if (status === 'authenticated') {
      fetchData()
    }
  }, [status])

  async function fetchData() {
    try {
      const res = await fetch('/api/sync-tca/rollback')
      const data = await res.json()
      setHistory(data.history || [])
      setStats(data.stats || null)
    } catch (e) {
      console.error('Failed to fetch:', e)
    } finally {
      setLoading(false)
    }
  }

  async function handleRollback() {
    if (!showConfirm) {
      setShowConfirm(true)
      return
    }

    if (confirmText !== 'XAC NHAN XOA') {
      alert('Vui long nhap dung "XAC NHAN XOA" de xac nhan')
      return
    }

    setLoading(true)
    try {
      const payload: Record<string, unknown> = { mode: rollbackMode }

      if (rollbackMode === 'syncId') {
        payload.syncId = rollbackInput.trim()
      } else if (rollbackMode === 'tcaIds') {
        payload.tcaIds = rollbackInput.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
      } else if (rollbackMode === 'dateRange') {
        const [fromDate, toDate] = rollbackInput.split(',')
        payload.fromDate = fromDate?.trim()
        payload.toDate = toDate?.trim()
      }

      const res = await fetch('/api/sync-tca/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const result = await res.json()
      setRollbackResult(result)
      setShowConfirm(false)
      setConfirmText('')
      fetchData()
    } catch (e) {
      console.error('Rollback failed:', e)
      setRollbackResult({ success: false, syncId: '', error: String(e) })
    } finally {
      setLoading(false)
    }
  }

  async function handleQuickRollback(syncId: string) {
    if (!confirm(`Rollback tất cả dữ liệu của sync ${syncId}?\n\nHành động này sẽ xóa vĩnh viễn dữ liệu!`)) {
      return
    }
    if (!confirm(`Xác nhận lần cuối: Bạn chắc chắn muốn xóa dữ liệu của sync ${syncId}?`)) {
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/sync-tca/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'syncId', syncId })
      })

      const result = await res.json()
      setRollbackResult(result)
      fetchData()
    } catch (e) {
      console.error('Rollback failed:', e)
      setRollbackResult({ success: false, syncId: '', error: String(e) })
    } finally {
      setLoading(false)
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    alert(`Đã copy: ${text}`)
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải...</p>
        </div>
      </div>
    )
  }

  if (session?.user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Không có quyền truy cập</h1>
          <p className="text-gray-600">Trang này chỉ dành cho Admin.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">TCA Sync Tools</h1>
          <p className="text-gray-600 mt-2">Quản lý và rollback dữ liệu đồng bộ từ TCA</p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-5 gap-4 mb-8">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-gray-900">{stats.totalSyncs}</div>
              <div className="text-sm text-gray-500">Tổng Syncs</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-green-600">{stats.totalUsers}</div>
              <div className="text-sm text-gray-500">Users Created</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-blue-600">{stats.totalSystems}</div>
              <div className="text-sm text-gray-500">Systems Created</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-orange-600">{stats.totalTCAMembers}</div>
              <div className="text-sm text-gray-500">TCAMembers Created</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-purple-600">{stats.totalClosures}</div>
              <div className="text-sm text-gray-500">Closures Created</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-8">
          {/* Sync History */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="text-xl font-bold text-gray-900">Lịch sử Sync</h2>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-2 py-1 text-left">SyncId</th>
                    <th className="px-2 py-1 text-left">Action</th>
                    <th className="px-2 py-1 text-left">Table</th>
                    <th className="px-2 py-1 text-left">Status</th>
                    <th className="px-2 py-1 text-left">Date</th>
                    <th className="px-2 py-1 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, i) => (
                    <tr key={i} className="border-t hover:bg-gray-50">
                      <td className="px-2 py-1">
                        <button 
                          onClick={() => copyToClipboard(h.syncId)}
                          className="font-mono text-xs text-blue-600 hover:text-blue-800 underline"
                          title="Click để copy SyncId"
                        >
                          {h.syncId.slice(0, 8)}...
                        </button>
                        <div className="text-xs text-gray-400">Hover để xem đầy đủ</div>
                      </td>
                      <td className="px-2 py-1">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          h.action === 'SYNC_START' ? 'bg-blue-100 text-blue-700' :
                          h.action === 'ROLLBACK' ? 'bg-red-100 text-red-700' :
                          h.action === 'CREATE_USER' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {h.action}
                        </span>
                      </td>
                      <td className="px-2 py-1">{h.tableName}</td>
                      <td className="px-2 py-1">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          h.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                          h.status === 'ROLLED_BACK' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {h.status}
                        </span>
                      </td>
                      <td className="px-2 py-1 text-xs text-gray-500">
                        {new Date(h.createdAt).toLocaleString('vi-VN')}
                      </td>
                      <td className="px-2 py-1 text-center">
                        {h.status === 'COMPLETED' && h.action === 'SYNC_START' && (
                          <button
                            onClick={() => handleQuickRollback(h.syncId)}
                            className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                          >
                            Rollback
                          </button>
                        )}
                        {h.status === 'ROLLED_BACK' && (
                          <span className="text-xs text-gray-400">Đã rollback</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {history.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-2 py-4 text-center text-gray-500">
                        Chưa có lịch sử sync
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Rollback Panel */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="text-xl font-bold text-red-600">Rollback</h2>
              <p className="text-sm text-gray-500 mt-1">
                Cảnh báo: Hành động này sẽ xóa vĩnh viễn dữ liệu!
              </p>
            </div>
            <div className="p-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chế độ Rollback
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="syncId"
                      checked={rollbackMode === 'syncId'}
                      onChange={(e) => setRollbackMode(e.target.value as 'syncId')}
                      className="mr-2"
                    />
                    Theo SyncId
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="tcaIds"
                      checked={rollbackMode === 'tcaIds'}
                      onChange={(e) => setRollbackMode(e.target.value as 'tcaIds')}
                      className="mr-2"
                    />
                    Theo TCA IDs
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="dateRange"
                      checked={rollbackMode === 'dateRange'}
                      onChange={(e) => setRollbackMode(e.target.value as 'dateRange')}
                      className="mr-2"
                    />
                    Theo Ngày
                  </label>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {rollbackMode === 'syncId' && 'Nhập SyncId (click vào ID trong bảng để copy):'}
                  {rollbackMode === 'tcaIds' && 'Nhập TCA IDs (cách nhau bởi dấu phẩy):'}
                  {rollbackMode === 'dateRange' && 'Nhập ngày (định dạng: 2026-04-17, 2026-04-18):'}
                </label>
                <input
                  type="text"
                  value={rollbackInput}
                  onChange={(e) => setRollbackInput(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder={
                    rollbackMode === 'syncId' ? 'Dán SyncId đã copy từ bảng trên' :
                    rollbackMode === 'tcaIds' ? '60073, 60074, 61297' :
                    '2026-04-17, 2026-04-18'
                  }
                />
              </div>

              {showConfirm && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 mb-2">
                    Cảnh báo: Bạn sắp xóa dữ liệu! Nhập <strong>XAC NHAN XOA</strong> để tiếp tục:
                  </p>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="XAC NHAN XOA"
                    className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={handleRollback}
                  disabled={loading || !rollbackInput.trim()}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    showConfirm
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-orange-500 hover:bg-orange-600 text-white'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading ? 'Đang xử lý...' : showConfirm ? 'XÁC NHẬN XÓA' : 'Rollback'}
                </button>
                {showConfirm && (
                  <button
                    onClick={() => { setShowConfirm(false); setConfirmText('') }}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
                  >
                    Hủy
                  </button>
                )}
              </div>

              {rollbackResult && (
                <div className={`mt-4 p-3 rounded-lg ${rollbackResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <p className={`font-medium ${rollbackResult.success ? 'text-green-700' : 'text-red-700'}`}>
                    {rollbackResult.success ? 'Thành công!' : 'Thất bại!'}
                  </p>
                  <p className="text-sm mt-1">{rollbackResult.message}</p>
                  {rollbackResult.error && (
                    <p className="text-sm text-red-600 mt-1">Error: {rollbackResult.error}</p>
                  )}
                  {rollbackResult.hint && (
                    <p className="text-sm text-orange-600 mt-1">Hint: {rollbackResult.hint}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 rounded-lg p-4">
          <h3 className="font-bold text-blue-900 mb-2">Hướng dẫn sử dụng</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li><strong>Khuyến nghị:</strong> Sử dụng <span className="bg-orange-100 text-orange-700 px-1 rounded">Rollback theo TCA IDs</span> để xóa chính xác từng thành viên</li>
            <li><strong>Rollback theo TCA IDs:</strong> Nhập các TCA IDs cần xóa (VD: 60073, 60074, 61345)</li>
            <li><strong>Rollback theo Ngày:</strong> Nhập khoảng ngày (VD: 2026-04-17, 2026-04-18)</li>
            <li className="text-red-600 font-medium">Dữ liệu sau khi xóa sẽ KHÔNG thể khôi phục!</li>
            <li>Backup sẽ được ghi log ra console trước khi xóa</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
