'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createRace, setRaceStatus, enrollRaceFromCourse, syncRaceAction, decideLeave } from '@/app/actions/race-actions'

export function CreateRaceForm({ courses }: { courses: { id: number; label: string }[] }) {
    const router = useRouter()
    const [name, setName] = useState('')
    const [courseId, setCourseId] = useState('')
    const [startsAt, setStartsAt] = useState('')
    const [endsAt, setEndsAt] = useState('')
    const [busy, setBusy] = useState(false)
    const [msg, setMsg] = useState<string | null>(null)

    async function onCreate() {
        setBusy(true); setMsg(null)
        const res = await createRace({ name, courseId: courseId ? Number(courseId) : null, startsAt, endsAt })
        setBusy(false)
        if (!res.ok) { setMsg(res.error ?? 'Không tạo được.'); return }
        setMsg('Đã tạo cuộc đua (đang ở trạng thái Nháp).')
        router.refresh()
    }

    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="font-bold text-gray-900">Tạo cuộc đua mới</h2>
            <div className="grid md:grid-cols-4 gap-3 mt-3">
                <label className="block md:col-span-2">
                    <span className="block text-xs font-medium text-gray-500 mb-1">Tên cuộc đua</span>
                    <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Ví dụ: Cuộc đua tăng tốc tháng 11" />
                </label>
                <label className="block">
                    <span className="block text-xs font-medium text-gray-500 mb-1">Gắn với khóa (để lấy danh sách học viên)</span>
                    <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                        <option value="">Không gắn khóa</option>
                        {courses.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                </label>
                <label className="block">
                    <span className="block text-xs font-medium text-gray-500 mb-1">Bắt đầu / Kết thúc</span>
                    <span className="flex gap-2">
                        <input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm" />
                        <input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm" />
                    </span>
                </label>
            </div>
            <div className="flex items-center gap-3 mt-3">
                <button type="button" disabled={busy} onClick={onCreate} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                    {busy ? 'Đang tạo...' : 'Tạo cuộc đua'}
                </button>
                {msg && <span className="text-sm text-gray-500">{msg}</span>}
            </div>
        </div>
    )
}

export function RaceControls({ raceId, status, hasCourse }: { raceId: number; status: string; hasCourse: boolean }) {
    const router = useRouter()
    const [busy, setBusy] = useState(false)
    const [msg, setMsg] = useState<string | null>(null)

    async function run(fn: () => Promise<{ ok: boolean; error?: string; added?: number; members?: number }>, okMsg: (r: { added?: number; members?: number }) => string) {
        setBusy(true); setMsg(null)
        const res = await fn()
        setBusy(false)
        if (!res.ok) { setMsg(res.error ?? 'Thao tác thất bại.'); return }
        setMsg(okMsg(res))
        router.refresh()
    }

    return (
        <span className="inline-flex flex-wrap items-center gap-2">
            {hasCourse && (
                <button type="button" disabled={busy} onClick={() => run(() => enrollRaceFromCourse(raceId), (r) => `Đã thêm ${r.added ?? 0} học viên từ khóa.`)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium disabled:opacity-50">
                    Thêm học viên từ khóa
                </button>
            )}
            <button type="button" disabled={busy} onClick={() => run(() => syncRaceAction(raceId), (r) => `Đã tính lại điểm cho ${r.members ?? 0} thành viên.`)} className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                Tính lại điểm
            </button>
            {status === 'DRAFT' && (
                <button type="button" disabled={busy} onClick={() => run(() => setRaceStatus(raceId, 'ACTIVE'), () => 'Đã mở cuộc đua.')} className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Mở cuộc đua</button>
            )}
            {status === 'ACTIVE' && (
                <button type="button" disabled={busy} onClick={() => run(() => setRaceStatus(raceId, 'FINISHED'), () => 'Đã kết thúc cuộc đua.')} className="rounded-lg bg-gray-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Kết thúc</button>
            )}
            {msg && <span className="text-xs text-gray-500">{msg}</span>}
        </span>
    )
}

export function LeaveDecision({ leaveId }: { leaveId: number }) {
    const router = useRouter()
    const [busy, setBusy] = useState(false)
    async function decide(approve: boolean) {
        setBusy(true)
        await decideLeave(leaveId, approve)
        setBusy(false)
        router.refresh()
    }
    return (
        <span className="inline-flex gap-2">
            <button type="button" disabled={busy} onClick={() => decide(true)} className="rounded-lg bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50">Duyệt</button>
            <button type="button" disabled={busy} onClick={() => decide(false)} className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-medium disabled:opacity-50">Từ chối</button>
        </span>
    )
}
