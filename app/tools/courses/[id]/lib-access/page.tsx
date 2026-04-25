'use client'

import { useState, useEffect, use } from 'react'
import { ArrowLeft, Plus, Trash2, Mail, Loader2, FileSpreadsheet, Upload, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { getLibAccessEmails, addLibAccessEmail, removeLibAccessEmail, importLibAccessCsvAction } from '@/app/actions/admin-lib-actions'
import MainHeader from '@/components/layout/MainHeader'

export default function LibAccessPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const courseIdNum = parseInt(id)

    const [emails, setEmails] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [newEmail, setNewEmail] = useState('')
    const [adding, setAdding] = useState(false)
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null)

    // CSV State
    const [showCsvBox, setShowCsvBox] = useState(false)
    const [csvFile, setCsvFile] = useState<File | null>(null)
    const [csvInput, setCsvInput] = useState('')
    const [importing, setImporting] = useState(false)

    const fetchData = async () => {
        setLoading(true)
        try {
            const data = await getLibAccessEmails(courseIdNum)
            setEmails(data)
        } catch (e) {
            setMessage({ text: 'Lỗi lấy dữ liệu', type: 'error' })
        }
        setLoading(false)
    }

    useEffect(() => { fetchData() }, [courseIdNum])

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newEmail) return
        setAdding(true)
        setMessage(null)

        const res = await addLibAccessEmail(courseIdNum, newEmail)
        if (res.success) {
            setNewEmail('')
            setMessage({ text: 'Thêm email thành công!', type: 'success' })
            fetchData()
        } else {
            setMessage({ text: res.message || 'Lỗi', type: 'error' })
        }
        setAdding(false)
    }

    const handleRemove = async (emailToRemove: string) => {
        if (!confirm(`Xoá email ${emailToRemove}?`)) return
        setMessage(null)

        const res = await removeLibAccessEmail(courseIdNum, emailToRemove)
        if (res.success) {
            setMessage({ text: 'Đã xoá email', type: 'success' })
            fetchData()
        } else {
            setMessage({ text: res.message || 'Lỗi xoá', type: 'error' })
        }
    }

    const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setCsvFile(file)

        const reader = new FileReader()
        reader.onload = (event) => {
            const text = event.target?.result as string
            setCsvInput(text)
        }
        reader.readAsText(file)
    }

    const handleImportCsv = async () => {
        if (!csvInput.trim()) return

        setImporting(true)
        setMessage(null)

        // Extract emails (basic regex or just split by comma/newline)
        const rawEmails = csvInput.split(/[\n,;]+/).map(s => s.trim()).filter(s => s.includes('@'))

        const res = await importLibAccessCsvAction(courseIdNum, rawEmails)
        if (res.success) {
            setMessage({ text: `Import thành công: ${res.addedCount} email. Bỏ qua: ${res.skippedCount} (trùng lặp).`, type: 'success' })
            setCsvInput('')
            setCsvFile(null)
            setShowCsvBox(false)
            fetchData()
        } else {
            setMessage({ text: res.message || 'Lỗi import', type: 'error' })
        }

        setImporting(false)
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <MainHeader title="WHITELIST EMAIL" toolSlug="courses" />
            
            <div className="max-w-4xl mx-auto space-y-8 p-4 pb-32">
                <Link href={`/tools/courses/${id}`} className="inline-flex items-center gap-2 text-xs font-black text-gray-400 uppercase hover:text-purple-600 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Quay lại cấu hình
                </Link>

                <div className="bg-white rounded-[2.5rem] p-6 lg:p-10 shadow-xl border border-gray-100">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-xl lg:text-2xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-3">
                                <Mail className="w-6 h-6 text-purple-500" /> Whitelist Email (LIB)
                            </h1>
                            <p className="text-sm text-gray-500 mt-2 font-medium">Quản lý danh sách email được cấp phép truy cập khóa học giảng dạy tự do.</p>
                        </div>
                    </div>

                    {message && (
                        <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 text-sm font-bold ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {message.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
                            {message.text}
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Form thêm mới */}
                        <div className="lg:col-span-1 space-y-6">
                            <form onSubmit={handleAdd} className="space-y-4 bg-gray-50 p-5 rounded-3xl border border-gray-100">
                                <h3 className="text-sm font-black text-gray-900 uppercase">Thêm Email</h3>
                                <input
                                    type="email"
                                    value={newEmail}
                                    onChange={e => setNewEmail(e.target.value)}
                                    placeholder="nguyenvana@gmail.com"
                                    className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-purple-500 transition-all"
                                    required
                                />
                                <button
                                    type="submit"
                                    disabled={adding || !newEmail}
                                    className="w-full bg-purple-600 text-white rounded-2xl py-3 font-black uppercase text-xs tracking-widest flex justify-center items-center gap-2 hover:bg-purple-700 transition-all disabled:opacity-50"
                                >
                                    {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Thêm
                                </button>
                            </form>

                            <div className="bg-gray-50 p-5 rounded-3xl border border-gray-100 space-y-4">
                                <h3 className="text-sm font-black text-gray-900 uppercase">Import Hàng Loạt</h3>
                                <button
                                    type="button"
                                    onClick={() => setShowCsvBox(!showCsvBox)}
                                    className="w-full bg-indigo-100 text-indigo-700 rounded-2xl py-3 font-black uppercase text-xs tracking-widest flex justify-center items-center gap-2 hover:bg-indigo-200 transition-all"        
                                >
                                    <FileSpreadsheet className="w-4 h-4" /> CSV / Text
                                </button>

                                {showCsvBox && (
                                    <div className="space-y-3 pt-3 border-t border-gray-200">
                                        <input
                                            type="file"
                                            accept=".csv,.txt"
                                            onChange={handleCsvUpload}
                                            className="w-full text-xs file:mr-2 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-100 file:text-indigo-700"
                                        />
                                        <textarea
                                            value={csvInput}
                                            onChange={e => setCsvInput(e.target.value)}
                                            placeholder="Hoặc dán danh sách email vào đây, mỗi dòng một email..."
                                            rows={4}
                                            className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-xs font-mono outline-none"
                                        />
                                        <button
                                            onClick={handleImportCsv}
                                            disabled={!csvInput.trim() || importing}
                                            className="w-full bg-indigo-600 text-white rounded-2xl py-3 font-black uppercase text-xs tracking-widest flex justify-center items-center gap-2 disabled:opacity-50"
                                        >
                                            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Tiến hành Import
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Danh sách */}
                        <div className="lg:col-span-2">
                            <div className="bg-gray-50 border border-gray-100 rounded-3xl overflow-hidden flex flex-col h-[500px]">
                                <div className="p-4 border-b border-gray-200 bg-gray-100 flex justify-between items-center shrink-0">
                                    <h3 className="text-sm font-black text-gray-900 uppercase">Danh sách đã duyệt ({emails.length})</h3>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(emails.map(e => e.email).join('\n'))
                                            alert("Đã copy toàn bộ email!")
                                        }}
                                        className="text-[10px] uppercase font-bold text-gray-500 hover:text-purple-600"
                                    >
                                        Copy toàn bộ
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-2">
                                    {loading ? (
                                        <div className="flex items-center justify-center h-40">
                                            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                                        </div>
                                    ) : emails.length === 0 ? (
                                        <div className="flex items-center justify-center h-40 text-sm font-bold text-gray-400">
                                            Chưa có email nào trong danh sách
                                        </div>
                                    ) : (
                                        <ul className="space-y-1">
                                            {emails.map(item => (
                                                <li key={item.id} className="flex items-center justify-between p-3 hover:bg-white rounded-2xl transition-colors">
                                                    <div>
                                                        <p className="font-bold text-gray-900 text-sm">{item.email}</p>
                                                        <p className="text-[10px] text-gray-400">{new Date(item.createdAt).toLocaleString('vi-VN')}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemove(item.email)}
                                                        className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                                                        title="Xoá"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
