'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, CheckCircle2, AlertCircle, Play, Trash2, RefreshCw } from 'lucide-react'
import MainHeader from '@/components/layout/MainHeader'
import { Button } from '@/components/ui/button'

const STATUS_MAP: Record<string, string> = {
  DRAFT: 'Nháp',
  ACTIVE: 'Hoạt động',
  RUNNING: 'Đang gửi',
  COMPLETED: 'Hoàn thành',
  FAILED: 'Thất bại',
}

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-500',
  ACTIVE: 'bg-green-100 text-green-700',
  RUNNING: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
}

interface CampaignDetail {
  id: number
  title: string
  status: string
  notificationType: string
  recipientSource: string
  recipientFilter: any
  subject: string
  htmlContent: string
  totalRecipients: number
  sentCount: number
  failedCount: number
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  creator: { name: string } | null
  senders: { sender: { email: string; label: string } }[]
}

interface LogSummary {
  total: number
  sent: number
  bounced: number
  failed: number
  skipped: number
}

interface SenderStat {
  id: number
  email: string
  label: string
  total: number
  sent: number
  bounced: number
  failed: number
}

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [sendProgress, setSendProgress] = useState('')
  const [logSummary, setLogSummary] = useState<LogSummary | null>(null)
  const [senderStats, setSenderStats] = useState<SenderStat[]>([])

  const fetchCampaign = async () => {
    try {
      const res = await fetch(`/api/admin/campaigns/${id}`)
      if (!res.ok) {
        setError('Không tìm thấy chiến dịch')
        return
      }
      const data = await res.json()
      setCampaign(data)
    } catch {
      setError('Lỗi tải dữ liệu')
    } finally {
      setLoading(false)
    }
  }

  const fetchLogs = async () => {
    try {
      const res = await fetch(`/api/admin/campaigns/${id}/logs`)
      if (res.ok) {
        const data = await res.json()
        setLogSummary(data.summary)
        setSenderStats(data.senderStats || [])
      }
    } catch {}
  }

  const fetchProgress = async () => {
    try {
      const res = await fetch(`/api/admin/campaigns/${id}/progress`)
      if (res.ok) {
        const data = await res.json()
        setCampaign(prev => prev ? { ...prev, ...data } : prev)
      }
    } catch {}
  }

  useEffect(() => {
    fetchCampaign()
    fetchLogs()
  }, [id])

  useEffect(() => {
    if (!campaign) return
    const shouldPoll = campaign.status === 'RUNNING' || sending
    if (!shouldPoll) return
    const interval = setInterval(() => {
      fetchProgress()
      fetchLogs()
    }, 5000)
    return () => clearInterval(interval)
  }, [campaign?.status, sending])

  const handleSendBatch = async () => {
    if (!confirm('Bắt đầu gửi chiến dịch này?')) return
    setSending(true)
    setSendProgress('Đang khởi tạo...')

    let offset = 0
    const batchSize = 20
    let finished = false

    try {
      await fetch(`/api/admin/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'RUNNING' }),
      })

      while (!finished) {
        setSendProgress(`Đang gửi... (${offset} / ${campaign?.totalRecipients || 0})`)
        const res = await fetch(`/api/admin/campaigns/${id}/send-batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ offset, batchSize }),
        })

        if (!res.ok) {
          const err = await res.text()
          setSendProgress(`Lỗi: ${err}`)
          break
        }

        const data = await res.json()

        if (data.needsCooldown) {
          const pauseMin = data.pauseMinutes || 7
          offset += data.sentInBatch || 0
          setSendProgress(`⏸️ Pause ${pauseMin} phút (đã gửi ${offset})`)
          await new Promise(r => setTimeout(r, pauseMin * 60 * 1000))
          setSendProgress(`▶️ Tiếp tục gửi...`)
          continue
        }

        finished = data.finished
        offset = data.nextOffset || offset + batchSize

        fetchProgress()
        fetchLogs()
        await new Promise(r => setTimeout(r, 2000))
      }

      setSendProgress(finished ? 'Hoàn tất!' : 'Đã dừng')
      await fetchCampaign()
      await fetchLogs()
    } catch (err: any) {
      setSendProgress(`Lỗi: ${err.message}`)
    }
    setSending(false)
  }

  const handleRestart = async () => {
    if (!confirm('Xóa log cũ và gửi lại toàn bộ?')) return
    try {
      const res = await fetch(`/api/admin/campaigns/${id}/restart`, { method: 'POST' })
      if (res.ok) {
        await fetchCampaign()
        await fetchLogs()
      }
    } catch {}
  }

  const handleDelete = async () => {
    if (!confirm('Xóa chiến dịch này?')) return
    try {
      const res = await fetch(`/api/admin/campaigns/${id}`, { method: 'DELETE' })
      if (res.ok) router.push('/tools/email-mkt')
    } catch {}
  }

  const handleUpdateStatus = async (status: string) => {
    try {
      await fetch(`/api/admin/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      await fetchCampaign()
    } catch {}
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    )
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MainHeader title="CHIẾN DỊCH" toolSlug="email-mkt" />
        <div className="max-w-lg mx-auto p-4 text-center py-12 text-gray-400 font-medium">{error || 'Không tìm thấy'}</div>
      </div>
    )
  }

  const progressPercent = campaign.totalRecipients > 0
    ? Math.round((campaign.sentCount / campaign.totalRecipients) * 100)
    : 0

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <MainHeader title={campaign.title} toolSlug="email-mkt" />
      <div className="max-w-lg mx-auto p-4 space-y-4">
        <Link href="/tools/email-mkt" className="inline-flex items-center gap-2 text-xs font-black text-gray-400 uppercase hover:text-orange-500 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
        </Link>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="font-black text-gray-900 text-lg">{campaign.title}</h1>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(campaign.createdAt).toLocaleDateString('vi-VN')} • {campaign.notificationType}
              </p>
            </div>
            <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${STATUS_COLOR[campaign.status] || 'bg-gray-100 text-gray-500'}`}>
              {STATUS_MAP[campaign.status] || campaign.status}
            </span>
          </div>

          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Tiến độ</span>
              <span>{campaign.sentCount}/{campaign.totalRecipients} ({progressPercent}%)</span>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-green-50 rounded-xl p-3">
              <div className="text-lg font-black text-green-600">{campaign.sentCount}</div>
              <div className="text-[10px] font-bold text-green-500 uppercase">Đã gửi</div>
            </div>
            <div className="bg-red-50 rounded-xl p-3">
              <div className="text-lg font-black text-red-600">{campaign.failedCount}</div>
              <div className="text-[10px] font-bold text-red-500 uppercase">Thất bại</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-lg font-black text-gray-600">{campaign.totalRecipients}</div>
              <div className="text-[10px] font-bold text-gray-400 uppercase">Tổng</div>
            </div>
          </div>

          {logSummary && (
            <div className="bg-gray-50 rounded-xl p-3 space-y-1">
              <p className="text-[10px] font-black uppercase text-gray-400">Thống kê gửi</p>
              <div className="flex gap-4 text-xs font-bold">
                <span className="text-blue-600">✓ {logSummary.sent} sent</span>
                <span className="text-yellow-600">↻ {logSummary.bounced} bounced</span>
                <span className="text-red-600">✗ {logSummary.failed} failed</span>
                <span className="text-gray-400">– {logSummary.skipped} skipped</span>
              </div>
            </div>
          )}

          {senderStats.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-3 space-y-2">
              <p className="text-[10px] font-black uppercase text-gray-400">Theo sender</p>
              {senderStats.map(s => (
                <div key={s.id} className="flex justify-between text-xs">
                  <span className="font-bold text-gray-600">{s.label}</span>
                  <span className="text-gray-500">{s.sent}/{s.total}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
          <h2 className="font-black text-gray-900 uppercase tracking-tight text-sm">Thao tác</h2>

          {sendProgress && (
            <div className="bg-blue-50 rounded-xl p-3 flex items-center gap-2 text-xs font-bold text-blue-700">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              {sendProgress}
            </div>
          )}

          {campaign.status === 'DRAFT' && (
            <>
              <Button onClick={handleSendBatch} disabled={sending || !campaign.totalRecipients}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                <Play className="w-4 h-4" /> Bắt đầu gửi
              </Button>
              <Link href={`/tools/email-mkt/new?id=${campaign.id}`}>
                <Button className="w-full bg-gray-100 text-gray-700 font-bold py-3 rounded-xl">
                  Chỉnh sửa
                </Button>
              </Link>
            </>
          )}

          {campaign.status === 'RUNNING' && (
            <Button onClick={() => handleUpdateStatus('DRAFT')} disabled={sending}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 rounded-xl">
              Tạm dừng
            </Button>
          )}

          {(campaign.status === 'COMPLETED' || campaign.status === 'FAILED') && (
            <Button onClick={handleRestart}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4" /> Gửi lại
            </Button>
          )}

          <Button onClick={handleDelete}
            className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold py-3 rounded-xl flex items-center justify-center gap-2">
            <Trash2 className="w-4 h-4" /> Xóa chiến dịch
          </Button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
          <h2 className="font-black text-gray-900 uppercase tracking-tight text-sm">Nội dung email</h2>
          <div>
            <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Tiêu đề</p>
            <p className="text-sm font-bold text-gray-900">{campaign.subject}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Nội dung</p>
            <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 max-h-60 overflow-y-auto font-mono whitespace-pre-wrap break-all">
              {campaign.htmlContent}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Nguồn người nhận</p>
            <p className="text-sm font-bold text-gray-900">{campaign.recipientSource}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
