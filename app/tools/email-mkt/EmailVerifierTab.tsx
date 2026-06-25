'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { 
  Mail, CheckCircle, XCircle, AlertCircle, Play, Pause, RefreshCw, 
  Download, ArrowLeft, Users, Loader2, Search, Filter, ShieldCheck, MailWarning
} from 'lucide-react'

interface UserItem {
  id: number
  name: string | null
  email: string
  emailVerified: string | null
}

interface Stats {
  total: number
  verified: number
  unverified: number
}

interface VerifyResult {
  userId: number | null
  name: string
  email: string
  status: string
  errorCode?: string | null
  errorType?: string | null
}

export default function EmailVerifierTab() {
  const router = useRouter()
  const { data: session, status } = useSession()

  // Steps state: 'step1' | 'step2' | 'step3'
  const [step, setStep] = useState<'step1' | 'step2' | 'step3'>('step1')

  // Step 1 states
  const [users, setUsers] = useState<UserItem[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, verified: 0, unverified: 0 })
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'ALL' | 'VERIFIED' | 'UNVERIFIED'>('ALL')
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set())

  // Step 2 states
  const [campaignId, setCampaignId] = useState<number | null>(null)
  const [campaignTitle, setCampaignTitle] = useState('')
  const [sending, setSending] = useState(false)
  const [sendPaused, setSendPaused] = useState(false)
  const [sendProgress, setSendProgress] = useState({ total: 0, sent: 0, success: 0, failed: 0 })
  const [sendLogs, setSendLogs] = useState<{ email: string; status: 'SUCCESS' | 'FAILED'; msg?: string }[]>([])
  const [errorMsg, setErrorMsg] = useState('')
  const [isScanningBounces, setIsScanningBounces] = useState(false)
  
  // Refs to control paused states inside loops
  const isPausedRef = useRef(false)
  const isSendingRef = useRef(false)

  // Step 3 states
  const [analyzing, setAnalyzing] = useState(false)
  const [activeList, setActiveList] = useState<VerifyResult[]>([])
  const [bouncedList, setBouncedList] = useState<VerifyResult[]>([])
  const [failedList, setFailedList] = useState<VerifyResult[]>([])
  const [analyzeStats, setAnalyzeStats] = useState({ total: 0, sent: 0, active: 0, bounced: 0, failed: 0, skipped: 0 })

  // Check Auth
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // Fetch users list on mount
  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      fetchUsers()
    }
  }, [session])

  const fetchUsers = async () => {
    setLoadingUsers(true)
    try {
      const res = await fetch('/api/admin/email-verifier/users')
      const data = await res.json()
      if (data.success) {
        setUsers(data.users)
        setStats(data.stats)
        // Select all by default
        setSelectedUserIds(new Set(data.users.map((u: UserItem) => u.id)))
      } else {
        setErrorMsg(data.error || 'Không thể tải danh sách học viên')
      }
    } catch (e: any) {
      setErrorMsg(e.message)
    } finally {
      setLoadingUsers(false)
    }
  }

  // Filters logic
  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      (u.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(u.id).includes(searchQuery)

    if (filterType === 'VERIFIED') return matchesSearch && u.emailVerified !== null
    if (filterType === 'UNVERIFIED') return matchesSearch && u.emailVerified === null
    return matchesSearch
  })

  // Select all visible users
  const handleSelectAll = () => {
    const newSelected = new Set(selectedUserIds)
    const allVisibleSelected = filteredUsers.every((u) => selectedUserIds.has(u.id))
    
    if (allVisibleSelected) {
      filteredUsers.forEach((u) => newSelected.delete(u.id))
    } else {
      filteredUsers.forEach((u) => newSelected.add(u.id))
    }
    setSelectedUserIds(newSelected)
  }

  // Toggle single selection
  const handleToggleSelect = (userId: number) => {
    const newSelected = new Set(selectedUserIds)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedUserIds(newSelected)
  }

  // Step 2: Start Verification Campaign
  const handleStartVerification = async () => {
    if (selectedUserIds.size === 0) {
      alert('Vui lòng chọn ít nhất 1 email để kiểm tra!')
      return
    }

    setLoadingUsers(true)
    setErrorMsg('')
    
    const selectedRecipients = users.filter((u) => selectedUserIds.has(u.id))

    try {
      const res = await fetch('/api/admin/email-verifier/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipients: selectedRecipients }),
      })
      
      const data = await res.json()
      if (data.success) {
        setCampaignId(data.campaignId)
        setCampaignTitle(data.title)
        setSendProgress({
          total: data.totalRecipients,
          sent: 0,
          success: 0,
          failed: 0
        })
        setSendLogs([])
        setStep('step2')
        // Auto start sending
        startSendingEmails(data.campaignId, data.totalRecipients)
      } else {
        setErrorMsg(data.error || 'Lỗi khởi tạo chiến dịch kiểm tra')
      }
    } catch (e: any) {
      setErrorMsg(e.message)
    } finally {
      setLoadingUsers(false)
    }
  }

  // Send batch loop
  const startSendingEmails = async (cid: number, total: number) => {
    setSending(true)
    setSendPaused(false)
    isPausedRef.current = false
    isSendingRef.current = true

    let currentSent = 0

    while (currentSent < total && isSendingRef.current) {
      if (isPausedRef.current) {
        setSending(false)
        break
      }

      try {
        const batchRes = await fetch(`/api/admin/campaigns/${cid}/send-batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batchSize: 10 }), 
        })

        if (batchRes.status === 429) {
          const limitData = await batchRes.json()
          setErrorMsg(limitData.error || 'Hệ thống đang tạm ngừng gửi do giới hạn hòm thư.')
          setSendPaused(true)
          isPausedRef.current = true
          setSending(false)
          break
        }

        const batchData = await batchRes.json()

        if (batchData.success) {
          const serverStats = batchData.stats || { totalSent: 0, totalSuccess: 0, totalFailed: 0 }
          
          setSendProgress({
            total,
            sent: serverStats.totalSent,
            success: serverStats.totalSuccess,
            failed: serverStats.totalFailed
          })

          // currentSent tính bằng tổng số đã xử lý (thành công + skip + lỗi) để đảm bảo điều kiện lặp thoát đúng khi gửi xong
          currentSent = serverStats.totalSent + serverStats.totalFailed

          const failedInThisBatch = batchData.failedInBatch || 0
          const sentInThisBatch = batchData.sentInBatch || 0
          const batchIndex = Math.ceil(currentSent / 10)

          if (failedInThisBatch > 0) {
            setSendLogs((prev) => [
              { email: `Lô ${batchIndex}: Gửi lỗi ${failedInThisBatch} email. Kiểm tra cấu hình API key/SMTP.`, status: 'FAILED' },
              ...prev.slice(0, 15)
            ])
          } else {
            setSendLogs((prev) => [
              { email: `Lô ${batchIndex}: Đã gửi thành công ${sentInThisBatch} email...`, status: 'SUCCESS' },
              ...prev.slice(0, 15)
            ])
          }

          if (batchData.finished || currentSent >= total) {
            break
          }

          await new Promise((r) => setTimeout(r, 2000))
        } else {
          setErrorMsg(batchData.error || 'Lỗi gửi batch')
          setSendPaused(true)
          isPausedRef.current = true
          break
        }
      } catch (e: any) {
        setErrorMsg(e.message)
        setSendPaused(true)
        isPausedRef.current = true
        break
      }
    }

    // Chèn thông báo hoàn tất vào log
    if (currentSent >= total && isSendingRef.current) {
      setSendLogs((prev) => [
        { email: `Hoàn thành: Đã gửi xong thư mẫu. Vui lòng nhấn nút "Quét Bounce & Phân Tích" ở trên.`, status: 'SUCCESS' },
        ...prev
      ])
    }

    setSending(false)
    isSendingRef.current = false
  }

  // Toggle Pause/Resume
  const handleTogglePause = () => {
    if (sending) {
      isPausedRef.current = true
      setSendPaused(true)
    } else if (campaignId) {
      isPausedRef.current = false
      setSendPaused(false)
      startSendingEmails(campaignId, sendProgress.total)
    }
  }

  // Step 2 -> Step 3: Scan Bounces & Analyze
  const handleScanAndAnalyze = async () => {
    if (!campaignId) return
    setIsScanningBounces(true)
    setErrorMsg('')

    try {
      await fetch('/api/admin/campaigns/bounce-scan', { method: 'POST' })
      await new Promise((r) => setTimeout(r, 2000))

      setAnalyzing(true)
      const res = await fetch(`/api/admin/email-verifier/analyze?campaignId=${campaignId}`)
      const data = await res.json()
      
      if (data.success) {
        setActiveList(data.active)
        setBouncedList(data.bounced)
        setFailedList(data.failed)
        setAnalyzeStats(data.stats)
        setStep('step3')
      } else {
        setErrorMsg(data.error || 'Lỗi phân tích kết quả chiến dịch verifier')
      }
    } catch (e: any) {
      setErrorMsg(e.message)
    } finally {
      setIsScanningBounces(false)
      setAnalyzing(false)
    }
  }

  // Export CSV Action
  const handleExportCSV = (list: VerifyResult[], fileName: string) => {
    if (list.length === 0) {
      alert('Danh sách trống, không thể xuất!')
      return
    }

    const BOM = '\uFEFF'
    let csv = BOM + 'Ma hoc vien,Ten,Email,Trang thai\n'

    list.forEach((item) => {
      const name = item.name.replace(/"/g, '""')
      csv += `${item.userId || 'N/A'},"${name}","${item.email}",${item.status}\n`
    })

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${fileName}_${Date.now()}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  if (session?.user?.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center p-8">
        <span className="text-sm font-semibold text-gray-400">Bạn không có quyền truy cập tab này.</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Back Link inside step */}
      {step !== 'step1' && (
        <button 
          onClick={() => {
            if (step === 'step3') setStep('step2')
            else if (step === 'step2') setStep('step1')
          }}
          className="flex items-center gap-1.5 text-xs text-orange-600 hover:text-orange-700 font-bold transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {step === 'step3' ? 'Quay lại Bước 2' : 'Quay lại Bước 1'}
        </button>
      )}

      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-gray-100 p-5 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-orange-600" />
            Trình Xác Thực & Lọc Email Hoạt Động
          </h2>
          <p className="text-[10px] text-gray-500 mt-0.5">
            Kiểm tra tính tồn tại của hòm thư học viên bằng phương thức gửi thư mẫu kết nối để loại bỏ email ảo/bị khóa.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl border border-gray-100 text-[9px] font-extrabold text-gray-400">
          <span className={`px-2.5 py-1 rounded-lg transition-all ${step === 'step1' ? 'bg-orange-500 text-white shadow-sm' : ''}`}>1. Quét & Chọn</span>
          <span className={`px-2.5 py-1 rounded-lg transition-all ${step === 'step2' ? 'bg-orange-500 text-white shadow-sm' : ''}`}>2. Gửi Thư Mẫu</span>
          <span className={`px-2.5 py-1 rounded-lg transition-all ${step === 'step3' ? 'bg-orange-500 text-white shadow-sm' : ''}`}>3. Lọc & Xuất CSV</span>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* ==================== BƯỚC 1: QUÉT & CHỌN ==================== */}
      {step === 'step1' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm flex flex-col gap-4">
              <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-wider">Thống Kê Dữ Liệu</h3>
              {loadingUsers ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                </div>
              ) : (
                <div className="flex flex-col gap-2 text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                    <span className="text-gray-500 flex items-center gap-1">
                      <Users className="w-3 h-3" /> Tổng số:
                    </span>
                    <span className="font-black text-gray-800">{stats.total}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                    <span className="text-gray-500 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-green-500" /> Đã xác minh:
                    </span>
                    <span className="font-black text-green-600">{stats.verified}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-gray-500 flex items-center gap-1">
                      <MailWarning className="w-3 h-3 text-amber-500" /> Chưa xác minh:
                    </span>
                    <span className="font-black text-amber-600">{stats.unverified}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm flex flex-col gap-3">
              <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-wider">Hành Động</h3>
              <div className="flex flex-col gap-2">
                <div className="text-[10px] text-gray-400 font-bold">
                  Đã chọn: <span className="text-orange-600 font-black">{selectedUserIds.size}</span> học viên
                </div>
                <button
                  onClick={handleStartVerification}
                  disabled={selectedUserIds.size === 0 || loadingUsers}
                  className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {loadingUsers ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  Bắt đầu kiểm tra
                </button>
                <button
                  onClick={fetchUsers}
                  disabled={loadingUsers}
                  className="w-full py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Làm mới danh sách
                </button>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-3 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            {/* Toolbar */}
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm Tên, Email, ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 w-full bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="flex items-center gap-1 w-full sm:w-auto justify-end">
                <Filter className="w-3.5 h-3.5 text-gray-400" />
                <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200 text-[9px] font-extrabold text-gray-500">
                  <button onClick={() => setFilterType('ALL')} className={`px-2 py-0.5 rounded-md ${filterType === 'ALL' ? 'bg-white text-orange-600 shadow-sm' : ''}`}>Tất cả</button>
                  <button onClick={() => setFilterType('VERIFIED')} className={`px-2 py-0.5 rounded-md ${filterType === 'VERIFIED' ? 'bg-white text-orange-600 shadow-sm' : ''}`}>Đã XM</button>
                  <button onClick={() => setFilterType('UNVERIFIED')} className={`px-2 py-0.5 rounded-md ${filterType === 'UNVERIFIED' ? 'bg-white text-orange-600 shadow-sm' : ''}`}>Chưa XM</button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto max-h-[400px]">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100 text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={filteredUsers.length > 0 && filteredUsers.every(u => selectedUserIds.has(u.id))}
                        onChange={handleSelectAll}
                        className="rounded text-orange-500 focus:ring-orange-500 cursor-pointer h-3.5 w-3.5"
                      />
                    </th>
                    <th className="p-3 w-20">Mã HV</th>
                    <th className="p-3">Học viên</th>
                    <th className="p-3">Email</th>
                    <th className="p-3 w-28 text-center">Xác minh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs">
                  {loadingUsers ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center">
                        <Loader2 className="w-5 h-5 animate-spin text-orange-500 mx-auto" />
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-gray-400">Không tìm thấy kết quả</td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50/30 transition-colors">
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={selectedUserIds.has(user.id)}
                            onChange={() => handleToggleSelect(user.id)}
                            className="rounded text-orange-500 focus:ring-orange-500 cursor-pointer h-3.5 w-3.5"
                          />
                        </td>
                        <td className="p-3 font-semibold text-gray-400">#{user.id}</td>
                        <td className="p-3 font-bold text-gray-800">{user.name || 'N/A'}</td>
                        <td className="p-3 font-mono text-gray-500">{user.email}</td>
                        <td className="p-3 text-center">
                          {user.emailVerified ? (
                            <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 text-[9px] font-black">Đã xác minh</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[9px] font-black">Chưa xác minh</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== BƯỚC 2: GỬI THƯ MẪU ==================== */}
      {step === 'step2' && (
        <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-50 pb-4 gap-4">
            <div>
              <span className="text-[9px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded">ĐANG KIỂM TRA</span>
              <h3 className="text-sm font-bold text-gray-900 mt-1">{campaignTitle}</h3>
              <p className="text-[9px] text-gray-400 font-bold">Mã chiến dịch: #{campaignId}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleTogglePause}
                disabled={sendProgress.sent >= sendProgress.total}
                className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow cursor-pointer ${
                  sending ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                {sending ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {sending ? 'Tạm Dừng' : 'Tiếp Tục'}
              </button>

              <button
                onClick={handleScanAndAnalyze}
                disabled={sending}
                className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow disabled:opacity-50 cursor-pointer"
              >
                {isScanningBounces || analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Quét Bounce & Phân Tích
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col">
              <span className="text-[9px] text-gray-400 font-extrabold uppercase">Cần Kiểm Tra</span>
              <span className="text-base font-black text-gray-800 mt-0.5">{sendProgress.total}</span>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col">
              <span className="text-[9px] text-gray-400 font-extrabold uppercase">Đã Gửi Đi</span>
              <span className="text-base font-black text-blue-600 mt-0.5">{sendProgress.sent}</span>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col">
              <span className="text-[9px] text-gray-400 font-extrabold uppercase">Thành Công</span>
              <span className="text-base font-black text-green-600 mt-0.5">{sendProgress.success}</span>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col">
              <span className="text-[9px] text-gray-400 font-extrabold uppercase">Lỗi (Định Dạng)</span>
              <span className="text-base font-black text-red-600 mt-0.5">{sendProgress.failed}</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-[9px] text-gray-400 font-bold">
              <span>Tiến trình gửi thư mẫu</span>
              <span>{sendProgress.total > 0 ? Math.round(((sendProgress.sent + sendProgress.failed) / sendProgress.total) * 100) : 0}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden border border-gray-200">
              <div 
                className="bg-orange-500 h-full transition-all duration-300 shadow-sm"
                style={{ width: `${sendProgress.total > 0 ? Math.min(100, Math.round(((sendProgress.sent + sendProgress.failed) / sendProgress.total) * 100)) : 0}%` }}
              />
            </div>
          </div>

          {sendProgress.sent + sendProgress.failed >= sendProgress.total && sendProgress.total > 0 && !sending && (
            <div className="p-3.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-700 text-xs font-bold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0 text-green-600" />
              Đã gửi xong toàn bộ email test mẫu! Vui lòng nhấn nút "Quét Bounce & Phân Tích" bên trên để phân tích kết quả.
            </div>
          )}

          <div className="flex flex-col gap-2">
            <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-wider">Nhật Ký Gửi</h4>
            <div className="bg-gray-900 text-gray-300 font-mono text-[9px] p-3 rounded-xl h-40 overflow-y-auto flex flex-col gap-1 shadow-inner">
              {sendLogs.length === 0 ? (
                <span className="text-gray-500 italic">Đang kết nối API...</span>
              ) : (
                sendLogs.map((log, idx) => (
                  <div key={idx} className="flex justify-between items-center py-0.5 border-b border-gray-800/40">
                    <span className={log.status === 'SUCCESS' ? 'text-green-400' : 'text-red-400'}>
                      {log.status === 'SUCCESS' ? '✔' : '✖'} {log.email}
                    </span>
                    {log.msg && <span className="text-gray-500 text-[8px]">{log.msg}</span>}
                  </div>
                ))
              )}
            </div>
            <p className="text-[9px] text-amber-600 font-semibold italic">
              * Hệ thống sử dụng pool tài khoản Brevo/Gmail và tự động chia đều tải. Vui lòng đợi 15s sau khi hoàn tất gửi rồi nhấp "Quét Bounce & Phân Tích" để nhận kết quả chính xác nhất.
            </p>
          </div>
        </div>
      )}

      {/* ==================== BƯỚC 3: LỌC & XUẤT CSV ==================== */}
      {step === 'step3' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm flex flex-col">
              <span className="text-[9px] text-gray-400 font-black uppercase">Tổng Kiểm Tra</span>
              <span className="text-base font-black text-gray-800 mt-0.5">{analyzeStats.total}</span>
            </div>
            <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm flex flex-col">
              <span className="text-[9px] text-gray-400 font-black uppercase">Đã Gửi Thư Mẫu</span>
              <span className="text-base font-black text-blue-600 mt-0.5">{analyzeStats.sent}</span>
            </div>
            <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm flex flex-col border-l-2 border-l-green-500 bg-green-500/5">
              <span className="text-[9px] text-green-600 font-black uppercase">Email Hoạt Động</span>
              <span className="text-base font-black text-green-700 mt-0.5">{analyzeStats.active}</span>
            </div>
            <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm flex flex-col border-l-2 border-l-red-500 bg-red-500/5">
              <span className="text-[9px] text-red-600 font-black uppercase">Bounce (Hỏng)</span>
              <span className="text-base font-black text-red-700 mt-0.5">{analyzeStats.bounced}</span>
            </div>
            <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm flex flex-col border-l-2 border-l-gray-400 bg-gray-500/5">
              <span className="text-[9px] text-gray-500 font-black uppercase">Lỗi SMTP / Khác</span>
              <span className="text-base font-black text-gray-700 mt-0.5">{analyzeStats.failed + analyzeStats.skipped}</span>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
              <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-wider">Danh Sách Email Kết Quả</h3>
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleExportCSV(activeList, 'email_hoat_dong')}
                  disabled={activeList.length === 0}
                  className="px-3.5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow disabled:opacity-50 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Xuất Email Hoạt Động ({activeList.length})
                </button>
                <button
                  onClick={() => handleExportCSV(bouncedList, 'email_hong_bounce')}
                  disabled={bouncedList.length === 0}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow disabled:opacity-50 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Xuất Email Hỏng ({bouncedList.length})
                </button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[400px]">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100 text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                    <th className="p-3 w-20">Mã HV</th>
                    <th className="p-3">Học viên</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Trạng thái kỹ thuật</th>
                    <th className="p-3 w-28 text-center">Kết luận</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs">
                  {activeList.map((item, idx) => (
                    <tr key={`act-${idx}`} className="hover:bg-green-50/10 transition-colors">
                      <td className="p-3 font-semibold text-gray-400">#{item.userId || 'N/A'}</td>
                      <td className="p-3 font-bold text-gray-800">{item.name}</td>
                      <td className="p-3 font-mono text-gray-500">{item.email}</td>
                      <td className="p-3 text-gray-400">Gửi thành công, không bị bounce</td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 text-[9px] font-black">HOẠT ĐỘNG</span>
                      </td>
                    </tr>
                  ))}
                  {bouncedList.map((item, idx) => (
                    <tr key={`bnc-${idx}`} className="hover:bg-red-50/10 transition-colors">
                      <td className="p-3 font-semibold text-gray-400">#{item.userId || 'N/A'}</td>
                      <td className="p-3 font-bold text-gray-800">{item.name}</td>
                      <td className="p-3 font-mono text-gray-500">{item.email}</td>
                      <td className="p-3 text-red-500 italic font-semibold">{item.errorCode || item.errorType || 'Hộp thư không tồn tại (Bounce)'}</td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 text-[9px] font-black">HỎNG (BOUNCE)</span>
                      </td>
                    </tr>
                  ))}
                  {failedList.map((item, idx) => (
                    <tr key={`fail-${idx}`} className="hover:bg-gray-100/30 transition-colors">
                      <td className="p-3 font-semibold text-gray-400">#{item.userId || 'N/A'}</td>
                      <td className="p-3 font-bold text-gray-800">{item.name}</td>
                      <td className="p-3 font-mono text-gray-500">{item.email}</td>
                      <td className="p-3 text-gray-500 italic">{item.errorCode || 'SMTP Connection Error'}</td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-gray-500/10 text-gray-600 text-[9px] font-black">LỖI GỬI</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
