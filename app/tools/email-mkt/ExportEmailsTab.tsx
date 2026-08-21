'use client'

import { useState, useEffect } from 'react'
import { Loader2, FileSpreadsheet, Users } from 'lucide-react'
import { getEmailExportFilterOptionsAction, previewUserEmailExportAction, exportUserEmailsAction } from '@/app/actions/admin-actions'

export default function ExportEmailsTab() {
    const [courses, setCourses] = useState<{ id: number; name_lop: string }[]>([])
    const [systems, setSystems] = useState<{ onSystem: number; nameSystem: string }[]>([])
    const [loadingOptions, setLoadingOptions] = useState(true)

    const [courseId, setCourseId] = useState('')
    const [onSystem, setOnSystem] = useState('')
    const [registeredFrom, setRegisteredFrom] = useState('')
    const [registeredTo, setRegisteredTo] = useState('')

    const [previewTotal, setPreviewTotal] = useState<number | null>(null)
    const [previewLoading, setPreviewLoading] = useState(false)
    const [exporting, setExporting] = useState(false)
    const [notice, setNotice] = useState<{ type: 'error' | 'warn'; text: string } | null>(null)

    useEffect(() => {
        getEmailExportFilterOptionsAction().then(res => {
            if (res.success) {
                setCourses(res.courses || [])
                setSystems(res.systems || [])
            }
            setLoadingOptions(false)
        })
    }, [])

    const buildFilters = () => ({
        courseId: courseId ? parseInt(courseId) : null,
        onSystem: onSystem ? parseInt(onSystem) : null,
        registeredFrom: registeredFrom || null,
        registeredTo: registeredTo || null,
    })

    useEffect(() => {
        let cancelled = false
        setPreviewLoading(true)
        const t = setTimeout(async () => {
            const res = await previewUserEmailExportAction(buildFilters())
            if (!cancelled) {
                setPreviewTotal(res.success ? (res.total ?? 0) : 0)
                setPreviewLoading(false)
            }
        }, 300)
        return () => { cancelled = true; clearTimeout(t) }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [courseId, onSystem, registeredFrom, registeredTo])

    const handleExport = async () => {
        setExporting(true)
        setNotice(null)
        try {
            const res = await exportUserEmailsAction(buildFilters())
            if (res.success && res.sheetUrl) {
                window.open(res.sheetUrl, '_blank')
            } else if (res.success && res.csvContent) {
                const blob = new Blob([res.csvContent], { type: 'text/csv;charset=utf-8;' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `${res.fileName || 'danh-sach-email'}.csv`
                a.click()
                URL.revokeObjectURL(url)
                setNotice({ type: 'warn', text: 'Không tạo được Google Sheet, đã tải file CSV thay thế.' })
            } else {
                setNotice({ type: 'error', text: res.error || 'Lỗi xuất danh sách' })
            }
        } catch {
            setNotice({ type: 'error', text: 'Lỗi xuất danh sách' })
        }
        setExporting(false)
    }

    const hasFilters = !!(courseId || onSystem || registeredFrom || registeredTo)
    const resetFilters = () => { setCourseId(''); setOnSystem(''); setRegisteredFrom(''); setRegisteredTo('') }

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-gray-900">Bộ lọc</h3>
                    {hasFilters && (
                        <button onClick={resetFilters} className="text-xs text-gray-400 hover:text-gray-600 font-bold">
                            Xóa bộ lọc
                        </button>
                    )}
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">Khóa học</label>
                    <select
                        value={courseId}
                        onChange={e => setCourseId(e.target.value)}
                        disabled={loadingOptions}
                        className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-white disabled:opacity-50"
                    >
                        <option value="">Tất cả khóa học</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.name_lop}</option>)}
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">Hệ thống</label>
                    <select
                        value={onSystem}
                        onChange={e => setOnSystem(e.target.value)}
                        disabled={loadingOptions}
                        className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-white disabled:opacity-50"
                    >
                        <option value="">Tất cả hệ thống</option>
                        {systems.map(s => <option key={s.onSystem} value={s.onSystem}>{s.nameSystem}</option>)}
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">Thời gian đăng ký</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={registeredFrom}
                            onChange={e => setRegisteredFrom(e.target.value)}
                            className="flex-1 border border-gray-200 rounded-lg p-2.5 text-sm min-w-0"
                        />
                        <span className="text-gray-400 text-xs shrink-0">đến</span>
                        <input
                            type="date"
                            value={registeredTo}
                            onChange={e => setRegisteredTo(e.target.value)}
                            className="flex-1 border border-gray-200 rounded-lg p-2.5 text-sm min-w-0"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-orange-500 shrink-0" />
                    <span className="text-gray-500">Số tài khoản khớp bộ lọc:</span>
                    <span className="font-black text-gray-900">
                        {previewLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : (previewTotal ?? '—')}
                    </span>
                </div>

                <button
                    onClick={handleExport}
                    disabled={exporting || previewLoading || !previewTotal}
                    className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                    {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                    Xuất Google Sheet
                </button>

                {notice && (
                    <div className={`text-xs rounded-lg p-2.5 border ${notice.type === 'error' ? 'text-red-600 bg-red-50 border-red-100' : 'text-amber-700 bg-amber-50 border-amber-100'}`}>
                        {notice.text}
                    </div>
                )}

                <p className="text-[10px] text-gray-400">
                    File xuất ra gồm các cột: CONTACT ID, EMAIL, FIRSTNAME, LASTNAME, SMS (khớp template import CRM). Nếu không tạo được Google Sheet, hệ thống sẽ tự động tải về file CSV thay thế.
                </p>
            </div>
        </div>
    )
}
