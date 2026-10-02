'use client'

import { useEffect, useEffectEvent, useRef, useState } from 'react'

type Result = { enabled: boolean; created?: number; hasMore?: boolean; token?: string;
  counts?: { eligible: number; existing: number; missing: number };
  rows?: { userId: number; teacherId: number; name: string; teacherName: string; courses: number }[] }
async function students(action: string, token?: string): Promise<Result> {
  const response = await fetch('/api/crm/students', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...(token ? { token } : {}) }) })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Không đồng bộ được học viên.')
  return data
}
const button = 'min-h-11 rounded-xl border bg-white px-4 py-2 text-sm disabled:opacity-50'
export default function CrmStudents({ actorId, isAdmin, onChanged }: { actorId: number; isAdmin: boolean; onChanged: () => void }) {
  const changed = useRef(onChanged)
  useEffect(() => { changed.current = onChanged }, [onChanged])
  const running = useRef(false)
  const [busy, setBusy] = useState(false); const [enabled, setEnabled] = useState(false)
  const [preview, setPreview] = useState<Result | null>(null)
  const [notice, setNotice] = useState(''); const [error, setError] = useState('')
  // Tải lại CRM sẽ lấy học viên mới; từng yêu cầu chỉ tạo tối đa 100 hồ sơ.
  const synchronize = async () => {
    let created = 0; let more = false
    for (let batch = 0; batch < 50; batch++) {
      const result = await students('sync'); setEnabled(result.enabled)
      created += result.created || 0; more = !!result.hasMore
      if (result.created) changed.current()
      if (!more) break
    }
    setNotice(created ? 'Đã bổ sung ' + created + ' hồ sơ học viên.' + (more ? ' Bấm cập nhật để lấy phần còn lại.' : '') : 'Danh sách học viên đã được cập nhật.')
  }
  const run = async (work: () => Promise<void>) => {
    if (running.current) return
    running.current = true; setBusy(true); setError(''); setNotice('')
    try { await work() } catch (e) { setError(e instanceof Error ? e.message : 'Không đồng bộ được.') }
    finally { running.current = false; setBusy(false) }
  }
  const initialize = useEffectEvent(() => { void run(synchronize) })
  useEffect(() => {
    const timer = setTimeout(() => initialize(), 0)
    return () => clearTimeout(timer)
  }, [actorId])
  return <section className="space-y-3 rounded-2xl border bg-white p-4">
    <h2 className="font-semibold">Học viên theo giáo viên</h2>
    <p className="text-sm text-slate-600">{enabled ? 'Đang bật: học viên đăng ký khóa của giáo viên nào được đưa vào CRM của giáo viên đó khi mở hoặc tải lại CRM.' : 'Chưa bật đồng bộ. Quản trị viên cần xem trước và xác nhận lần đầu.'}</p>
    <p className="text-xs text-slate-500">Bao gồm đăng ký chờ thanh toán và đã kích hoạt. Mỗi giáo viên có ghi chú, lịch hẹn riêng. Khách chỉ tạo tài khoản chưa được đưa vào danh sách.</p>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {notice && enabled && <p role="status" className="text-sm text-emerald-800">{notice}</p>}
    <div className="flex flex-wrap gap-2">
      {enabled && <button disabled={busy} className={button} onClick={() => void run(synchronize)}>Cập nhật học viên</button>}
      {isAdmin && <button disabled={busy} className={button} onClick={() => void run(async () => { const data = await students('preview'); setPreview(data); setEnabled(data.enabled) })}>Xem trước đồng bộ học viên</button>}
      {isAdmin && enabled && <button disabled={busy} className={button} onClick={() => void run(async () => { await students('disable'); setEnabled(false); setPreview(null) })}>Tạm dừng đồng bộ</button>}
    </div>
    {preview?.counts && <div className="space-y-3 rounded-xl bg-slate-50 p-3 text-sm">
      <p>{preview.counts.eligible} cặp học viên–giáo viên · Đã có {preview.counts.existing} · Cần bổ sung {preview.counts.missing}.</p>
      <p>Xem trước tối đa 100 hồ sơ đầu. Dữ liệu hiện có được giữ nguyên; hồ sơ đã lưu trữ không tự mở lại.</p>
      <div className="max-h-64 space-y-2 overflow-y-auto">{preview.rows?.map(row => <p key={row.teacherId + ':' + row.userId}>{row.name} (#{row.userId}) → {row.teacherName} (#{row.teacherId}) · {row.courses} khóa</p>)}</div>
      <button disabled={busy || !preview.token} className={button} onClick={() => void run(async () => { const result = await students('enable', preview.token); setEnabled(true); setPreview(null); if (result.created) changed.current(); await synchronize() })}>Xác nhận bật và đồng bộ theo danh sách này</button>
    </div>}
    {busy && <p role="status" className="text-sm">Đang kiểm tra và đồng bộ…</p>}
  </section>
}
