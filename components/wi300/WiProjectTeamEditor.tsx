'use client'
import { useState } from 'react'
import type { WiProject } from '@/lib/wi300/projects'

export default function WiProjectTeamEditor({ members, names, editable }: { members: NonNullable<WiProject['members']>; names: Record<string, string>; editable: boolean }) {
  const [rows, setRows] = useState(members.map(member => ({ ...member, userId: String(member.userId) })))
  function change(index: number, patch: Partial<typeof rows[number]>) {
    setRows(current => current.map((row, position) => position === index ? { ...row, ...patch } : row))
  }
  const field = 'mt-1 min-h-11 w-full rounded-xl border border-brk-outline px-3 py-2'
  return <section className="space-y-4"><h3 className="font-bold">Đội ngũ dự án</h3><p className="text-sm text-brk-muted">Quyền hỗ trợ quản lý cho phép sửa nội dung và gắn khóa học. Chỉ chủ dự án hoặc quản trị viên được đổi đội ngũ và cấp quyền.</p>
    {editable && <input type="hidden" name="members" value={JSON.stringify(rows.map(row => ({ ...row, userId: row.userId === '' ? -1 : Number(row.userId) })))} />}
    {rows.map((row, index) => <div key={index} className="space-y-3 rounded-xl border border-brk-outline p-4">
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Mã thành viên<input aria-label={`Mã thành viên ${index + 1}`} type="number" min={0} required value={row.userId} disabled={!editable} onChange={event => change(index, { userId: event.target.value })} className={field} />{names[row.userId] && <span className="text-xs text-brk-muted">{names[row.userId]}</span>}</label><label className="text-sm">Chức danh<input maxLength={100} value={row.title} disabled={!editable} onChange={event => change(index, { title: event.target.value })} className={field} /></label></div>
      <div className="flex flex-wrap gap-4"><label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={row.visible} disabled={!editable} onChange={event => change(index, { visible: event.target.checked })} />Hiện trong đội ngũ</label><label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={row.canManage} disabled={!editable} onChange={event => change(index, { canManage: event.target.checked })} />Hỗ trợ quản lý</label>{editable && <button type="button" onClick={() => setRows(current => current.filter((_, position) => position !== index))} className="min-h-11 text-red-700">Gỡ thành viên</button>}</div>
    </div>)}
    {!rows.length && <p className="text-sm text-brk-muted">Chưa có thành viên trong đội ngũ.</p>}
    {editable && <button type="button" disabled={rows.length >= 50} onClick={() => setRows(current => [...current, { userId: '', title: '', visible: true, canManage: false }])} className="min-h-11 rounded-xl border border-brk-outline px-4">+ Thêm thành viên</button>}
  </section>
}
