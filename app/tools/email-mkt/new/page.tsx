'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, CheckCircle2, AlertCircle, Eye, Image, Shuffle, User, Hash, Link2 } from 'lucide-react'
import MainHeader from '@/components/layout/MainHeader'
import { Button } from '@/components/ui/button'
import { previewSpin } from '@/lib/email-spin'

function CreateCampaignContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const campaignId = searchParams.get('id')
  const isEditMode = !!campaignId

  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEditMode)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const [title, setTitle] = useState('')
  const [notificationType, setNotificationType] = useState('THONG_BAO')
  const [recipientSource, setRecipientSource] = useState('DB_ALL')
  const [recipientCourseId, setRecipientCourseId] = useState('')
  const [recipientCsvData, setRecipientCsvData] = useState('')
  const [subject, setSubject] = useState('')
  const [htmlContent, setHtmlContent] = useState('')

  const [courses, setCourses] = useState<any[]>([])
  const [recipientPreview, setRecipientPreview] = useState<any[] | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [showSpinPreview, setShowSpinPreview] = useState(false)
  const [spinPreviews, setSpinPreviews] = useState<string[]>([])

  const insertAtCursor = (text: string) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const newContent = htmlContent.substring(0, start) + text + htmlContent.substring(end)
    setHtmlContent(newContent)
    setTimeout(() => {
      textarea.focus()
      textarea.selectionStart = textarea.selectionEnd = start + text.length
    }, 0)
  }

  const wrapSpin = () => {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = htmlContent.substring(start, end)
    if (selected) {
      insertAtCursor(`{${selected}}`)
    } else {
      insertAtCursor('{option1|option2}')
    }
  }

  const insertImage = () => {
    const url = prompt('Nhập URL hình ảnh:')
    if (url) {
      insertAtCursor(`<img src="${url}" alt="" style="max-width:100%;height:auto;" />`)
    }
  }

  const handlePreviewSpin = () => {
    if (!htmlContent.trim()) return
    setSpinPreviews(previewSpin(htmlContent, 3))
    setShowSpinPreview(true)
  }

  useEffect(() => {
    fetch('/api/courses')
      .then(res => res.ok ? res.json() : { courses: [] })
      .then(data => setCourses(data.courses || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!campaignId) return
    setFetching(true)
    fetch(`/api/admin/campaigns/${campaignId}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setTitle(data.title || '')
          setNotificationType(data.notificationType || 'THONG_BAO')
          setRecipientSource(data.recipientSource || 'DB_ALL')
          setSubject(data.subject || '')
          setHtmlContent(data.htmlContent || '')
          if (data.recipientFilter?.courseId) {
            setRecipientCourseId(data.recipientFilter.courseId.toString())
          }
          if (data.recipientCsvData) {
            setRecipientCsvData(data.recipientCsvData)
          }
        }
      })
      .catch(() => {})
      .finally(() => setFetching(false))
  }, [campaignId])

  const getNotificationTypes = () => [
    { value: 'THONG_BAO', label: 'Thông báo chung' },
    { value: 'KICH_HOAT', label: 'Kích hoạt khóa học' },
    { value: 'MARKETING', label: 'Marketing' },
    { value: 'CHUC_MUNG', label: 'Chúc mừng' },
  ]

  const getRecipientSources = () => [
    { value: 'DB_ALL', label: 'Tất cả học viên (đã xác thực email)' },
    { value: 'DB_ACTIVE', label: 'Học viên đang học trong khóa' },
    { value: 'CSV', label: 'Danh sách CSV/JSON tự nhập' },
  ]

  const handlePreviewRecipients = async () => {
    setPreviewLoading(true)
    setRecipientPreview(null)
    try {
      let url = `/api/admin/campaigns/potential-recipients?source=${recipientSource}`
      if (recipientSource === 'DB_ACTIVE' && recipientCourseId) {
        url += `&courseId=${recipientCourseId}`
      }
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setRecipientPreview(Array.isArray(data) ? data : [])
      }
    } catch {}
    setPreviewLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const body: any = {
      title,
      notificationType,
      recipientSource,
      subject,
      htmlContent,
    }

    if (recipientSource === 'DB_ACTIVE') {
      body.recipientFilter = { courseId: parseInt(recipientCourseId) || 0 }
    }

    if (recipientSource === 'CSV') {
      body.recipientCsvData = recipientCsvData
    }

    try {
      const res = await fetch('/api/admin/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        const campaign = await res.json()
        setMessage({ type: 'success', text: 'Đã tạo chiến dịch thành công!' })
        setTimeout(() => router.push(`/tools/email-mkt/${campaign.id}`), 1200)
      } else {
        const errText = await res.text()
        setMessage({ type: 'error', text: errText || 'Lỗi khi tạo chiến dịch' })
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Lỗi kết nối' })
    }
    setLoading(false)
  }

  if (fetching) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <MainHeader title={isEditMode ? 'CHỈNH SỬA CHIẾN DỊCH' : 'TẠO CHIẾN DỊCH MỚI'} toolSlug="email-mkt" />
      <div className="max-w-lg mx-auto p-4 space-y-6">
        <Link href="/tools/email-mkt" className="inline-flex items-center gap-2 text-xs font-black text-gray-400 uppercase hover:text-orange-500 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
        </Link>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
            <h2 className="font-black text-gray-900 uppercase tracking-tight text-sm">Thông tin chiến dịch</h2>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Tiêu đề *</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold outline-none"
                placeholder="VD: Khuyến mãi tháng 6" required />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Loại thông báo</label>
              <select value={notificationType} onChange={e => setNotificationType(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold outline-none">
                {getNotificationTypes().map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
            <h2 className="font-black text-gray-900 uppercase tracking-tight text-sm">Người nhận</h2>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Nguồn</label>
              <select value={recipientSource} onChange={e => { setRecipientSource(e.target.value); setRecipientPreview(null) }}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold outline-none">
                {getRecipientSources().map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {recipientSource === 'DB_ACTIVE' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Chọn khóa học *</label>
                <select value={recipientCourseId} onChange={e => setRecipientCourseId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold outline-none">
                  <option value="">-- Chọn khóa --</option>
                  {courses.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name_lop} ({c.id_khoa})</option>
                  ))}
                </select>
              </div>
            )}

            {recipientSource === 'CSV' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Dữ liệu CSV/JSON</label>
                <textarea value={recipientCsvData} onChange={e => setRecipientCsvData(e.target.value)}
                  rows={5}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm outline-none resize-y font-mono"
                  placeholder='[{"email":"user@example.com","name":"Nguyen Van A"}]' />
              </div>
            )}

            <Button type="button" onClick={handlePreviewRecipients} disabled={previewLoading}
              className="w-full bg-gray-100 text-gray-700 font-bold text-sm rounded-xl py-2.5 flex items-center justify-center gap-2">
              {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
              Xem trước người nhận
            </Button>

            {recipientPreview && (
              <div className="bg-gray-50 rounded-xl p-3 max-h-40 overflow-y-auto">
                <p className="text-xs font-bold text-gray-500 mb-1">Tổng: {recipientPreview.length} người</p>
                {recipientPreview.slice(0, 10).map((u: any, i: number) => (
                  <div key={i} className="text-xs text-gray-600 truncate">{u.email}{u.name ? ` (${u.name})` : ''}</div>
                ))}
                {recipientPreview.length > 10 && (
                  <p className="text-xs text-gray-400 mt-1">...và {recipientPreview.length - 10} người khác</p>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
            <h2 className="font-black text-gray-900 uppercase tracking-tight text-sm">Nội dung email</h2>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Tiêu đề email *</label>
              <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold outline-none"
                placeholder="Tiêu đề email..." required />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Nội dung HTML</label>
              <div className="flex flex-wrap gap-1 mb-2">
                <button type="button" onClick={insertImage}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-bold text-gray-600">
                  <Image className="w-3.5 h-3.5" /> Ảnh
                </button>
                <button type="button" onClick={wrapSpin}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-bold text-gray-600">
                  <Shuffle className="w-3.5 h-3.5" /> Spin
                </button>
                <button type="button" onClick={() => insertAtCursor('[Tên]')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-bold text-gray-600">
                  <User className="w-3.5 h-3.5" /> [Tên]
                </button>
                <button type="button" onClick={() => insertAtCursor('[MãHV]')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-bold text-gray-600">
                  <Hash className="w-3.5 h-3.5" /> [MãHV]
                </button>
                <button type="button" onClick={() => insertAtCursor('<unsubscribe></unsubscribe>')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-bold text-gray-600">
                  <Link2 className="w-3.5 h-3.5" /> Hủy ĐK
                </button>
                <button type="button" onClick={handlePreviewSpin}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 rounded-lg text-xs font-bold text-blue-600">
                  <Eye className="w-3.5 h-3.5" /> Xem Spin
                </button>
              </div>
              <textarea ref={textareaRef} value={htmlContent} onChange={e => setHtmlContent(e.target.value)}
                rows={12}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm outline-none resize-y font-mono"
                placeholder="<html><body>...</body></html>" />
              <p className="text-[10px] text-gray-400">
                Hỗ trợ: {'{Tên}'}, {'{MãHV}'}, {'{option1|option2}'} (spin content), 
                {'<unsubscribe>'}</p>
              {showSpinPreview && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-blue-700">Xem trước Spin (3 phiên bản)</span>
                    <button type="button" onClick={() => setShowSpinPreview(false)}
                      className="text-blue-400 hover:text-blue-600 text-xs font-bold">Đóng</button>
                  </div>
                  {spinPreviews.map((preview, i) => (
                    <div key={i} className="bg-white rounded-lg p-3 text-xs text-gray-700 border border-blue-100 max-h-32 overflow-y-auto">
                      <span className="font-bold text-blue-500 mr-2">#{i + 1}:</span>
                      <div dangerouslySetInnerHTML={{ __html: preview }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {message && (
            <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-bold ${
              message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              {message.text}
            </div>
          )}

          <button type="submit" disabled={loading || !title || !subject}
            className="w-full bg-black text-yellow-400 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            {isEditMode ? 'Lưu thay đổi' : 'Tạo chiến dịch'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function CreateCampaignPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>}>
      <CreateCampaignContent />
    </Suspense>
  )
}
