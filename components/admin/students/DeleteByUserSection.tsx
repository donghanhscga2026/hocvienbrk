'use client'

import { useState } from 'react'
import { AlertTriangle, Trash2, Search, Loader2 } from 'lucide-react'
import { previewDeleteUsersAction, bulkDeleteUsersAction, UserDeleteCondition } from '@/app/actions/admin-actions'

export default function DeleteByUserSection() {
  const [deleteMode, setDeleteMode] = useState<'gte' | 'between' | 'in'>('gte')
  const [val, setVal] = useState('')
  const [valA, setValA] = useState('')
  const [valB, setValB] = useState('')
  const [vals, setVals] = useState('')
  
  const [preview, setPreview] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handlePreview = async () => {
    setError(null)
    setMessage(null)
    setLoading(true)
    
    const cond: UserDeleteCondition = { type: deleteMode }
    if (deleteMode === 'gte') cond.value = parseInt(val) || 0
    if (deleteMode === 'between') { 
        cond.valueA = parseInt(valA) || 0
        cond.valueB = parseInt(valB) || 999999 
    }
    if (deleteMode === 'in') {
        cond.values = vals.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
    }

    try {
      const res = await previewDeleteUsersAction(cond)
      if (res.success) {
        setPreview(res)
      } else {
        setError(res.error || 'Có lỗi xảy ra')
      }
    } catch (e) {
      setError('Lỗi kết nối')
    }
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!window.confirm('CẢNH BÁO: Hành động này sẽ xóa vĩnh viễn dữ liệu người dùng và các bản ghi liên quan. Bạn có chắc chắn muốn tiếp tục?')) {
      return
    }

    setError(null)
    setMessage(null)
    setDeleting(true)
    
    const cond: UserDeleteCondition = { type: deleteMode }
    if (deleteMode === 'gte') cond.value = parseInt(val) || 0
    if (deleteMode === 'between') { 
        cond.valueA = parseInt(valA) || 0
        cond.valueB = parseInt(valB) || 999999 
    }
    if (deleteMode === 'in') {
        cond.values = vals.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
    }

    try {
      const res = await bulkDeleteUsersAction(cond)
      if (res.success) {
        setMessage(res.message || 'Đã xóa thành công')
        setPreview(null)
      } else {
        setError(res.error || 'Lỗi khi xóa')
      }
    } catch (e) {
      setError('Lỗi kết nối')
    }
    setDeleting(false)
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
      <div className="flex items-center gap-2 text-red-700 font-bold mb-4">
        <AlertTriangle className="w-5 h-5" />
        <h3>XÓA NGƯỜI DÙNG HÀNG LOẠT (DÀNH CHO ADMIN)</h3>
      </div>

      <div className="flex flex-wrap gap-4 mb-4">
        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
          <input type="radio" checked={deleteMode === 'gte'} onChange={() => setDeleteMode('gte')} className="w-4 h-4 text-red-600 focus:ring-red-500" />
          ID ≥
        </label>
        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
          <input type="radio" checked={deleteMode === 'between'} onChange={() => setDeleteMode('between')} className="w-4 h-4 text-red-600 focus:ring-red-500" />
          ID từ...đến...
        </label>
        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
          <input type="radio" checked={deleteMode === 'in'} onChange={() => setDeleteMode('in')} className="w-4 h-4 text-red-600 focus:ring-red-500" />
          Danh sách ID (cách nhau bởi dấu phẩy)
        </label>
      </div>

      <div className="space-y-4">
        {deleteMode === 'gte' && (
          <input 
            type="number" 
            value={val} 
            onChange={e => setVal(e.target.value)} 
            placeholder="Ví dụ: 58681" 
            className="w-full px-4 py-2 border border-red-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
          />
        )}
        {deleteMode === 'between' && (
          <div className="flex gap-2">
            <input 
              type="number" 
              value={valA} 
              onChange={e => setValA(e.target.value)} 
              placeholder="Từ ID" 
              className="flex-1 px-4 py-2 border border-red-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
            />
            <input 
              type="number" 
              value={valB} 
              onChange={e => setValB(e.target.value)} 
              placeholder="Đến ID" 
              className="flex-1 px-4 py-2 border border-red-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
            />
          </div>
        )}
        {deleteMode === 'in' && (
          <textarea 
            value={vals} 
            onChange={e => setVals(e.target.value)} 
            placeholder="Ví dụ: 58681, 58682, 58690" 
            className="w-full h-24 px-4 py-2 border border-red-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 bg-white resize-none"
          />
        )}

        <div className="flex gap-3">
          <button
            onClick={handlePreview}
            disabled={loading || deleting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-red-200 text-red-700 rounded-xl font-bold hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Xem trước
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting || !preview}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50 shadow-lg shadow-red-200"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Xác nhận xóa
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-white border border-red-200 rounded-xl text-red-600 text-sm font-medium">
          {error}
        </div>
      )}

      {message && (
        <div className="mt-4 p-3 bg-green-100 border border-green-200 rounded-xl text-green-700 text-sm font-medium">
          {message}
        </div>
      )}

      {preview && preview.stats && (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            <div className="p-3 bg-white rounded-xl border border-red-100">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Học viên</p>
              <p className="text-lg font-black text-red-600">{preview.stats.users}</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-red-100">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Hệ thống (Systems)</p>
              <p className="text-lg font-black text-red-600">{preview.stats.systems}</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-red-100">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">TCA Members</p>
              <p className="text-lg font-black text-red-600">{preview.stats.tcaMembers}</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-red-100">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Cây hệ thống (Closures)</p>
              <p className="text-lg font-black text-red-600">{preview.stats.userClosures + preview.stats.systemClosures}</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-red-100">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Ví BRK & Giao dịch</p>
              <p className="text-sm font-bold text-red-600">{preview.stats.brkWalletCount} ví / {preview.stats.brkTransactionCount} gd</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-red-100">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Ví Aff & Giao dịch</p>
              <p className="text-sm font-bold text-red-600">{preview.stats.affiliateWalletCount} ví / {preview.stats.affiliateTransactionCount} gd</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-red-100">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Affiliate Stats</p>
              <p className="text-xs font-bold text-red-600">
                {preview.stats.affiliateCommissionCount} hoa hồng / {preview.stats.affiliatePayoutCount} payout / {preview.stats.affiliateLinkCount} link / {preview.stats.affiliateRefCount} ref
              </p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-red-100">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Khóa học & Bài học</p>
              <p className="text-xs font-bold text-red-600">
                {preview.stats.enrollmentCount} lớp / {preview.stats.paymentCount} bill / {preview.stats.lessonProgressCount} bài học / {preview.stats.lessonCommentCount} cmt
              </p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-red-100 col-span-2">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Thông tin khác</p>
              <p className="text-xs font-semibold text-red-600 leading-tight">
                {preview.stats.userBankAccountCount} bank / {preview.stats.siteProfileCount} profile / {preview.stats.userRoadmapCount} roadmap / {preview.stats.accountCount} mxh / {preview.stats.sessionCount} phiên / {preview.stats.emailLogCount} mail
              </p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-red-100">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Điểm đăng ký</p>
              <p className="text-lg font-black text-red-600">{preview.stats.registrationPoints}</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-red-100">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">TỔNG BẢN GHI</p>
              <p className="text-lg font-black text-red-700">{preview.stats.total}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-red-100 overflow-hidden">
            <p className="px-4 py-2 bg-red-100 text-[10px] font-black text-red-700 uppercase">Danh sách xem trước (Tối đa 50)</p>
            <div className="max-h-48 overflow-y-auto divide-y divide-red-50">
              {preview.usersPreview.map((u: any) => (
                <div key={u.id} className="px-4 py-2 text-xs flex justify-between gap-2">
                  <span className="font-bold text-gray-700 min-w-[60px]">#{u.id}</span>
                  <span className="flex-1 truncate text-gray-600">{u.name || 'N/A'}</span>
                  <span className="text-gray-400 truncate">{u.email}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
