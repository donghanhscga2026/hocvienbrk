'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, CheckCircle2, AlertCircle, Play, Trash2, RefreshCw, XCircle, Ban, Search } from 'lucide-react'
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
  const [issueLogs, setIssueLogs] = useState<any[]>([])
  const [bounceScanning, setBounceScanning] = useState(false)
  const [bounceResult, setBounceResult] = useState<string | null>(null)

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
        setIssueLogs(data.issueLogs || [])
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
    const isResume = (campaign?.sentCount || 0) > 0
    if (!confirm(isResume ? 'Tiếp tục gửi những email còn lại?' : 'Bắt đầu gửi chiến dịch này?')) return
    setSending(true)
    setSendProgress('Đang khởi tạo...')

    const batchSize = 20
    let finished = false

    try {
      await fetch(`/api/admin/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'RUNNING' }),
      })

      while (!finished) {
        const res = await fetch(`/api/admin/campaigns/${id}/send-batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batchSize }),
        })

        if (!res.ok) {
          let errData: any
          try { errData = await res.json() } catch { errData = {} }
          if (errData.needsCooldown) {
            const pauseMin = errData.pauseMinutes || 7
            setSendProgress(`⏸️ Pause ${pauseMin} phút (chờ sender hết cooldown)`)
            await new Promise(r => setTimeout(r, pauseMin * 60 * 1000))
            continue
          }
          setSendProgress(`Lỗi: ${errData.error || 'Lỗi không xác định'}`)
          break
        }

        const data = await res.json()

        if (data.needsCooldown) {
          const pauseMin = data.pauseMinutes || 7
          setSendProgress(`⏸️ Pause ${pauseMin} phút (đã gửi ${data.stats?.totalSent || 0})`)
          await new Promise(r => setTimeout(r, pauseMin * 60 * 1000))
          setSendProgress(`▶️ Tiếp tục gửi...`)
          continue
        }

        finished = data.finished
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

  const handleBounceScan = async () => {
    setBounceScanning(true)
    setBounceResult(null)
    try {
      const res = await fetch('/api/admin/campaigns/bounce-scan', { method: 'POST' })
      const data = await res.json()
      const total = (data.hardBounced || 0) + (data.softBounced || 0)
      setBounceResult(`🔴 ${data.hardBounced || 0} hard bounce, 🟡 ${data.softBounced || 0} soft bounce${data.fakeEmails ? `, 🚫 ${data.fakeEmails} email ảo` : ''}`)
      if (total > 0) {
        await fetchLogs()
        await fetchCampaign()
      }
    } catch {
      setBounceResult('Lỗi khi quét bounce')
    }
    setBounceScanning(false)
  }

  const handleRemoveFromBlacklist = async (email: string) => {
    try {
      const res = await fetch(`/api/admin/blacklist/${encodeURIComponent(email)}`, { method: 'DELETE' })
      if (res.ok) {
        setIssueLogs(prev => prev.filter(l => l.toEmail !== email))
      }
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
              <Button onClick={handleSendBatch} disabled={sending}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                <Play className="w-4 h-4" /> {(campaign.sentCount || 0) > 0 ? 'Tiếp tục gửi' : 'Bắt đầu gửi'}
              </Button>
              {(campaign.sentCount || 0) === 0 && (
                <Link href={`/tools/email-mkt/new?id=${campaign.id}`}>
                  <Button className="w-full bg-gray-100 text-gray-700 font-bold py-3 rounded-xl">
                    Chỉnh sửa
                  </Button>
                </Link>
              )}
            </>
          )}

          {campaign.status === 'RUNNING' && (
            <>
              <Button onClick={handleSendBatch} disabled={sending}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                <Play className="w-4 h-4" /> Gửi tiếp
              </Button>
              <Button onClick={() => handleUpdateStatus('DRAFT')} disabled={sending}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 rounded-xl">
                Tạm dừng
              </Button>
            </>
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

          {campaign.sentCount > 0 && (
            <Button onClick={handleBounceScan} disabled={bounceScanning}
              className="w-full bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2">
              {bounceScanning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )} Quét bounce
            </Button>
          )}

          {bounceResult && (
            <div className="bg-purple-50 rounded-xl p-3 text-xs font-bold text-purple-700">
              {bounceResult}
            </div>
          )}
        </div>

        {issueLogs.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
            <h2 className="font-black text-gray-900 uppercase tracking-tight text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              Email lỗi, bounce & bỏ qua ({issueLogs.length})
            </h2>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {issueLogs.map(log => (
                <div key={log.id} className="flex items-start justify-between gap-2 bg-gray-50 rounded-xl p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-gray-900 truncate">{log.toEmail}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5 space-x-2">
                      {log.userId ? (
                        <span className="font-bold text-orange-600">#{log.userId} — {log.userName || 'Không tên'}</span>
                      ) : (
                        <span className="text-gray-400">(không có trong hệ thống)</span>
                      )}
                      <span className="text-gray-400">
                        {log.senderEmail ? `qua ${log.senderLabel || log.senderEmail}` : '(không dùng sender)'}
                      </span>
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                        log.status === 'FAILED' ? 'bg-red-100 text-red-600'
                        : log.status === 'BOUNCED' ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-200 text-gray-500'
                      }`}>
                        {log.status === 'FAILED' ? 'Lỗi' : log.status === 'BOUNCED' ? 'Bounce' : 'Bỏ qua'}
                      </span>
                      {log.errorType && (
                        <span className="text-[10px] text-gray-400">{log.errorType}</span>
                      )}
                      {log.errorCode && (
                        <span className="text-[10px] text-gray-400 truncate">{log.errorCode}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-300 mt-0.5">
                      {new Date(log.sentAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                  {log.errorType === 'BLACKLISTED' && (
                    <button
                      onClick={() => handleRemoveFromBlacklist(log.toEmail)}
                      className="shrink-0 text-[10px] font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-lg transition-colors"
                    >
                      Bỏ chặn
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

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
