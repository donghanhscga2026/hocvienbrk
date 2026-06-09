'use client'

import { useState } from 'react'
import { X, Loader2, Upload, CheckCircle, AlertTriangle, Info, ArrowLeft, RotateCcw } from 'lucide-react'
import { previewBulkEnrollAction, confirmBulkEnrollAction, revertBulkEnrollAction, type PreviewRow } from '@/app/actions/bulk-enroll-actions'

interface CourseOption {
    id: number
    name_lop: string
}

interface BulkEnrollModalProps {
    isOpen: boolean
    onClose: () => void
    courses: CourseOption[]
    isAdmin: boolean
    isTeacher: boolean
}

type Step = 'form' | 'preview' | 'result'

export default function BulkEnrollModal({ isOpen, onClose, courses, isAdmin, isTeacher }: BulkEnrollModalProps) {
    const [step, setStep] = useState<Step>('form')
    const [spreadsheetUrl, setSpreadsheetUrl] = useState('')
    const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null)
    const [loading, setLoading] = useState(false)
    const [previewRows, setPreviewRows] = useState<PreviewRow[]>([])
    const [summary, setSummary] = useState<{ total: number; new: number; existing: number; conflict: number } | null>(null)
    const [courseName, setCourseName] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)

    // Result states
    const [result, setResult] = useState<{ batchId: string; created: number; enrolled: number; modified?: number; errors?: string[] } | null>(null)
    const [reverting, setReverting] = useState(false)

    if (!isOpen) return null

    const resetForm = () => {
        setStep('form')
        setSpreadsheetUrl('')
        setSelectedCourseId(null)
        setPreviewRows([])
        setSummary(null)
        setError(null)
        setResult(null)
    }

    const handleClose = () => {
        resetForm()
        onClose()
    }

    const handlePreview = async () => {
        if (!spreadsheetUrl.trim()) { setError('Vui lòng nhập link Google Sheet.'); return }
        if (!selectedCourseId) { setError('Vui lòng chọn khóa học.'); return }

        setLoading(true)
        setError(null)
        const res = await previewBulkEnrollAction(spreadsheetUrl.trim(), selectedCourseId)
        setLoading(false)

        if (!res.success) {
            setError(res.error || 'Lỗi khi xem trước.')
            return
        }

        setPreviewRows(res.rows || [])
        setSummary(res.summary || null)
        setCourseName(res.course?.name || '')
        setStep('preview')
    }

    const handleConfirm = async () => {
        if (!selectedCourseId) return
        setSubmitting(true)
        setError(null)
        const res = await confirmBulkEnrollAction(previewRows, selectedCourseId!)
        setSubmitting(false)

        if (!res.success) {
            setError(res.error || 'Lỗi khi ghi danh.')
            return
        }

        setResult({ batchId: res.batchId || '', created: res.created || 0, enrolled: res.enrolled || 0, modified: res.modified || 0, errors: res.errors })
        setStep('result')
    }

    const handleUndo = async () => {
        if (!result?.batchId) return
        setReverting(true)
        setError(null)
        const res = await revertBulkEnrollAction(result.batchId)
        setReverting(false)

        if (!res.success) {
            setError(res.error || 'Lỗi khi hoàn tác.')
            return
        }

        setResult(null)
        setStep('form')
        setPreviewRows([])
        setSummary(null)
        setSpreadsheetUrl('')
    }

    const statusBadge = (status: string, detail?: string) => {
        if (status === 'NEW') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700"><CheckCircle className="w-3 h-3" /> Mới</span>
        if (status === 'EXISTING') return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700" title={detail}>
                <Info className="w-3 h-3" /> Tồn tại
            </span>
        )
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700"><AlertTriangle className="w-3 h-3" /> Xung đột</span>
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b shrink-0">
                    <div className="flex items-center gap-2">
                        {step === 'preview' && (
                            <button onClick={() => { setStep('form'); setError(null) }} className="text-gray-400 hover:text-gray-600">
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        )}
                        <h2 className="text-base font-bold text-gray-800">📥 Đăng ký khóa học từ danh sách</h2>
                    </div>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">

                    {error && (
                        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {step === 'form' && (
                        <>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Link Google Sheet</label>
                                <input
                                    type="text"
                                    placeholder="https://docs.google.com/spreadsheets/d/..."
                                    value={spreadsheetUrl}
                                    onChange={(e) => setSpreadsheetUrl(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                                />
                                <p className="text-[11px] text-gray-400 mt-1">
                                    Sheet cần có các cột: <strong>name</strong>, <strong>email</strong>, <strong>phone</strong>, <strong>referrerId</strong> (tùy chọn) và ở chế độ public.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Khóa học</label>
                                <select
                                    value={selectedCourseId ?? ''}
                                    onChange={(e) => setSelectedCourseId(e.target.value ? Number(e.target.value) : null)}
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                                >
                                    <option value="">-- Chọn khóa học --</option>
                                    {courses.map(c => (
                                        <option key={c.id} value={c.id}>{c.name_lop}</option>
                                    ))}
                                </select>
                            </div>

                            <button
                                onClick={handlePreview}
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition-all disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                {loading ? 'Đang xem trước...' : '🔍 Xem trước'}
                            </button>
                        </>
                    )}

                    {step === 'preview' && summary && (
                        <>
                            {/* Summary bar */}
                            <div className="flex items-center justify-center gap-3 text-sm font-bold">
                                <span className="text-emerald-600">🆕 {summary.new} mới</span>
                                <span className="text-blue-600">🔁 {summary.existing} tồn tại</span>
                                {summary.conflict > 0 && <span className="text-red-600">⚠️ {summary.conflict} xung đột</span>}
                                <span className="text-gray-400">| Khóa: {courseName}</span>
                            </div>

                            {/* Preview table */}
                            <div className="overflow-x-auto rounded-xl border border-gray-200">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-gray-50 text-gray-500 font-bold">
                                            <th className="p-2 text-left">#</th>
                                            <th className="p-2 text-left">ID</th>
                                            <th className="p-2 text-left">Họ tên</th>
                                            <th className="p-2 text-left">Email</th>
                                            <th className="p-2 text-left">SĐT</th>
                                            <th className="p-2 text-left">Trạng thái</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewRows.map((row, idx) => (
                                            <tr key={idx} className={`border-t border-gray-100 ${row.status === 'CONFLICT' ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                                                <td className="p-2 text-gray-400">{row.rowIndex}</td>
                                                <td className={`p-2 font-mono font-bold ${row.status === 'NEW' ? 'text-emerald-600' : 'text-blue-600'}`}>
                                                    {row.userId ? `#${row.userId}` : '—'}
                                                </td>
                                                <td className="p-2 font-medium text-gray-800">{row.name}</td>
                                                <td className="p-2 text-gray-600">{row.email}</td>
                                                <td className="p-2 text-gray-600">{row.phone}</td>
                                                <td className="p-2">{statusBadge(row.status, row.conflictDetail)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Confirm button */}
                            <button
                                onClick={handleConfirm}
                                disabled={submitting || summary.total === 0}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition-all disabled:opacity-50"
                            >
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                {submitting ? 'Đang xử lý...' : `✅ Xác nhận ghi danh (${summary.total - summary.conflict})`}
                            </button>
                        </>
                    )}

                    {step === 'result' && result && (
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle className="w-8 h-8 text-emerald-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">✅ Hoàn tất!</h3>
                                <div className="mt-3 space-y-1 text-sm text-gray-600">
                                    <p>Đã tạo: <strong className="text-emerald-600">{result.created}</strong> user mới</p>
                                    <p>Đã ghi danh: <strong className="text-blue-600">{result.enrolled}</strong> học viên</p>
                                    {(result.modified || 0) > 0 && <p>Đã cập nhật: <strong className="text-amber-600">{result.modified}</strong> thông tin</p>}
                                    {result.errors && result.errors.length > 0 && (
                                        <div className="mt-2 p-3 bg-red-50 rounded-xl text-left text-xs text-red-700">
                                            {result.errors.map((e, i) => <p key={i}>⚠️ {e}</p>)}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2 justify-center">
                                <button
                                    onClick={handleUndo}
                                    disabled={reverting}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 transition-all disabled:opacity-50"
                                >
                                    {reverting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                                    {reverting ? 'Đang hoàn tác...' : '↩ Hoàn tác'}
                                </button>
                                <button
                                    onClick={handleClose}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all"
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
