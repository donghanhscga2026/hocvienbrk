'use client'

import { useEffect, useState } from 'react'
import { Loader2, X, Users } from 'lucide-react'
import { getCourseMemberRosterAction } from '@/app/actions/admin-actions'
import MemberRosterPanel, { RosterMember, CourseMemberLabels } from './MemberRosterPanel'

export default function MemberRosterModal({ courseId, courseName, onClose }: {
    courseId: number
    courseName: string
    onClose: () => void
}) {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [members, setMembers] = useState<RosterMember[]>([])
    const [labels, setLabels] = useState<CourseMemberLabels>({})
    const [canViewPhone, setCanViewPhone] = useState(false)

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        getCourseMemberRosterAction(courseId).then(res => {
            if (cancelled) return
            if (res.success) {
                setMembers((res.members as any[]) || [])
                setLabels((res.labels as CourseMemberLabels) || {})
                setCanViewPhone(!!res.canViewPhone)
            } else {
                setError(res.error || 'Có lỗi xảy ra khi tải danh sách thành viên')
            }
            setLoading(false)
        })
        return () => { cancelled = true }
    }, [courseId])

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white w-[95vw] h-[85vh] max-w-[1600px] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white shrink-0">
                    <h2 className="font-bold text-sm flex items-center gap-2">
                        <Users className="w-4 h-4" /> Thành viên — {courseName}
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/20">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {loading ? (
                    <div className="flex-1 flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                    </div>
                ) : error ? (
                    <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">{error}</div>
                ) : (
                    <MemberRosterPanel members={members} labels={labels} canViewPhone={canViewPhone} courseName={courseName} />
                )}
            </div>
        </div>
    )
}
