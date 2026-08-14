'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Loader2, MessageSquare, FileCheck2 } from 'lucide-react'
import { getCourseActivityFeedAction } from '@/app/actions/admin-actions'

type FeedItem = {
    type: 'comment' | 'submission'
    id: string
    userId: number
    userName: string | null
    userImage: string | null
    lessonOrder: number
    lessonTitle: string
    createdAt: string | Date
    content: string
    totalScore: number | null
}

function formatDateTime(date: string | Date) {
    return new Date(date).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function Avatar({ src, name }: { src: string | null; name: string | null }) {
    if (src) {
        return <Image src={src} alt={name || 'Avatar'} width={36} height={36} className="rounded-full object-cover shrink-0" />
    }
    return (
        <div className="w-9 h-9 rounded-full bg-violet-100 text-violet-600 font-black text-sm flex items-center justify-center shrink-0">
            {(name || '?').trim().charAt(0).toUpperCase()}
        </div>
    )
}

function FeedRow({ item }: { item: FeedItem }) {
    const isComment = item.type === 'comment'
    return (
        <div className="flex gap-3 p-3 bg-white border border-gray-100 rounded-xl">
            <Avatar src={item.userImage} name={item.userName} />
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                    <span className="font-bold text-gray-800">{item.userName || 'Thành viên'}</span>
                    <span className="text-gray-400">
                        {isComment ? 'đã bình luận trong' : 'đã nộp bài'}
                    </span>
                    <span className="font-semibold text-violet-600">Ngày {item.lessonOrder} — {item.lessonTitle}</span>
                    {!isComment && item.totalScore !== null && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 font-bold text-[10px]">{item.totalScore}/10đ</span>
                    )}
                </div>
                {item.content && (
                    <p className="text-[12px] text-gray-600 whitespace-pre-wrap mt-1 bg-gray-50 rounded-lg p-2">{item.content}</p>
                )}
                <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-1">
                    {isComment ? <MessageSquare className="w-3 h-3" /> : <FileCheck2 className="w-3 h-3" />}
                    {formatDateTime(item.createdAt)}
                </div>
            </div>
        </div>
    )
}

export default function CourseActivityFeedTab({ courseId }: { courseId: number }) {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [feed, setFeed] = useState<FeedItem[]>([])

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        getCourseActivityFeedAction(courseId).then(res => {
            if (cancelled) return
            if (res.success) setFeed((res.feed as FeedItem[]) || [])
            else setError(res.error || 'Có lỗi xảy ra khi tải nhật ký hoạt động')
            setLoading(false)
        })
        return () => { cancelled = true }
    }, [courseId])

    return (
        <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
                </div>
            ) : error ? (
                <div className="text-center text-gray-400 text-sm py-8">{error}</div>
            ) : feed.length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-8">Chưa có hoạt động nào</div>
            ) : (
                <div className="space-y-2">
                    {feed.map(item => <FeedRow key={item.id} item={item} />)}
                </div>
            )}
        </div>
    )
}
