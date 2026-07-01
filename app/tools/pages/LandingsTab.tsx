'use client'

import Link from 'next/link'
import { Plus, Eye, Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { getLandingPages, deleteLandingPage } from '@/app/actions/landing-actions'
import { useEffect, useState } from 'react'

export default function LandingsTab() {
    const [landings, setLandings] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => { loadLandings() }, [])

    async function loadLandings() {
        const data = await getLandingPages()
        setLandings(data)
        setLoading(false)
    }

    async function handleDelete(id: number) {
        if (!confirm('Bạn có chắc muốn xóa landing page này?')) return
        await deleteLandingPage(id)
        loadLandings()
    }

    if (loading) return <div className="flex items-center justify-center py-20"><span className="text-gray-400 text-sm">Đang tải...</span></div>

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-black uppercase tracking-tight">Landing Pages</h1>
                    <p className="text-sm text-gray-400 mt-0.5">Tạo và quản lý các trang landing cho affiliate</p>
                </div>
                <Link href="/tools/landings/new" className="flex items-center gap-2 px-4 py-2 bg-black text-yellow-400 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-gray-800 transition-all">
                    <Plus className="w-4 h-4" /> Tạo mới
                </Link>
            </div>

            {landings.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                    <p className="text-gray-400 mb-4 text-sm">Chưa có landing page nào</p>
                    <Link href="/tools/landings/new" className="inline-flex items-center gap-2 px-4 py-2 bg-black text-yellow-400 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-gray-800">Tạo landing page đầu tiên</Link>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-5 py-3 text-left text-[10px] font-black uppercase text-gray-400">Trang</th>
                                    <th className="px-5 py-3 text-left text-[10px] font-black uppercase text-gray-400">Template</th>
                                    <th className="px-5 py-3 text-center text-[10px] font-black uppercase text-gray-400">Views</th>
                                    <th className="px-5 py-3 text-center text-[10px] font-black uppercase text-gray-400">Clicks</th>
                                    <th className="px-5 py-3 text-center text-[10px] font-black uppercase text-gray-400">Conversions</th>
                                    <th className="px-5 py-3 text-center text-[10px] font-black uppercase text-gray-400">Trạng thái</th>
                                    <th className="px-5 py-3 text-center text-[10px] font-black uppercase text-gray-400">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {landings.map((landing) => (
                                    <tr key={landing.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-5 py-3">
                                            <Link href={`/land/${landing.slug}`} target="_blank" className="font-medium text-blue-600 hover:underline text-sm">/land/{landing.slug}</Link>
                                            <p className="text-xs text-gray-400 mt-0.5">{landing.title}</p>
                                        </td>
                                        <td className="px-5 py-3"><span className="px-2 py-1 bg-gray-100 rounded text-xs font-bold text-gray-500">{landing.template}</span></td>
                                        <td className="px-5 py-3 text-center font-medium">{landing.viewCount}</td>
                                        <td className="px-5 py-3 text-center font-medium">{landing._count?.clicks || 0}</td>
                                        <td className="px-5 py-3 text-center font-medium">{landing._count?.conversions || 0}</td>
                                        <td className="px-5 py-3 text-center">
                                            {landing.isActive ? (
                                                <span className="inline-flex items-center gap-1 text-green-600 text-xs font-bold"><ToggleRight className="w-4 h-4" /> Active</span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-gray-400 text-xs font-bold"><ToggleLeft className="w-4 h-4" /> Inactive</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <a href={`/land/${landing.slug}`} target="_blank" className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"><Eye className="w-3.5 h-3.5" /></a>
                                                <Link href={`/tools/landings/${landing.id}/edit`} className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-gray-400 hover:text-green-600 hover:bg-green-50 transition-all"><Edit className="w-3.5 h-3.5" /></Link>
                                                <button onClick={() => handleDelete(landing.id)} className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="mt-6 p-4 bg-blue-50 rounded-2xl">
                <p className="text-xs font-bold text-blue-900 mb-1">Link Affiliate mẫu:</p>
                <p className="text-sm text-blue-700 font-mono">giautoandien.io.vn/{'{slug}'}?ref={'{affiliate_code}'}</p>
            </div>
        </div>
    )
}
