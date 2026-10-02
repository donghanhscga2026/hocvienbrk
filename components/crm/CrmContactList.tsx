'use client'
import { CrmContactView, STAGE_LABELS, formatCrmDate } from '@/lib/crm/shared'

const enrollmentLabels: Record<string, string> = { PENDING: 'Chờ duyệt', ACTIVE: 'Đang học', REJECTED: 'Chưa được duyệt', CANCELLED: 'Đã hủy' }
export function CrmLearning({ contact }: { contact: CrmContactView }) {
  return contact.learning?.length ? <div className="space-y-3">{contact.learning.map(course => <div key={course.courseId}>
    <a href={'/khoa-hoc/' + encodeURIComponent(course.slug)} className="font-medium text-emerald-800 underline">{course.title}</a><p className="mt-1 text-xs">{enrollmentLabels[course.status] || course.status} · {course.total ? course.completed + '/' + course.total + ' bài hoàn thành (' + Math.round(course.completed / course.total * 100) + '%)' : 'Chưa có bài học'}</p>
    {course.lastActivityAt && <p className="mt-1 text-xs text-slate-500">Gần nhất: {course.lastLesson} · {formatCrmDate(course.lastActivityAt)}</p>}
  </div>)}</div> : <p className="text-xs text-slate-500">Chưa có khóa liên kết trong phạm vi phụ trách.</p>
}
export default function CrmContactList({ contacts, onOpen, onEdit, onCare, onRequests }: { contacts: CrmContactView[]; onOpen: (id: number) => void; onEdit: (id: number) => void; onCare: (id: number) => void; onRequests: (id: number) => void }) {
  const action = 'min-h-11 rounded-lg border bg-white px-3 text-xs hover:bg-slate-50'
  return <div className="overflow-hidden rounded-2xl border bg-white"><table className="block w-full text-left text-sm lg:table"><caption className="sr-only">Khách hàng, khóa học, tiến độ và việc cần làm tiếp theo</caption><thead className="hidden bg-slate-50 text-xs text-slate-600 lg:table-header-group"><tr>{['Học viên / khách hàng', 'Khóa học & tiến độ', 'Yêu cầu', 'Bước tư vấn', 'Việc tiếp theo', 'Thao tác'].map(label => <th key={label} scope="col" className="p-3">{label}</th>)}</tr></thead><tbody className="block divide-y lg:table-row-group">{contacts.map(contact => <tr key={contact.id} className="grid gap-3 p-4 lg:table-row lg:p-0">
    <td className="block min-w-0 align-top lg:table-cell lg:p-3"><button className="text-left font-semibold text-emerald-800 underline" onClick={() => onOpen(contact.id)}>{contact.name}</button><p className="mt-1 break-all text-xs">{contact.phone || contact.email}</p><p className="mt-1 text-xs text-slate-500">{contact.owner?.name || 'Chưa phân công'} · {contact.source}</p>{contact.tags.length > 0 && <p className="mt-1 text-xs text-slate-500">{contact.tags.join(', ')}</p>}</td>
    <td className="block align-top lg:table-cell lg:p-3"><span className="mb-1 block font-medium lg:hidden">Khóa học & tiến độ</span><CrmLearning contact={contact} /></td>
    <td className="block align-top lg:table-cell lg:p-3"><button className={action} onClick={() => onRequests(contact.id)}>{contact.pendingRequests || 0} yêu cầu chờ xử lý</button></td>
    <td className="block align-top lg:table-cell lg:p-3"><span className="mb-1 block font-medium lg:hidden">Bước tư vấn</span>{contact.opportunities.length ? contact.opportunities.map(o => <p key={o.id} className="mb-2 text-xs">{o.title}: <strong>{STAGE_LABELS[o.stage]}</strong></p>) : <p className="text-xs text-slate-500">Chưa có cơ hội tư vấn</p>}</td>
    <td className="block align-top lg:table-cell lg:p-3"><span className="mb-1 block font-medium lg:hidden">Việc tiếp theo</span>{contact.tasks[0] ? <><p className="text-xs">{contact.tasks[0].title}</p><p className="mt-1 text-xs text-slate-500">{formatCrmDate(contact.tasks[0].dueAt)}</p></> : <p className="text-xs text-slate-500">Chưa có lịch hẹn</p>}</td>
    <td className="block align-top lg:table-cell lg:p-3"><div className="flex flex-wrap gap-2"><button className={action} onClick={() => onEdit(contact.id)}>Sửa</button><button disabled={contact.archived} className={action + ' disabled:opacity-50'} onClick={() => onCare(contact.id)}>Cập nhật chăm sóc</button></div></td>
  </tr>)}</tbody></table></div>
}
