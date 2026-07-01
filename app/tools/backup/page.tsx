'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import MainHeader from '@/components/layout/MainHeader'
import { Button } from '@/components/ui/button'
import { Loader2, AlertTriangle, Database, Download, Upload, Trash2, RefreshCw, HardDrive, FileJson } from 'lucide-react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface BackupItem {
    name: string
    method: 'json' | 'pg_dump'
    createdAt: string
    totalRecords: number
    totalModels: number
    sizeBytes: number
}

interface PgDumpStatus {
    available: boolean
    version: string | null
    path: string | null
}

export default function BackupToolPage() {
    const { data: session } = useSession()
    const isAdmin = session?.user?.role === 'ADMIN'

    const [backups, setBackups] = useState<BackupItem[]>([])
    const [pgDumpStatus, setPgDumpStatus] = useState<PgDumpStatus | null>(null)
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [error, setError] = useState('')
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

    const loadBackups = async () => {
        setLoading(true)
        setError('')
        try {
            const res = await fetch('/api/admin/backup')
            const data = await res.json()
            if (data.error) { setError(data.error); return }
            setBackups(data.backups || [])
            setPgDumpStatus(data.pgDumpStatus)
        } catch (e: any) {
            setError(e.message || 'Lỗi kết nối')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { loadBackups() }, [])

    const createBackup = async (method: 'json' | 'pg_dump') => {
        setActionLoading(method)
        setMessage(null)
        try {
            const res = await fetch('/api/admin/backup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ method }),
            })
            const data = await res.json()
            if (data.success) {
                setMessage({ type: 'success', text: `✅ Backup ${method === 'json' ? 'JSON' : 'pg_dump'} thành công! ${data.totalRecords ? `(${data.totalRecords} records)` : ''}` })
                loadBackups()
            } else {
                setMessage({ type: 'error', text: `❌ ${data.error || 'Thất bại'}` })
            }
        } catch (e: any) {
            setMessage({ type: 'error', text: `❌ ${e.message}` })
        } finally {
            setActionLoading(null)
        }
    }

    const restoreBackup = async (backup: BackupItem) => {
        if (!confirm(`⚠️ Khôi phục từ "${backup.name}"?\n\nDữ liệu hiện tại sẽ bị GHI ĐÈ!\n\nTiếp tục?`)) return

        setActionLoading(`restore_${backup.name}`)
        setMessage(null)
        try {
            const res = await fetch('/api/admin/backup/restore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: backup.name, method: backup.method }),
            })
            const data = await res.json()
            if (data.success) {
                setMessage({ type: 'success', text: `✅ ${data.details || 'Restore thành công!'}` })
            } else {
                setMessage({ type: 'error', text: `❌ ${data.error || 'Thất bại'}` })
            }
        } catch (e: any) {
            setMessage({ type: 'error', text: `❌ ${e.message}` })
        } finally {
            setActionLoading(null)
        }
    }

    const deleteBackup = async (name: string) => {
        if (!confirm(`Xóa backup "${name}"?`)) return

        setActionLoading(`delete_${name}`)
        try {
            const res = await fetch('/api/admin/backup', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            })
            const data = await res.json()
            if (data.success) {
                setMessage({ type: 'info', text: `🗑 Đã xóa: ${name}` })
                loadBackups()
            } else {
                setMessage({ type: 'error', text: `❌ ${data.error}` })
            }
        } catch (e: any) {
            setMessage({ type: 'error', text: `❌ ${e.message}` })
        } finally {
            setActionLoading(null)
        }
    }

    function formatSize(bytes: number): string {
        if (bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    function formatDateTime(iso: string): string {
        try {
            return new Date(iso).toLocaleString('vi-VN')
        } catch { return iso }
    }

    if (!isAdmin) {
        return (
            <main className="min-h-screen bg-gray-50">
                <MainHeader title="Sao lưu dữ liệu" />
                <div className="container mx-auto px-4 py-20 text-center">
                    <AlertTriangle className="w-16 h-16 mx-auto text-red-500 mb-4" />
                    <h2 className="text-2xl font-bold text-red-600 mb-2">Không có quyền truy cập</h2>
                    <p className="text-gray-600">Chỉ ADMIN mới có thể truy cập trang này.</p>
                    <Link href="/tools" className="inline-block mt-6">
                        <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" /> Quay lại Tools</Button>
                    </Link>
                </div>
            </main>
        )
    }

    return (
        <main className="min-h-screen bg-gray-50">
            <MainHeader title="Sao lưu dữ liệu" />

            <div className="max-w-4xl mx-auto px-4 py-6 pb-20">
                {/* Error message */}
                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                        {error}
                    </div>
                )}

                {/* Status message */}
                {message && (
                    <div className={`p-4 rounded-xl mb-4 flex items-center gap-2 ${
                        message.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-700' :
                        message.type === 'error' ? 'bg-red-500/10 border border-red-500/20 text-red-600' :
                        'bg-blue-500/10 border border-blue-500/20 text-blue-700'
                    }`}>
                        {message.type === 'success' ? '✅' : message.type === 'error' ? '❌' : 'ℹ️'}
                        {message.text}
                    </div>
                )}

                {/* Backup Methods */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {/* JSON Backup */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2.5 rounded-xl bg-emerald-500 text-white">
                                <FileJson className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800">Phương án 1: JSON</h3>
                                <p className="text-xs text-gray-500">Dùng Prisma → file JSON</p>
                            </div>
                        </div>
                        <ul className="text-xs text-gray-600 space-y-1 mb-4 ml-1">
                            <li>✅ Không cần cài thêm công cụ</li>
                            <li>✅ Backup từng model riêng biệt</li>
                            <li>✅ Dễ xem, dễ inspect</li>
                            <li>⚠️ Chậm hơn với DB lớn</li>
                        </ul>
                        <Button
                            onClick={() => createBackup('json')}
                            disabled={actionLoading !== null}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                        >
                            {actionLoading === 'json' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
                            {actionLoading === 'json' ? 'Đang backup...' : 'Backup JSON'}
                        </Button>
                    </div>

                    {/* pg_dump Backup */}
                    <div className={`bg-white rounded-2xl border shadow-sm p-5 ${pgDumpStatus?.available ? 'border-gray-200' : 'border-gray-200 opacity-70'}`}>
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`p-2.5 rounded-xl text-white ${pgDumpStatus?.available ? 'bg-blue-500' : 'bg-gray-400'}`}>
                                <Database className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800">Phương án 2: pg_dump</h3>
                                <p className="text-xs text-gray-500">PostgreSQL native dump</p>
                            </div>
                        </div>
                        <ul className="text-xs text-gray-600 space-y-1 mb-4 ml-1">
                            <li>✅ Nhanh, dump nguyên bản DB</li>
                            <li>✅ Dễ restore với psql</li>
                            <li>⚠️ Cần cài PostgreSQL tools</li>
                            <li className={`font-medium ${pgDumpStatus?.available ? 'text-green-600' : 'text-red-500'}`}>
                                {pgDumpStatus?.available ? '✅ Sẵn sàng' : '❌ Chưa cài đặt'}
                            </li>
                        </ul>
                        {pgDumpStatus?.version && (
                            <p className="text-[10px] text-gray-400 mb-2">Phiên bản: {pgDumpStatus.version}</p>
                        )}
                        <Button
                            onClick={() => createBackup('pg_dump')}
                            disabled={actionLoading !== null || !pgDumpStatus?.available}
                            className={`w-full ${pgDumpStatus?.available ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'} text-white`}
                        >
                            {actionLoading === 'pg_dump' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Database className="w-4 h-4 mr-2" />}
                            {actionLoading === 'pg_dump' ? 'Đang backup...' : pgDumpStatus?.available ? 'Backup pg_dump' : 'Chưa có pg_dump'}
                        </Button>
                        {!pgDumpStatus?.available && (
                            <p className="text-[10px] text-gray-400 mt-2 text-center">
                                Tải PostgreSQL tại{' '}
                                <a href="https://www.postgresql.org/download/" target="_blank" rel="noopener noreferrer"
                                    className="text-blue-500 underline">postgresql.org/download</a>
                            </p>
                        )}
                    </div>
                </div>

                {/* Existing Backups */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="font-bold text-gray-800 flex items-center gap-2">
                            <HardDrive className="w-4 h-4" />
                            Các bản backup hiện có
                        </h2>
                        <button onClick={loadBackups} disabled={loading} className="text-gray-400 hover:text-gray-600 transition-colors">
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                            <span className="ml-2 text-gray-500">Đang tải...</span>
                        </div>
                    ) : backups.length === 0 ? (
                        <div className="py-12 text-center text-gray-400">
                            <HardDrive className="w-10 h-10 mx-auto mb-2 opacity-50" />
                            <p>Chưa có bản backup nào</p>
                            <p className="text-xs mt-1">Chọn phương án ở trên để tạo backup đầu tiên</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {backups.map((backup) => (
                                <div key={backup.name} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`p-1.5 rounded-lg ${backup.method === 'json' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                                            {backup.method === 'json' ? <FileJson className="w-4 h-4" /> : <Database className="w-4 h-4" />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-800 truncate">{backup.name}</p>
                                            <p className="text-xs text-gray-500">
                                                {formatDateTime(backup.createdAt)}
                                                {backup.method === 'json' && backup.totalRecords > 0 && ` • ${backup.totalRecords} records`}
                                                {backup.method === 'json' && backup.totalModels > 0 && ` • ${backup.totalModels} models`}
                                                {' • '}{formatSize(backup.sizeBytes)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                                        <button
                                            onClick={() => restoreBackup(backup)}
                                            disabled={actionLoading !== null}
                                            className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-30"
                                            title="Restore"
                                        >
                                            {actionLoading === `restore_${backup.name}`
                                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                                : <Upload className="w-4 h-4" />}
                                        </button>
                                        <button
                                            onClick={() => deleteBackup(backup.name)}
                                            disabled={actionLoading !== null}
                                            className="p-2 rounded-lg text-red-400 hover:bg-red-50 transition-colors disabled:opacity-30"
                                            title="Xóa"
                                        >
                                            {actionLoading === `delete_${backup.name}`
                                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                                : <Trash2 className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Info box */}
                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                    <p className="font-bold mb-1">⚠️ Lưu ý quan trọng:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                        <li>Backup chỉ lưu trong thư mục <code className="bg-amber-100 px-1 rounded">backups/</code> của dự án</li>
                        <li>Tự động giữ 10 bản backup gần nhất, xóa bản cũ</li>
                        <li>Khi Restore, dữ liệu hiện tại sẽ bị ghi đè</li>
                        <li>Nên backup trước khi thực hiện các thay đổi lớn</li>
                    </ul>
                </div>
            </div>
        </main>
    )
}
