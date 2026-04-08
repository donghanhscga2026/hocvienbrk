'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

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
            <Link href={`/admin/campaigns/${campaign.id}`}>
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

  useEffect(() => {
    fetch('/api/admin/senders/list')
      .then(res => res.ok ? res.json() : [])
      .then(data => { setSenders(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

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
      if (res.ok) setSenders(prev => prev.filter(s => s.id !== id))
    } catch (error) { console.error(error) }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Đang tải...</div>
  }

  return (
    <div className="space-y-4">
      <Link href="/api/admin/auth/google">
        <Button className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3 rounded-xl">
          + Kết Nối Tài Khoản
        </Button>
      </Link>

      <Button 
        onClick={validateAllTokens}
        disabled={validating || senders.length === 0}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl"
      >
        {validating ? <><Loader2 className="w-5 h-5 animate-spin mr-2" />Đang kiểm tra...</> : 'Kiểm tra Token'}
      </Button>

      {validationSummary && (
        <div className={`p-4 rounded-xl ${validationSummary.invalid === 0 ? 'bg-green-50' : 'bg-yellow-50'}`}>
          <span className="font-bold">{validationSummary.valid}/{validationSummary.total} hợp lệ</span>
        </div>
      )}

      {senders.length === 0 ? (
        <div className="text-center py-8 text-gray-400">Chưa có tài khoản nào</div>
      ) : (
        senders.map((sender) => {
          const status = validationResults[sender.id]
          return (
            <div key={sender.id} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex justify-between">
                <div>
                  <h3 className="font-bold">{sender.label}</h3>
                  <p className="text-sm text-gray-400">{sender.email}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${sender.isActive ? 'bg-green-100' : 'bg-red-100'}`}>
                  {sender.isActive ? 'Active' : 'Tạm ngưng'}
                </span>
              </div>
              <Button onClick={() => removeSender(sender.id)} className="w-full mt-3 bg-red-50 text-red-600 text-sm">
                Gỡ bỏ
              </Button>
            </div>
          )
        })
      )}
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

export default function ClientContent({ initialCampaigns }: { initialCampaigns: Campaign[] }) {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'senders' | 'settings'>('campaigns')

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 mb-6 flex">
        <button onClick={() => setActiveTab('campaigns')} className={`flex-1 py-3 rounded-xl font-bold text-xs ${activeTab === 'campaigns' ? 'bg-orange-500 text-white' : 'text-gray-500'}`}>📋 Chiến dịch</button>
        <button onClick={() => setActiveTab('senders')} className={`flex-1 py-3 rounded-xl font-bold text-xs ${activeTab === 'senders' ? 'bg-orange-500 text-white' : 'text-gray-500'}`}>📡 Tài Khoản</button>
        <button onClick={() => setActiveTab('settings')} className={`flex-1 py-3 rounded-xl font-bold text-xs ${activeTab === 'settings' ? 'bg-orange-500 text-white' : 'text-gray-500'}`}>⚙️ Cấu Hình</button>
      </div>

      {activeTab === 'campaigns' && <CampaignsList initialCampaigns={initialCampaigns} />}
      {activeTab === 'senders' && <SendersTab />}
      {activeTab === 'settings' && <SettingsTab />}
    </>
  )
}