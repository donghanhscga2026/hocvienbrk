'use client'

import { useEffect, useState } from 'react'
import BrkWalletCard from '@/components/brk/BrkWalletCard'
import BrkLevelProgress from '@/components/brk/BrkLevelProgress'
import BrkRevenueHistory from '@/components/brk/BrkRevenueHistory'
import { getBrkDashboard, getAvailableBrkSystems, joinBrkSystem, cancelBrkMembership, getBrkRevenueShare, previewMoveMemberAction, moveBrkMemberAction } from '@/app/actions/brk-actions'

interface BrkSystemInfo {
  onSystem: number
  nameSystem: string
  level: number
  totalPoints: number
  f1Count: number
  totalDownline: number
  activatedAt: string | null
  expiresAt: string | null
  gracePeriodEnd: string | null
  levelProgress: {
    currentLevel: number
    totalPoints: number
    progress: number
    pointsNeeded: number
    nextConfig: { level: number } | null
  } | null
  bonusEligible: boolean
}

interface AvailableSystem {
  onSystem: number
  nameSystem: string
  fee: number
  durationDays: number
  graceDays: number
  returnPct: number
  joined: boolean
  userStatus: string | null
}

interface PreviewResult {
  sourceUserId: number
  sourceName: string | null
  newReferrerUserId: number
  newReferrerName: string | null
  subtreeSize: number
  subtreeUsers: { id: number; name: string | null }[]
  oldChain: { id: number; name: string | null; level: number }[]
  newChain: { id: number; name: string | null; level: number }[]
  commonChainUserIds: number[]
  oldUniqueUserIds: number[]
  newUniqueUserIds: number[]
  totalBatches: number
  estimatedImpact: {
    oldAncestorsReversed: number
    newAncestorsCredited: number
    netLosers: number
    netGainers: number
    brkpChangePerAncestor: number
  }
}

interface MoveResult {
  success: boolean
  logId?: number
  batchesProcessed: number
  totalNodes: number
  details: {
    oldChainReversed: number
    newChainCredited: number
    levelsChecked: number
    levelsChanged: number
  }
  warnings: string[]
}

export default function BrkDashboardPage() {
  const [walletBalance, setWalletBalance] = useState(0)
  const [systems, setSystems] = useState<BrkSystemInfo[]>([])
  const [availableSystems, setAvailableSystems] = useState<AvailableSystem[]>([])
  const [revenueAwards, setRevenueAwards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'systems' | 'revenue' | 'move'>('dashboard')

  const [sourceUserId, setSourceUserId] = useState('')
  const [newReferrerUserId, setNewReferrerUserId] = useState('')
  const [reason, setReason] = useState('')
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [executing, setExecuting] = useState(false)
  const [execResult, setExecResult] = useState<MoveResult | null>(null)
  const [execError, setExecError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [dashboard, available] = await Promise.all([
        getBrkDashboard(),
        getAvailableBrkSystems()
      ])
      setWalletBalance(dashboard.walletBalance)
      setSystems(dashboard.systems)
      setAvailableSystems(available)

      if (dashboard.systems.length > 0) {
        const awards = await getBrkRevenueShare(dashboard.systems[0].onSystem)
        setRevenueAwards(awards)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin(onSystem: number) {
    try {
      const result = await joinBrkSystem(onSystem)
      if (result.status === 'ACTIVE') {
        await loadData()
      } else if (result.status === 'PENDING' && result.courseIdKhoa) {
        window.location.href = `/khoa-hoc/${result.courseIdKhoa}`
      }
    } catch (err: any) {
      alert(err.message)
    }
  }

  async function handleCancel(onSystem: number) {
    if (!confirm('Bạn có chắc muốn hủy kích hoạt? Hành động này chỉ khả dụng trong thời gian cân nhắc.')) return
    await cancelBrkMembership(onSystem)
    await loadData()
  }

  async function handlePreview() {
    const src = Number(sourceUserId)
    const ref = Number(newReferrerUserId)
    if (!src || !ref) { setPreviewError('Vui lòng nhập đủ Source User ID và New Referrer User ID'); return }
    setPreviewLoading(true)
    setPreviewError('')
    setPreview(null)
    setExecResult(null)
    try {
      const result = await previewMoveMemberAction(src, ref)
      setPreview(result)
    } catch (err: any) {
      setPreviewError(err.message)
    } finally {
      setPreviewLoading(false)
    }
  }

  async function handleExecute() {
    if (!preview) return
    if (!reason.trim()) { setExecError('Vui lòng nhập lý do di chuyển'); return }
    if (!confirm(`Xác nhận di chuyển ${preview.subtreeSize} thành viên? Hành động này không thể hoàn tác tự động.`)) return

    setExecuting(true)
    setExecError('')
    setExecResult(null)
    try {
      const result = await moveBrkMemberAction(preview.sourceUserId, preview.newReferrerUserId, reason)
      setExecResult(result)
      if (result.success) {
        await loadData()
      }
    } catch (err: any) {
      setExecError(err.message)
    } finally {
      setExecuting(false)
    }
  }

  function resetMoveForm() {
    setSourceUserId('')
    setNewReferrerUserId('')
    setReason('')
    setPreview(null)
    setPreviewError('')
    setExecResult(null)
    setExecError('')
  }

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Đang tải...</div>
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">BRK Affiliate</h1>
        <div className="flex gap-2 flex-wrap">
          {(['dashboard', 'systems', 'revenue', 'move'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === tab ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab === 'dashboard' ? 'Tổng quan' : tab === 'systems' ? 'Hệ thống' : tab === 'revenue' ? 'Đồng chia' : 'Di chuyển'}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <BrkWalletCard balance={walletBalance} totalEarned={0} totalWithdrawn={0} />
          </div>
          <div className="lg:col-span-2 space-y-4">
            {systems.map((sys) => (
              <div key={sys.onSystem} className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">{sys.nameSystem}</h3>
                    <p className="text-sm text-gray-500">
                      F1: {sys.f1Count} | Tổng hạ: {sys.totalDownline} | Điểm: {sys.totalPoints.toFixed(0)} BRKD
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                    Cấp {sys.level}
                  </span>
                </div>

                {sys.levelProgress && (
                  <BrkLevelProgress
                    currentLevel={sys.levelProgress.currentLevel}
                    totalPoints={sys.levelProgress.totalPoints}
                    progress={sys.levelProgress.progress}
                    pointsNeeded={sys.levelProgress.pointsNeeded}
                    nextLevel={sys.levelProgress.nextConfig?.level}
                  />
                )}

                <div className="flex gap-2 mt-3">
                  {sys.gracePeriodEnd && new Date(sys.gracePeriodEnd) > new Date() && (
                    <button
                      onClick={() => handleCancel(sys.onSystem)}
                      className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                    >
                      Hủy (còn trong thời gian cân nhắc)
                    </button>
                  )}
                  {sys.bonusEligible && (
                    <span className="px-3 py-1.5 text-sm bg-amber-50 text-amber-600 rounded-lg">
                      Đủ điều kiện nhận thưởng 2 F1
                    </span>
                  )}
                </div>
              </div>
            ))}

            {systems.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                Bạn chưa tham gia hệ thống BRK nào. Hãy chuyển qua tab "Hệ thống" để tham gia.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'systems' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableSystems.map((sys) => (
            <div key={sys.onSystem} className="bg-white rounded-xl p-5 border border-gray-200 hover:shadow-md transition">
              <h3 className="font-semibold text-gray-800 text-lg mb-2">{sys.nameSystem}</h3>
              <div className="space-y-1 text-sm text-gray-500 mb-4">
                <p>Phí: ${sys.fee}</p>
                <p>Thời hạn: {sys.durationDays} ngày</p>
                <p>Cân nhắc: {sys.graceDays} ngày</p>
                <p>Hoàn lại: {sys.returnPct}%</p>
              </div>
              {sys.joined ? (
                <span className={`inline-block px-3 py-1.5 rounded-lg text-sm font-medium ${
                  sys.userStatus === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {sys.userStatus === 'ACTIVE' ? 'Đã tham gia' : sys.userStatus === 'CANCELLED' ? 'Đã hủy' : 'Đã hết hạn'}
                </span>
              ) : (
                <button
                  onClick={() => handleJoin(sys.onSystem)}
                  className="w-full px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition font-medium text-sm"
                >
                  Tham gia ngay
                </button>
              )}
            </div>
          ))}

          {availableSystems.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-400">
              Chưa có hệ thống BRK nào được tạo.
            </div>
          )}
        </div>
      )}

      {activeTab === 'revenue' && (
        <BrkRevenueHistory awards={revenueAwards} />
      )}

      {activeTab === 'move' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-800">Di Chuyển Thành Viên (Tree Surgery)</h2>
          <p className="text-sm text-gray-500">
            Công cụ này cho phép admin di chuyển một thành viên (và toàn bộ cây con của họ) từ nhánh cũ sang nhánh mới.
            Hệ thống sẽ tự động đảo hoa hồng từ chain cũ và credit hoa hồng cho chain mới.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source User ID</label>
              <input
                type="number"
                value={sourceUserId}
                onChange={e => setSourceUserId(e.target.value)}
                placeholder="ID thành viên cần di chuyển"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Referrer User ID</label>
              <input
                type="number"
                value={newReferrerUserId}
                onChange={e => setNewReferrerUserId(e.target.value)}
                placeholder="ID người bảo trợ mới"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={handlePreview}
                disabled={previewLoading}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition font-medium text-sm disabled:opacity-50"
              >
                {previewLoading ? 'Đang xem trước...' : 'Xem trước'}
              </button>
              <button
                onClick={resetMoveForm}
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
              >
                Làm lại
              </button>
            </div>
          </div>

          {previewError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {previewError}
            </div>
          )}

          {preview && (
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold text-gray-700">Kết quả xem trước</h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Nguồn</p>
                  <p className="font-medium text-sm">#{preview.sourceUserId} {preview.sourceName}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Bảo trợ mới</p>
                  <p className="font-medium text-sm">#{preview.newReferrerUserId} {preview.newReferrerName}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Cây con</p>
                  <p className="font-medium text-sm">{preview.subtreeSize} thành viên</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Số batch</p>
                  <p className="font-medium text-sm">{preview.totalBatches} (10/batch)</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Chain cũ ({preview.oldChain.length} người)</p>
                  <div className="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto text-sm space-y-1">
                    {preview.oldChain.map(m => (
                      <div key={m.id} className="text-gray-700">#{m.id} {m.name || 'N/A'}</div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Chain mới ({preview.newChain.length} người)</p>
                  <div className="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto text-sm space-y-1">
                    {preview.newChain.map(m => (
                      <div key={m.id} className="text-gray-700">#{m.id} {m.name || 'N/A'}</div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                  <p className="text-xs text-yellow-700">Đảo (cả chain cũ)</p>
                  <p className="text-lg font-semibold text-yellow-800">{preview.estimatedImpact.oldAncestorsReversed} người</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <p className="text-xs text-green-700">Credit (cả chain mới)</p>
                  <p className="text-lg font-semibold text-green-800">{preview.estimatedImpact.newAncestorsCredited} người</p>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                  <p className="text-xs text-orange-700">Mất (unique cũ)</p>
                  <p className="text-lg font-semibold text-orange-800">{preview.estimatedImpact.netLosers} người</p>
                </div>
                <div className="bg-teal-50 p-3 rounded-lg border border-teal-200">
                  <p className="text-xs text-teal-700">Được (unique mới)</p>
                  <p className="text-lg font-semibold text-teal-800">{preview.estimatedImpact.netGainers} người</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-700">BRKP/ancestor</p>
                  <p className="text-lg font-semibold text-blue-800">{preview.estimatedImpact.brkpChangePerAncestor}</p>
                </div>
              </div>

              {preview.subtreeUsers.length > 0 && (
                <details className="text-sm">
                  <summary className="cursor-pointer text-gray-600 font-medium">Danh sách {preview.subtreeUsers.length} thành viên trong cây con</summary>
                  <div className="mt-2 max-h-40 overflow-y-auto bg-gray-50 rounded-lg p-3 space-y-1">
                    {preview.subtreeUsers.map(u => (
                      <div key={u.id} className="text-gray-600">#{u.id} {u.name || 'N/A'}</div>
                    ))}
                  </div>
                </details>
              )}

              <div className="border-t pt-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lý do di chuyển</label>
                  <textarea
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="Nhập lý do di chuyển thành viên này..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>

                {execError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {execError}
                  </div>
                )}

                <button
                  onClick={handleExecute}
                  disabled={executing || !reason.trim()}
                  className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium text-sm disabled:opacity-50"
                >
                  {executing ? 'Đang thực hiện...' : 'Xác nhận di chuyển'}
                </button>
              </div>

              {execResult && (
                <div className={`p-4 rounded-lg border text-sm ${execResult.success ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                  <p className="font-semibold">{execResult.success ? 'Di chuyển thành công!' : 'Di chuyển thất bại'}</p>
                  <ul className="mt-2 space-y-1">
                    <li>Batch: {execResult.batchesProcessed}</li>
                    <li>Tổng nodes: {execResult.totalNodes}</li>
                    <li>Đảo hoa hồng cũ: {execResult.details.oldChainReversed}</li>
                    <li>Credit hoa hồng mới: {execResult.details.newChainCredited}</li>
                    <li>Level checked: {execResult.details.levelsChecked}</li>
                    <li>Level changed: {execResult.details.levelsChanged}</li>
                    {execResult.logId && <li>Audit log ID: #{execResult.logId}</li>}
                  </ul>
                  {execResult.warnings.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer font-medium text-amber-700">Cảnh báo ({execResult.warnings.length})</summary>
                      <ul className="mt-1 list-disc pl-4 text-amber-600">
                        {execResult.warnings.map((w, i) => <li key={i}>{w}</li>)}
                      </ul>
                    </details>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
