'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import MainHeader from '@/components/layout/MainHeader'

interface TestData {
  users: number
  systems: number
  tcaMembers: number
  closures: number
}

interface PromoteResult {
  success: boolean
  stats?: TestData
  message?: string
  error?: string
}

function DeleteByUserSection() {
  const [deleteMode, setDeleteMode] = useState<'gte' | 'between' | 'in'>('gte')
  const [val, setVal] = useState('')
  const [valA, setValA] = useState('')
  const [valB, setValB] = useState('')
  const [vals, setVals] = useState('')
  const [preview, setPreview] = useState<any>(null)
  const [deleting, setDeleting] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handlePreview = async () => {
    setResult(null)
    setPreview(null)
    let cond: any = { type: deleteMode }
    if (deleteMode === 'gte') cond.value = parseInt(val) || 0
    if (deleteMode === 'between') { cond.valueA = parseInt(valA) || 0; cond.valueB = parseInt(valB) || 999999 }
    if (deleteMode === 'in') cond.values = vals.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
    try {
      const res = await fetch('/api/sync-tca/delete-by-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'preview', userIdCondition: cond }) })
      setPreview(await res.json())
    } catch (e) { console.error(e) }
  }

  const handleDelete = async () => {
    if (!preview) return
    if (!confirm('⚠️ CẢNH BÁO: Xóa VĨNH VIỄN dữ liệu! Bạn có chắc chắn?')) return
    let cond: any = { type: deleteMode }
    if (deleteMode === 'gte') cond.value = parseInt(val) || 0
    if (deleteMode === 'between') { cond.valueA = parseInt(valA) || 0; cond.valueB = parseInt(valB) || 999999 }
    if (deleteMode === 'in') cond.values = vals.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
    setDeleting(true)
    setResult(null)
    try {
      const res = await fetch('/api/sync-tca/delete-by-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', userIdCondition: cond }) })
      setResult(await res.json())
      setPreview(null)
    } catch (e) { setResult({ success: false, error: String(e) }) } finally { setDeleting(false) }
  }

  return (
    <div className="p-4">
      <div className="flex gap-4 mb-3">
        <label className="flex items-center"><input type="radio" checked={deleteMode==='gte'} onChange={()=>setDeleteMode('gte')}/> ID ≥</label>
        <label className="flex items-center"><input type="radio" checked={deleteMode==='between'} onChange={()=>setDeleteMode('between')}/> ID từ...đến...</label>
        <label className="flex items-center"><input type="radio" checked={deleteMode==='in'} onChange={()=>setDeleteMode('in')}/> ID trong (A,B...)</label>
      </div>
      {deleteMode==='gte' && <input type="number" value={val} onChange={e=>setVal(e.target.value)} placeholder="58681" className="w-full border rounded p-2 mb-3"/>}
      {deleteMode==='between' && <div className="flex gap-2 mb-3"><input type="number" value={valA} onChange={e=>setValA(e.target.value)} placeholder="Từ ID" className="flex-1 border rounded p-2"/><input type="number" value={valB} onChange={e=>setValB(e.target.value)} placeholder="Đến ID" className="flex-1 border rounded p-2"/></div>}
      {deleteMode==='in' && <textarea value={vals} onChange={e=>setVals(e.target.value)} placeholder="58681, 58682, 58690" className="w-full border rounded p-2 mb-3 h-20"/>}
      <div className="flex gap-2">
        <button onClick={handlePreview} className="px-4 py-2 bg-blue-500 text-white rounded">Preview</button>
        <button onClick={handleDelete} disabled={deleting || !preview} className="px-4 py-2 bg-red-500 text-white rounded disabled:opacity-50">{deleting ? 'Đang xóa...' : 'Xóa'}</button>
      </div>
      {preview && (
        <div className="mt-3 p-3 bg-blue-50 rounded">
          <p className="font-medium">{preview.message}</p>
          {preview.users && preview.users.length > 0 && (
            <div className="mt-2">
              <p className="font-semibold text-sm">Users ({preview.users.length}):</p>
              <div className="max-h-40 overflow-y-auto text-sm">
                {preview.users.map((u: any) => <span key={u.id} className="mr-2 text-blue-700">{u.id}: {u.name}</span>)}
              </div>
            </div>
          )}
          {preview.systems && preview.systems.length > 0 && (
            <div className="mt-2">
              <p className="font-semibold text-sm">Systems ({preview.systems.length}):</p>
              <div className="max-h-40 overflow-y-auto text-sm">
                {preview.systems.map((s: any) => <span key={s.autoId} className="mr-2 text-green-700">{s.autoId}: {s.user?.name}</span>)}
              </div>
            </div>
          )}
          {preview.tcaMembers && preview.tcaMembers.length > 0 && (
            <div className="mt-2">
              <p className="font-semibold text-sm">TCAMembers ({preview.tcaMembers.length}):</p>
              <div className="max-h-40 overflow-y-auto text-sm">
                {preview.tcaMembers.map((m: any) => <span key={m.id} className="mr-2 text-purple-700">{m.tcaId}: {m.name}</span>)}
              </div>
            </div>
          )}
        </div>
      )}
      {result && <div className={`mt-3 p-3 rounded ${result.success ? 'bg-green-50' : 'bg-red-50'}`}><p>{result.message}</p></div>}
    </div>
  )
}

function TestPanel() {
  const [testData, setTestData] = useState<TestData | null>(null)
  const [loading, setLoading] = useState(true)
  const [promoting, setPromoting] = useState(false)
  const [promoteResult, setPromoteResult] = useState<PromoteResult | null>(null)

  async function fetchTestData() {
    try {
      const res = await fetch('/api/sync-tca/show-data?table=test')
      const data = await res.json()
      setTestData(data.stats || null)
    } catch (e) {
      console.error('Failed to fetch test data:', e)
    } finally {
      setLoading(false)
    }
  }

  async function handlePromote() {
    if (!confirm('Đẩy dữ liệu Test lên Production?\n\nSau khi đẩy, dữ liệu Test sẽ bị XÓA.')) {
      return
    }
    if (!confirm('Xác nhận lần cuối: Dữ liệu Test sẽ được copy sang Production và XÓA khỏi bảng Test.')) {
      return
    }

    setPromoting(true)
    setPromoteResult(null)
    try {
      const res = await fetch('/api/sync-tca/promote', { method: 'POST' })
      const result = await res.json()
      setPromoteResult(result)
      fetchTestData()
    } catch (e) {
      setPromoteResult({ success: false, error: String(e) })
    } finally {
      setPromoting(false)
    }
  }

  useEffect(() => {
    fetchTestData()
  }, [])

  if (loading) {
    return <div className="p-4 text-gray-500">Đang tải dữ liệu Test...</div>
  }

  return (
    <div className="space-y-4">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-bold text-yellow-800 mb-2">Dữ liệu Test (Staging)</h3>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <div className="text-2xl font-bold text-green-600">{testData?.users || 0}</div>
            <div className="text-sm text-gray-500">UserTest</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">{testData?.systems || 0}</div>
            <div className="text-sm text-gray-500">SystemTest</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">{testData?.tcaMembers || 0}</div>
            <div className="text-sm text-gray-500">TCAMemberTest</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">{testData?.closures || 0}</div>
            <div className="text-sm text-gray-500">Closures Test</div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {testData && (testData.users > 0 || testData.systems > 0 || testData.tcaMembers > 0 || testData.closures > 0) ? (
          <>
            <button
              onClick={handlePromote}
              disabled={promoting}
              className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg disabled:opacity-50"
            >
              {promoting ? 'Đang đẩy...' : '🚀 ĐẨY LÊN PRODUCTION'}
            </button>
            <button
              onClick={async () => {
                if (!confirm('XÓA toàn bộ dữ liệu Test?')) return;
                await fetch('/api/sync-tca/clear-test', { method: 'DELETE' });
                fetchTestData();
              }}
              className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg"
            >
              🗑️ XÓA DỮ LIỆU TEST
            </button>
          </>
        ) : (
          <div className="p-4 bg-gray-100 rounded-lg text-center text-gray-500">
            <p>Chưa có dữ liệu Test</p>
            <p className="text-xs mt-1">Sử dụng Chrome Extension để sync dữ liệu TCA</p>
          </div>
        )}
      </div>

      {promoteResult && (
        <div className={`p-4 rounded-lg ${promoteResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <p className={`font-bold ${promoteResult.success ? 'text-green-700' : 'text-red-700'}`}>
            {promoteResult.success ? '✅ Đẩy thành công!' : '❌ Thất bại!'}
          </p>
          {promoteResult.message && <p className="text-sm mt-1">{promoteResult.message}</p>}
          {promoteResult.error && <p className="text-sm text-red-600 mt-1">Error: {promoteResult.error}</p>}
        </div>
      )}
    </div>
  )
}

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
  const [activeTab, setActiveTab] = useState<'history' | 'test'>('history')
  const [rollbackMode, setRollbackMode] = useState<'syncId' | 'tcaIds' | 'dateRange'>('syncId')
  const [rollbackInput, setRollbackInput] = useState('')
  const [rollbackResult, setRollbackResult] = useState<RollbackResult | null>(null)

  useEffect(() => {
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
    if (!confirm('Bạn có chắc muốn xóa dữ liệu?\n\nHành động này không thể hoàn tác!')) {
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
      <MainHeader title="TCA Sync" toolSlug="tca-sync" />
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">TCA Sync Tools</h1>
          <p className="text-gray-600 mt-2">Quản lý và rollback dữ liệu đồng bộ từ TCA</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 font-medium rounded-t-lg ${
              activeTab === 'history'
                ? 'bg-white border-t border-l border-r border-gray-200 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📊 Lịch sử Sync
          </button>
          <button
            onClick={() => setActiveTab('test')}
            className={`px-4 py-2 font-medium rounded-t-lg ${
              activeTab === 'test'
                ? 'bg-yellow-50 border-t border-l border-r border-yellow-200 text-yellow-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🧪 Test Data
          </button>
        </div>

        {activeTab === 'test' ? (
          <div className="bg-white rounded-lg shadow p-6">
            <TestPanel />
          </div>
        ) : (
          <>
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
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {rollbackMode === 'syncId' && 'Nhập SyncId:'}
                  {rollbackMode === 'tcaIds' && 'Nhập TCA IDs (cách nhau bởi dấu phẩy):'}
                </label>
                <input
                  type="text"
                  value={rollbackInput}
                  onChange={(e) => setRollbackInput(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder={
                    rollbackMode === 'syncId' ? 'Dán SyncId' : '60073, 60074, 61297'
                  }
                />
              </div>

              <button
                onClick={handleRollback}
                disabled={loading || !rollbackInput.trim()}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Đang xử lý...' : 'Rollback'}
              </button>

              {rollbackResult && (
                <div className={`mt-4 p-3 rounded-lg ${rollbackResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <p className={`font-medium ${rollbackResult.success ? 'text-green-700' : 'text-red-700'}`}>
                    {rollbackResult.success ? 'Thành công!' : 'Thất bại!'}
                  </p>
                  <p className="text-sm mt-1">{rollbackResult.message}</p>
                  {rollbackResult.error && (
                    <p className="text-sm text-red-600 mt-1">Error: {rollbackResult.error}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow mt-6">
            <div className="p-4 border-b border-red-200 bg-red-50">
              <h2 className="text-xl font-bold text-red-600">Xóa theo User ID</h2>
              <p className="text-sm text-red-500 mt-1">⚠️ Cảnh báo: Xóa vĩnh viễn dữ liệu!</p>
            </div>
            <DeleteByUserSection />
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  )
}