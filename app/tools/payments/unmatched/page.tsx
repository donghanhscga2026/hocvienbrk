'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { getUnmatchedTransactions, assignUnmatchedTransactionAction, dismissUnmatchedTransactionAction } from '@/app/actions/payment-actions'
import { AlertCircle, ArrowLeft, CheckCircle, XCircle } from 'lucide-react'
import MainHeader from '@/components/layout/MainHeader'

interface UnmatchedTx {
  id: number
  source: string
  externalId: string
  amount: number | null
  accountNumber: string | null
  bankName: string | null
  content: string | null
  transferTime: string | null
  reason: string | null
  createdAt: string
}

export default function UnmatchedTransactionsPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'

  const [txs, setTxs] = useState<UnmatchedTx[]>([])
  const [loading, setLoading] = useState(true)
  const [enrollmentInputs, setEnrollmentInputs] = useState<Record<number, string>>({})
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [message, setMessage] = useState<{ type: 'ok' | 'err', text: string } | null>(null)

  async function loadData() {
    setLoading(true)
    const result = await getUnmatchedTransactions()
    if (result.success) {
      setTxs(result.transactions as unknown as UnmatchedTx[])
    } else {
      setMessage({ type: 'err', text: result.error || 'Không tải được dữ liệu' })
    }
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  async function handleAssign(txId: number) {
    const enrollmentId = parseInt(enrollmentInputs[txId] || '')
    if (!enrollmentId) {
      setMessage({ type: 'err', text: 'Vui lòng nhập ID enrollment cần gán.' })
      return
    }
    if (!confirm(`Gán giao dịch #${txId} cho enrollment #${enrollmentId} và kích hoạt?`)) return
    setActionLoading(txId)
    const result = await assignUnmatchedTransactionAction(txId, enrollmentId)
    setActionLoading(null)
    if (result.success) {
      setMessage({ type: 'ok', text: result.message || 'Đã gán thành công.' })
      loadData()
    } else {
      setMessage({ type: 'err', text: result.error || 'Gán thất bại.' })
    }
  }

  async function handleDismiss(txId: number) {
    if (!confirm(`Bỏ qua giao dịch #${txId}? (Giao dịch sẽ bị ẩn khỏi danh sách)`)) return
    setActionLoading(txId)
    const result = await dismissUnmatchedTransactionAction(txId)
    setActionLoading(null)
    if (result.success) {
      loadData()
    } else {
      setMessage({ type: 'err', text: result.error || 'Thất bại.' })
    }
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <MainHeader title="GIAO DỊCH CHƯA KHỚP" toolSlug="payments" />
        <div className="p-6 text-center text-gray-500">Chỉ Admin mới có quyền xem trang này.</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <MainHeader title="GIAO DỊCH CHƯA KHỚP" toolSlug="payments" />

      <div className="px-3 py-2.5">
        <Link href="/tools/payments" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Quay lại quản lý thanh toán
        </Link>
        <p className="text-xs text-gray-500 mt-1">
          Tiền đã về nhưng hệ thống không tự khớp được enrollment nào (sai nội dung, thiếu tiền, không có đơn chờ...). Admin đối soát và gán tay tại đây.
        </p>
      </div>

      {message && (
        <div className={`mx-3 mb-2 p-2.5 rounded text-sm flex items-center gap-2 ${message.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.type === 'ok' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      <div className="px-3 pb-6">
        {loading ? (
          <div className="text-center text-gray-500 py-8">Đang tải...</div>
        ) : txs.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
            Không có giao dịch chưa khớp nào. Mọi thứ đã đối soát xong.
          </div>
        ) : (
          <div className="space-y-3">
            {txs.map(tx => (
              <div key={tx.id} className="bg-white rounded-lg border shadow-sm p-3">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${tx.source === 'SEPAY' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {tx.source}
                  </span>
                  <span className="text-sm font-bold text-gray-900">{(tx.amount || 0).toLocaleString()}đ</span>
                  <span className="text-xs text-gray-500">
                    {tx.transferTime ? new Date(tx.transferTime).toLocaleString('vi-VN') : new Date(tx.createdAt).toLocaleString('vi-VN')}
                  </span>
                </div>
                <div className="text-xs text-gray-600 space-y-1 mb-2">
                  <div><span className="font-semibold">Ngân hàng:</span> {tx.bankName || 'N/A'} {tx.accountNumber ? `• TK ...${tx.accountNumber.slice(-4)}` : ''}</div>
                  <div><span className="font-semibold">Nội dung CK:</span> <span className="font-mono break-all">{tx.content || 'N/A'}</span></div>
                  <div className="text-amber-700"><span className="font-semibold">Lý do chưa khớp:</span> {tx.reason || 'N/A'}</div>
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    placeholder="ID enrollment"
                    value={enrollmentInputs[tx.id] || ''}
                    onChange={e => setEnrollmentInputs(prev => ({ ...prev, [tx.id]: e.target.value }))}
                    className="w-32 text-sm border rounded px-2 py-1.5"
                  />
                  <button
                    onClick={() => handleAssign(tx.id)}
                    disabled={actionLoading === tx.id}
                    className="text-sm bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {actionLoading === tx.id ? 'Đang xử lý...' : 'Gán tay + kích hoạt'}
                  </button>
                  <button
                    onClick={() => handleDismiss(tx.id)}
                    disabled={actionLoading === tx.id}
                    className="text-sm bg-gray-200 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-300 disabled:opacity-50 inline-flex items-center gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Bỏ qua
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
