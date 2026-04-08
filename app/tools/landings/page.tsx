'use client'

import Link from 'next/link'
import { Plus, Eye, Edit, Trash2, ToggleLeft, ToggleRight, FileText } from 'lucide-react'
import { getLandingPages, deleteLandingPage } from '@/app/actions/landing-actions'
import { useEffect, useState } from 'react'
import ToolHeader from '@/components/tools/ToolHeader'

export default function LandingsPage() {
    const [landings, setLandings] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadLandings()
    }, [])

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
    
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <p>Đang tải...</p>
            </div>
        )
    }
    
    return (
        <div className="min-h-screen bg-gray-50">
            <ToolHeader title="LANDING PAGES" />

            <div className="max-w-6xl mx-auto p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">Quản lý Landing Pages</h1>
                        <p className="text-gray-500 mt-1">Tạo và quản lý các trang landing cho affiliate</p>
                    </div>
                    <Link
                        href="/tools/landings/new"
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Tạo mới
                    </Link>
                </div>
            
                {landings.length === 0 ? (
                    <div className="bg-white rounded-lg border p-12 text-center">
                        <p className="text-gray-500 mb-4">Chưa có landing page nào</p>
                        <Link
                            href="/tools/landings/new"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            <Plus className="w-4 h-4" />
                            Tạo landing page đầu tiên
                        </Link>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg border overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Trang</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Template</th>
                                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Views</th>
                                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Clicks</th>
                                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Conversions</th>
                                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Trạng thái</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {landings.map((landing) => (
                                    <tr key={landing.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <div>
                                                <Link 
                                                    href={`/landing/${landing.slug}`}
                                                    target="_blank"
                                                    className="font-medium text-blue-600 hover:underline"
                                                >
                                                    /{landing.slug}
                                                </Link>
                                                <p className="text-sm text-gray-500 mt-0.5">{landing.title}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                                                {landing.template}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="font-medium">{landing.viewCount}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="font-medium">{landing._count?.clicks || 0}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="font-medium">{landing._count?.conversions || 0}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {landing.isActive ? (
                                                <span className="inline-flex items-center gap-1 text-green-600">
                                                    <ToggleRight className="w-5 h-5" />
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-gray-400">
                                                    <ToggleLeft className="w-5 h-5" />
                                                    Inactive
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <a
                                                    href={`/landing/${landing.slug}`}
                                                    target="_blank"
                                                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Xem trang"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </a>
                                                <Link
                                                    href={`/tools/landings/${landing.id}/edit`}
                                                    className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                    title="Chỉnh sửa"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(landing.id)}
                                                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Xóa"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-medium text-blue-900 mb-2">Link Affiliate mẫu:</h3>
                    <p className="text-sm text-blue-700 font-mono">
                        giautoandien.io.vn/{'{slug}'}?ref={'{affiliate_code}'}
                    </p>
                </div>
            </div>
        </div>
    )
}