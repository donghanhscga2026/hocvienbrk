'use client'

import { useState } from 'react'
import { Loader2, X, Upload, FileSpreadsheet, Download } from 'lucide-react'

export function ImportLessonsModal({ courseId, onClose, onComplete }: { courseId: string, onClose: () => void, onComplete: () => void }) {
    const [file, setFile] = useState<any>(null)
    const [mode, setMode] = useState<'upsert' | 'skip'>('upsert')
    const [sourceType, setSourceType] = useState<'file' | 'sheet'>('file')
    const [sheetUrl, setSheetUrl] = useState('')
    const [importing, setImporting] = useState(false)
    const [result, setResult] = useState<any>(null)

    const handleImport = async () => {
        if (sourceType === 'file' && !file) return
        if (sourceType === 'sheet' && !sheetUrl) return

        setImporting(true)
        setResult(null)

        const formData = new FormData()
        formData.append('mode', mode)
        formData.append('sourceType', sourceType)

        if (sourceType === 'file') {
            formData.append('file', file)
        } else {
            formData.append('sheetUrl', sheetUrl)
        }

        try {
            const res = await fetch(`/api/courses/${courseId}/lessons/import`, {
                method: 'POST',
                body: formData
            })
            const data = await res.json()
            setResult(data)
            if (data.success) onComplete()
        } catch (err: any) {
            setResult({ error: err.message })
        }

        setImporting(false)
    }

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 text-white flex justify-between items-center">
                    <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5" /> Import Bài học
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6 space-y-5">
                    <a href="/lesson_template.csv" download className="flex items-center gap-2 text-xs font-bold text-purple-600 hover:underline">
                        <Download className="w-4 h-4" /> Tải template mẫu
                    </a>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Nguồn dữ liệu</label>
                        <div className="flex gap-3">
                            <label className={`flex-1 p-3 rounded-xl border cursor-pointer transition-all ${sourceType === 'file' ? 'border-purple-500 bg-purple-50' : 'border-gray-100'}`}>
                                <input type="radio" name="source" value="file" checked={sourceType === 'file'} onChange={() => setSourceType('file')} className="hidden" />
                                <span className={`text-xs font-bold ${sourceType === 'file' ? 'text-purple-700' : 'text-gray-500'}`}>File CSV</span>
                            </label>
                            <label className={`flex-1 p-3 rounded-xl border cursor-pointer transition-all ${sourceType === 'sheet' ? 'border-purple-500 bg-purple-50' : 'border-gray-100'}`}>
                                <input type="radio" name="source" value="sheet" checked={sourceType === 'sheet'} onChange={() => setSourceType('sheet')} className="hidden" />
                                <span className={`text-xs font-bold ${sourceType === 'sheet' ? 'text-purple-700' : 'text-gray-500'}`}>Google Sheets</span>
                            </label>
                        </div>
                    </div>

                    {sourceType === 'file' ? (
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">File CSV</label>
                            <input
                                key="file-input"
                                type="file"
                                accept=".csv"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-purple-50 file:text-purple-700"
                            />
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Link Google Sheets (Public)</label>
                            <input
                                key="sheet-input"
                                type="text"
                                value={sheetUrl}
                                onChange={(e) => setSheetUrl(e.target.value)}
                                placeholder="https://docs.google.com/spreadsheets/d/..."
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none"
                            />
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Khi bài học đã tồn tại</label>
                        <div className="flex gap-3">
                            <label className={`flex-1 p-3 rounded-xl border cursor-pointer transition-all ${mode === 'upsert' ? 'border-purple-500 bg-purple-50' : 'border-gray-100'}`}>
                                <input type="radio" name="mode" value="upsert" checked={mode === 'upsert'} onChange={() => setMode('upsert')} className="hidden" />
                                <span className={`text-xs font-bold ${mode === 'upsert' ? 'text-purple-700' : 'text-gray-500'}`}>Cập nhật</span>
                            </label>
                            <label className={`flex-1 p-3 rounded-xl border cursor-pointer transition-all ${mode === 'skip' ? 'border-purple-500 bg-purple-50' : 'border-gray-100'}`}>
                                <input type="radio" name="mode" value="skip" checked={mode === 'skip'} onChange={() => setMode('skip')} className="hidden" />
                                <span className={`text-xs font-bold ${mode === 'skip' ? 'text-purple-700' : 'text-gray-500'}`}>Bỏ qua</span>
                            </label>
                        </div>
                    </div>

                    {result && (
                        <div className={`p-4 rounded-2xl text-xs font-bold ${result.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                            {result.error || result.message}
                        </div>
                    )}

                    <button
                        onClick={handleImport}
                        disabled={(sourceType === 'file' && !file) || (sourceType === 'sheet' && !sheetUrl) || importing}
                        className="w-full bg-green-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {importing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                        {importing ? 'Đang import...' : 'Import Bài học'}
                    </button>
                </div>
            </div>
        </div>
    )
}
