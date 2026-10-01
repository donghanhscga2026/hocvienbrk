'use client'
import { useState } from 'react'
import { CRM_STAGES, CrmDetail, CrmStageValue, STAGE_LABELS, vietnamInputToIso } from '@/lib/crm/shared'

export default function CrmCareForm({ contact, busy, onSave, onCancel }: { contact: CrmDetail; busy: boolean; onSave: (command: Record<string, unknown>) => Promise<boolean>; onCancel: () => void }) {
  const [note, setNote] = useState(''); const [selected, setSelected] = useState(''); const [stage, setStage] = useState<CrmStageValue>('NEW')
  const [reason, setReason] = useState(''); const [title, setTitle] = useState(''); const [due, setDue] = useState('')
  const style = 'w-full min-h-11 rounded-xl border bg-white p-3 text-sm'
  const opportunity = contact.opportunities.find(o => String(o.id) === selected)
  return <form className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4" onSubmit={async e => {
    e.preventDefault(); await onSave({ action: 'care.update', contactId: contact.id, version: contact.version, note, opportunity: opportunity ? { id: opportunity.id, version: opportunity.version, stage, lostReason: stage === 'LOST' ? reason : '' } : null, task: title.trim() ? { title, dueAt: vietnamInputToIso(due) } : null })
  }}>
    <h3 className="font-bold">Cập nhật chăm sóc & bước tiếp theo</h3>
    <label className="block text-sm">Kết quả trao đổi / thông tin mới *<textarea autoFocus required maxLength={4000} rows={3} className={style} value={note} onChange={e => setNote(e.target.value)} /></label>
    <label className="block text-sm">Cơ hội cần chuyển bước<select className={style} value={selected} onChange={e => { setSelected(e.target.value); const item = contact.opportunities.find(o => String(o.id) === e.target.value); setStage(item?.stage || 'NEW'); setReason(item?.lostReason || '') }}><option value="">Chỉ ghi nhận chăm sóc, chưa chuyển cơ hội</option>{contact.opportunities.map(o => <option key={o.id} value={o.id}>{o.title} · {STAGE_LABELS[o.stage]}</option>)}</select></label>
    {!contact.opportunities.length && <p className="text-xs">Bạn có thể thêm cơ hội tư vấn trong hồ sơ khi cần.</p>}
    {opportunity && <label className="block text-sm">Bước tiếp theo<select className={style} value={stage} onChange={e => setStage(e.target.value as CrmStageValue)}>{CRM_STAGES.map(key => <option key={key} value={key}>{STAGE_LABELS[key]}</option>)}</select></label>}
    {opportunity && stage === 'LOST' && <label className="block text-sm">Lý do chưa thành công *<textarea required maxLength={1000} className={style} value={reason} onChange={e => setReason(e.target.value)} /></label>}
    <label className="block text-sm">Việc tiếp theo (không bắt buộc)<input maxLength={200} className={style} value={title} onChange={e => setTitle(e.target.value)} placeholder="Gọi lại, giải đáp, gửi lịch học…" /></label>
    {title.trim() && <label className="block text-sm">Ngày giờ hẹn (giờ Việt Nam) *<input required type="datetime-local" className={style} value={due} onChange={e => setDue(e.target.value)} /></label>}
    <p className="text-xs text-slate-600">Một lần lưu ghi nhận cả trao đổi, bước tư vấn và lịch hẹn. Các lịch hẹn cũ được giữ lại.</p>
    <div className="flex gap-2"><button disabled={busy} className="min-h-11 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-50">Lưu cập nhật</button><button disabled={busy} type="button" onClick={onCancel} className="min-h-11 rounded-xl border bg-white px-4 text-sm">Hủy</button></div>
  </form>
}
