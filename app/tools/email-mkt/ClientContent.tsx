'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

interface Campaign {
  id: number
  title: string
  status: string
  totalRecipients: number
  sentCount: number
  failedCount: number
  createdAt: Date
  notificationType: string
}

interface SenderValidation {
  id: number
  email: string
  label: string
  isValid: boolean
  error?: string
}

interface EmailConfig {
  emailsBeforePauseMin: number
  emailsBeforePauseMax: number
  pauseDurationMin: number
  pauseDurationMax: number
  interEmailDelayMin: number
  interEmailDelayMax: number
  enableTelegramAlert: boolean
  telegramChatId: string
  enableRandomMessageFooter: boolean
}

function CampaignsList({ initialCampaigns }: { initialCampaigns: Campaign[] }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-700'
      case 'RUNNING': return 'bg-blue-100 text-blue-700'
      case 'ACTIVE': return 'bg-green-100 text-green-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  if (initialCampaigns.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 font-medium">
        Chưa có chiến dịch nào
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {initialCampaigns.map((campaign) => (
        <div key={campaign.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1">
              <h3 className="font-bold text-gray-900">{campaign.title}</h3>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(campaign.createdAt).toLocaleDateString('vi-VN')} • {campaign.totalRecipients} người nhận
              </p>
            </div>
            <span className={`px-2 py-1 rounded-lg text-xs font-bold ${getStatusColor(campaign.status)}`}>
              {campaign.status === 'COMPLETED' ? 'Hoàn thành' : 
               campaign.status === 'RUNNING' ? 'Đang gửi' :
               campaign.status === 'ACTIVE' ? 'Hoạt động' : 'Nháp'}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-green-600">✓ Đã gửi: {campaign.sentCount}</span>
            {campaign.failedCount > 0 && (
              <span className="text-red-500">✗ Thất bại: {campaign.failedCount}</span>
            )}
          </div>
          <div className="flex gap-2 mt-3">
            <Link href={`/tools/email-mkt/${campaign.id}`}>
              <Button className="bg-gray-100 text-gray-700 font-bold text-xs py-1.5 px-3 rounded-lg">
                Xem chi tiết
              </Button>
            </Link>
          </div>
        </div>
      ))}
    </div>
  )
}

function SendersTab() {
  const [senders, setSenders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [validating, setValidating] = useState(false)
  const [validationResults, setValidationResults] = useState<Record<number, SenderValidation>>({})
  const [validationSummary, setValidationSummary] = useState<{total: number; valid: number; invalid: number} | null>(null)
  const [showBrevoForm, setShowBrevoForm] = useState(false)
  const [brevoLabel, setBrevoLabel] = useState('')
  const [brevoApiKey, setBrevoApiKey] = useState('')
  const [brevoAdding, setBrevoAdding] = useState(false)
  const [brevoError, setBrevoError] = useState('')

  useEffect(() => {
    fetch('/api/admin/senders/list')
      .then(res => res.ok ? res.json() : [])
      .then(data => { setSenders(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const addBrevoSender = async () => {
    if (!brevoLabel.trim() || !brevoApiKey.trim()) return
    setBrevoAdding(true)
    setBrevoError('')
    try {
      const res = await fetch('/api/admin/senders/brevo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: brevoLabel.trim(), apiKey: brevoApiKey.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setSenders(prev => [data.sender, ...prev])
        setShowBrevoForm(false)
        setBrevoLabel('')
        setBrevoApiKey('')
      } else {
        setBrevoError(data.error || 'Lỗi không xác định')
      }
    } catch {
      setBrevoError('Không thể kết nối server')
    } finally {
      setBrevoAdding(false)
    }
  }

  const validateAllTokens = async () => {
    setValidating(true)
    try {
      const res = await fetch('/api/admin/senders/validate')
      if (res.ok) {
        const data = await res.json()
        const resultsMap: Record<number, SenderValidation> = {}
        data.results.forEach((r: SenderValidation) => { resultsMap[r.id] = r })
        setValidationResults(resultsMap)
        setValidationSummary(data.summary)
      }
    } catch (error) { console.error(error) }
    finally { setValidating(false) }
  }

  const removeSender = async (id: number) => {
    if (!confirm('Bạn có chắc muốn gỡ tài khoản này?')) return
    try {
      const res = await fetch(`/api/admin/senders/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setSenders(prev => prev.filter(s => s.id !== id))
        setValidationResults(prev => { const n = {...prev}; delete n[id]; return n })
      }
    } catch (error) { console.error(error) }
  }

  const sortedSenders = [...senders].sort((a, b) => {
    const sa = validationResults[a.id]
    const sb = validationResults[b.id]
    if (sa && !sb) return -1
    if (!sa && sb) return 1
    if (sa && sb) return Number(sa.isValid) - Number(sb.isValid)
    return 0
  })

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Đang tải...</div>
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowBrevoForm(!showBrevoForm)}
        className="block w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-xl text-center"
      >
        {showBrevoForm ? '✕ Đóng' : '➕ Thêm Brevo Sender'}
      </button>

      {showBrevoForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <h3 className="font-bold text-blue-900">Thêm Brevo Sender</h3>
          <input
            type="text"
            placeholder="Tên hiển thị (VD: Brevo #1)"
            value={brevoLabel}
            onChange={e => setBrevoLabel(e.target.value)}
            className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
          />
          <input
            type="password"
            placeholder="API Key (xkeysib-...)"
            value={brevoApiKey}
            onChange={e => setBrevoApiKey(e.target.value)}
            className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
          />
          <Button
            onClick={addBrevoSender}
            disabled={brevoAdding || !brevoLabel.trim() || !brevoApiKey.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2"
          >
            {brevoAdding ? <><Loader2 className="w-4 h-4 animate-spin" />Đang xác thực...</> : 'Xác thực & Thêm'}
          </Button>
          {brevoError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-2.5 rounded-lg">
              {brevoError}
            </div>
          )}
          <div className="text-xs text-blue-600/80 bg-blue-100/50 p-3 rounded-lg">
            💡 API Key lấy từ Brevo Dashboard → Settings → API Keys.
            Tài khoản Brevo free được 300 email/ngày.
          </div>
        </div>
      )}

      <a href="/api/admin/auth/google"
        className="block w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3 rounded-xl text-center">
        + Kết Nối Google Gmail
      </a>

      <Button 
        onClick={validateAllTokens}
        disabled={validating || senders.length === 0}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
      >
        {validating ? <><Loader2 className="w-5 h-5 animate-spin" />Đang kiểm tra...</> : 'Kiểm tra Token'}
      </Button>

      {validationSummary && (
        <div className={`p-4 rounded-xl border ${
          validationSummary.invalid === 0 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <h3 className={`font-bold ${validationSummary.invalid === 0 ? 'text-green-700' : 'text-yellow-700'}`}>
              Kết quả kiểm tra
            </h3>
            <span className={`text-2xl font-black ${validationSummary.invalid === 0 ? 'text-green-600' : 'text-yellow-600'}`}>
              {validationSummary.valid}/{validationSummary.total}
            </span>
          </div>
          <div className="flex gap-4 text-sm">
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle className="w-4 h-4" /> {validationSummary.valid} hợp lệ
            </span>
            {validationSummary.invalid > 0 && (
              <span className="flex items-center gap-1 text-red-600">
                <XCircle className="w-4 h-4" /> {validationSummary.invalid} không hợp lệ
              </span>
            )}
          </div>
        </div>
      )}

      {senders.length === 0 ? (
        <div className="text-center py-8 text-gray-400">Chưa có tài khoản nào</div>
      ) : (
        sortedSenders.map((sender) => {
          const status = validationResults[sender.id]
          const borderColor = status
            ? status.isValid ? 'border-green-300 bg-green-50/30' : 'border-red-300 bg-red-50/30'
            : 'border-gray-100'
          return (
            <div key={sender.id} className={`bg-white rounded-xl border-2 p-4 shadow-sm ${borderColor}`}>
              {status && (
                <div className={`mb-3 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 ${
                  status.isValid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {status.isValid ? <CheckCircle className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                  {status.isValid ? 'Token hợp lệ' : `Token không hợp lệ: ${status.error}`}
                </div>
              )}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-gray-900">{sender.label}</h3>
                  <p className="text-sm text-gray-400">{sender.email}</p>
                  <div className="flex gap-1.5 mt-1 flex-wrap">
                    {sender.isMain && (
                      <span className="inline-block bg-black text-yellow-400 text-xs font-bold px-2 py-0.5 rounded">Main</span>
                    )}
                    {sender.provider === 'brevo' && (
                      <span className="inline-block bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded">Brevo</span>
                    )}
                    {(!sender.provider || sender.provider === 'gmail') && (
                      <span className="inline-block bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded">Gmail</span>
                    )}
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                  sender.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {sender.isActive ? 'Active' : 'Tạm ngưng'}
                </span>
              </div>
              <div className="mt-3 mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Quota hôm nay</span>
                  <span>{sender.sentToday}/{sender.dailyLimit}</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full" style={{ width: `${(sender.sentToday / sender.dailyLimit) * 100}%` }} />
                </div>
              </div>
              <Button onClick={() => removeSender(sender.id)} className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold text-sm py-2 rounded-lg">
                Gỡ bỏ
              </Button>
            </div>
          )
        })
      )}

      <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl">
        <h3 className="text-blue-900 font-bold text-sm mb-2">💡 Hướng dẫn</h3>
        <ul className="text-blue-700/80 text-xs space-y-1 list-disc list-inside">
          <li>Thêm email vào "Test Users" trong Google Cloud</li>
          <li>Tối đa 480 email/ngày</li>
        </ul>
      </div>
    </div>
  )
}

function SettingsTab() {
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [toast, setToast] = useState<{ type: string, text: string } | null>(null)
  const [config, setConfig] = useState<EmailConfig>({
    emailsBeforePauseMin: 30, emailsBeforePauseMax: 50,
    pauseDurationMin: 10, pauseDurationMax: 30,
    interEmailDelayMin: 2, interEmailDelayMax: 8,
    enableTelegramAlert: true, telegramChatId: '-1003871041367', enableRandomMessageFooter: false
  })

  useEffect(() => {
    fetch('/api/admin/email-config')
      .then(res => res.ok ? res.json() : { config: {} })
      .then(data => { 
        if (data.config) setConfig(prev => ({ ...prev, ...data.config })) 
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/admin/email-config', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config)
      })
      setToast({ type: res.ok ? 'success' : 'error', text: res.ok ? 'Đã lưu!' : 'Lỗi' })
    } catch { setToast({ type: 'error', text: 'Lỗi' }) }
    finally { setIsSaving(false) }
  }

  if (isLoading) {
    return <div className="text-center py-12 text-gray-400">Đang tải...</div>
  }

  return (
    <div className="space-y-4">
      <Button onClick={handleSave} disabled={isSaving} className="w-full bg-yellow-400 font-bold py-3 rounded-xl">
        {isSaving ? '...' : '💾 Lưu Cài Đặt'}
      </Button>
      {toast && <div className={`p-4 rounded-xl ${toast.type === 'success' ? 'bg-green-50' : 'bg-red-50'}`}>{toast.text}</div>}
      
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <h3 className="font-bold mb-4">📤 Batch & Pause</h3>
        <div className="space-y-3">
          <div>
            <label className="text-sm">Pause sau (emails)</label>
            <div className="flex gap-2">
              <input type="number" value={config.emailsBeforePauseMin} onChange={e => setConfig({...config, emailsBeforePauseMin: +e.target.value})} className="flex-1 border rounded-lg p-2" />
              <input type="number" value={config.emailsBeforePauseMax} onChange={e => setConfig({...config, emailsBeforePauseMax: +e.target.value})} className="flex-1 border rounded-lg p-2" />
            </div>
          </div>
          <div>
            <label className="text-sm">Thời gian pause (phút)</label>
            <div className="flex gap-2">
              <input type="number" value={config.pauseDurationMin} onChange={e => setConfig({...config, pauseDurationMin: +e.target.value})} className="flex-1 border rounded-lg p-2" />
              <input type="number" value={config.pauseDurationMax} onChange={e => setConfig({...config, pauseDurationMax: +e.target.value})} className="flex-1 border rounded-lg p-2" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <h3 className="font-bold mb-4">⏱️ Delay</h3>
        <div className="flex gap-2">
          <input type="number" value={config.interEmailDelayMin} onChange={e => setConfig({...config, interEmailDelayMin: +e.target.value})} className="flex-1 border rounded-lg p-2" />
          <span>-</span>
          <input type="number" value={config.interEmailDelayMax} onChange={e => setConfig({...config, interEmailDelayMax: +e.target.value})} className="flex-1 border rounded-lg p-2" />
          <span className="text-sm">giây</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold">✉️ Footer Ngẫu Nhiên</h3>
            <p className="text-xs text-gray-500">Thêm message ngẫu nhiên vào cuối email</p>
          </div>
          <button onClick={() => setConfig({...config, enableRandomMessageFooter: !config.enableRandomMessageFooter})} className={`w-12 h-7 rounded-full ${config.enableRandomMessageFooter ? 'bg-green-500' : 'bg-gray-300'}`}>
            <div className={`w-5 h-5 bg-white rounded-full transition ${config.enableRandomMessageFooter ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>
    </div>
  )
}

function SenderPerformanceTab() {
  const [senders, setSenders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/senders/stats')
      .then(res => res.ok ? res.json() : { senders: [] })
      .then(data => { setSenders(data.senders || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Đang tải...</div>
  }

  return (
    <div className="space-y-4">
      {senders.length === 0 ? (
        <div className="text-center py-8 text-gray-400">Chưa có dữ liệu</div>
      ) : (
        senders.map((s: any) => {
          const total = s.totalSent + s.totalFailed
          const deliverabilityNum = total > 0 ? ((total - s.totalBounced) / total * 100) : 0
          const bounceRate = total > 0 ? (s.totalBounced / total * 100) : 0
          const statusColor = deliverabilityNum >= 98 ? 'text-green-600' : deliverabilityNum >= 90 ? 'text-yellow-600' : 'text-red-600'
          const barColor = deliverabilityNum >= 98 ? 'bg-green-500' : deliverabilityNum >= 90 ? 'bg-yellow-500' : 'bg-red-500'

          return (
            <div key={s.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-gray-900">{s.label}</h3>
                  <p className="text-sm text-gray-400">{s.email}</p>
                  {s.provider && (
                    <span className={`mt-1 inline-block text-xs font-bold px-2 py-0.5 rounded ${s.provider === 'brevo' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                      {s.provider === 'brevo' ? 'Brevo' : 'Gmail'}
                    </span>
                  )}
                </div>
                <span className={`text-2xl font-black ${statusColor}`}>{s.deliverability}%</span>
              </div>

              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden mb-3">
                <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${Math.min(deliverabilityNum, 100)}%` }} />
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-lg font-bold text-gray-900">{s.totalSent}</div>
                  <div className="text-xs text-gray-500">Đã gửi</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-lg font-bold text-red-600">{s.totalBounced}</div>
                  <div className="text-xs text-gray-500">Bounce</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-lg font-bold text-yellow-600">{s.totalFailed}</div>
                  <div className="text-xs text-gray-500">Lỗi</div>
                </div>
              </div>

              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Quota (hệ thống): {s.sentToday}/{s.effectiveLimit}</span>
                  <span>Bounce: {bounceRate.toFixed(1)}%</span>
                </div>
                {s.provider === 'brevo' && s.realSentToday != null && (
                  <div className="flex justify-between text-xs">
                    <span className="text-blue-600">Quota (Brevo thực tế):</span>
                    <span className={`font-bold ${s.realRemaining !== null && s.realRemaining < 50 ? 'text-red-600' : 'text-blue-600'}`}>
                      {s.realSentToday}/{s.realSentToday + (s.realRemaining ?? 0)}
                      {s.realRemaining !== null && s.realRemaining < 50 && (
                        <span className="ml-1">⚠️</span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

export default function ClientContent({ initialCampaigns, isTeacher }: { initialCampaigns: Campaign[]; isTeacher?: boolean }) {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const initialTab = tabParam === 'senders' ? 'senders' : tabParam === 'settings' ? 'settings' : tabParam === 'performance' ? 'performance' : 'campaigns'
  const [activeTab, setActiveTab] = useState<'campaigns' | 'senders' | 'settings' | 'performance'>(initialTab)

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 mb-6 flex">
        <button onClick={() => setActiveTab('campaigns')} className={`flex-1 py-3 rounded-xl font-bold text-xs ${activeTab === 'campaigns' ? 'bg-orange-500 text-white' : 'text-gray-500'}`}>📋 Chiến dịch</button>
        {!isTeacher && (
          <>
            <button onClick={() => setActiveTab('senders')} className={`flex-1 py-3 rounded-xl font-bold text-xs ${activeTab === 'senders' ? 'bg-orange-500 text-white' : 'text-gray-500'}`}>📡 Tài Khoản</button>
            <button onClick={() => setActiveTab('settings')} className={`flex-1 py-3 rounded-xl font-bold text-xs ${activeTab === 'settings' ? 'bg-orange-500 text-white' : 'text-gray-500'}`}>⚙️ Cấu Hình</button>
            <button onClick={() => setActiveTab('performance')} className={`flex-1 py-3 rounded-xl font-bold text-xs ${activeTab === 'performance' ? 'bg-orange-500 text-white' : 'text-gray-500'}`}>📊 Hiệu suất</button>
          </>
        )}
      </div>

      {activeTab === 'campaigns' && <CampaignsList initialCampaigns={initialCampaigns} />}
      {!isTeacher && activeTab === 'senders' && <SendersTab />}
      {!isTeacher && activeTab === 'settings' && <SettingsTab />}
      {!isTeacher && activeTab === 'performance' && <SenderPerformanceTab />}
    </>
  )
}