'use client'
import { CrmContactView, STAGE_LABELS, formatCrmDate } from '@/lib/crm/shared'

const enrollmentLabels: Record<string, string> = { PENDING: 'Chờ duyệt', ACTIVE: 'Đang học', REJECTED: 'Chưa được duyệt', CANCELLED: 'Đã hủy' }
export function CrmLearning({ contact }: { contact: CrmContactView }) {
  return contact.learning?.length ? <div className="space-y-3">{contact.learning.map(course => <div key={course.courseId}>
    <a href={'/khoa-hoc/' + encodeURIComponent(course.slug)} className="font-medium text-emerald-800 underline">{course.title}</a><p className="mt-1 text-xs">{enrollmentLabels[course.status] || course.status} · {course.total ? course.completed + '/' + course.total + ' bài hoàn thành (' + Math.round(course.completed / course.total * 100) + '%)' : 'Chưa có bài học'}</p>
    {course.lastActivityAt && <p className="mt-1 text-xs text-slate-500">Gần nhất: {course.lastLesson} · {formatCrmDate(course.lastActivityAt)}</p>}
  </div>)}</div> : <p className="text-xs text-slate-500">Chưa có khóa liên kết trong phạm vi phụ trách.</p>
}
// Danh sách chỉ hiển thị hai khóa đầu; hồ sơ giữ đầy đủ các khóa và hoạt động.
function LearningSummary({ contact }: { contact: CrmContactView }) {
  const courses = contact.learning || []
  if (!courses.length) return <p className="text-xs text-slate-500">Chưa có khóa học liên kết</p>
  return <div className="space-y-3">{courses.slice(0, 2).map(course => {
    const percent = course.total ? Math.min(100, Math.round(course.completed / course.total * 100)) : 0
    return <div key={course.courseId} className="space-y-1">
      <a title={course.title} href={'/khoa-hoc/' + encodeURIComponent(course.slug)} className="line-clamp-2 text-sm font-medium text-emerald-800 hover:underline">{course.title}</a>
      <p className="text-xs text-slate-500">{enrollmentLabels[course.status] || course.status}</p>
      {course.total > 0 ? <><div role="progressbar" aria-label={'Tiến độ ' + course.title} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: percent + '%' }} /></div><p className="text-xs text-slate-600">{course.completed}/{course.total} bài · {percent}%</p></> : <p className="text-xs text-slate-500">Chưa có bài học</p>}
    </div>
  })}{courses.length > 2 && <p className="text-xs text-slate-500">+{courses.length - 2} khóa khác trong hồ sơ</p>}</div>
}

export default function CrmContactList({ contacts, now, onOpen, onEdit, onCare, onRequests }: {
  contacts: CrmContactView[]; now: number; onOpen: (id: number) => void; onEdit: (id: number) => void; onCare: (id: number) => void; onRequests: (id: number) => void;
}) {
  const action = 'min-h-11 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs hover:bg-slate-50'
  return <div className="overflow-hidden rounded-2xl border bg-white">
    <table className="block w-full table-fixed text-left text-sm xl:table">
      <caption className="sr-only">Hồ sơ, học tập, việc cần xử lý và lịch chăm sóc tiếp theo</caption>
      <thead className="hidden bg-slate-50 text-xs text-slate-600 xl:table-header-group"><tr>{['Khách hàng / Học viên', 'Khóa học & tiến độ', 'Cần xử lý', 'Việc tiếp theo', 'Thao tác'].map(label => <th key={label} scope="col" className="p-3">{label}</th>)}</tr></thead>
      <tbody className="block divide-y xl:table-row-group">{contacts.map(contact => {
        const task = contact.tasks[0]
        // dueAt là thời điểm ISO UTC; so sánh trực tiếp, chỉ đổi múi giờ khi hiển thị.
        const overdue = !!task && new Date(task.dueAt).getTime() < now
        const pending = contact.pendingRequests || 0
        const student = !!contact.studentProfile || !!contact.learning?.length
        return <tr key={contact.id} className="grid gap-4 p-4 sm:grid-cols-2 xl:table-row xl:p-0">
          <td className="block min-w-0 align-top xl:table-cell xl:p-3">
            <span className={'mb-2 inline-block rounded-full px-2 py-1 text-xs ' + (student ? 'bg-blue-50 text-blue-800' : 'bg-slate-100 text-slate-600')}>{student ? 'Học viên' : 'Khách hàng'}</span>
            <button className="block break-words text-left font-semibold text-emerald-800 hover:underline" onClick={() => onOpen(contact.id)}>{contact.name}</button>
            <p className="mt-1 break-all text-xs text-slate-600">{contact.phone || contact.email}</p>
            <p className="mt-2 break-words text-xs text-slate-500">Phụ trách: {contact.owner?.name || contact.owner?.email || 'Chưa phân công'}</p>
            {contact.tags.length > 0 && <p className="mt-1 break-words text-xs text-slate-500">{contact.tags.slice(0, 2).join(' · ')}{contact.tags.length > 2 && ' · +' + (contact.tags.length - 2)}</p>}
          </td>
          <td className="block min-w-0 align-top xl:table-cell xl:p-3"><span className="mb-2 block text-xs font-semibold text-slate-500 xl:hidden">Khóa học & tiến độ</span><LearningSummary contact={contact} /></td>
          <td className="block min-w-0 space-y-3 align-top xl:table-cell xl:p-3">
            <span className="block text-xs font-semibold text-slate-500 xl:hidden">Cần xử lý</span>
            {pending > 0 ? <button className="min-h-11 rounded-lg bg-amber-50 px-3 py-2 text-left text-xs font-semibold text-amber-900 hover:bg-amber-100" onClick={() => onRequests(contact.id)}>{pending} yêu cầu chờ xử lý</button> : <p className="text-xs text-slate-400">Không có yêu cầu chờ</p>}
            {contact.opportunities.length > 0 && <div className="space-y-2"><p className="text-xs text-slate-500">Tư vấn</p>{contact.opportunities.slice(0, 2).map(o => <div key={o.id}><span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800">{STAGE_LABELS[o.stage]}</span><p title={o.title} className="mt-1 line-clamp-2 text-xs text-slate-600">{o.title}</p></div>)}{contact.opportunities.length > 2 && <p className="text-xs text-slate-500">+{contact.opportunities.length - 2} cơ hội trong hồ sơ</p>}</div>}
          </td>
          <td className="block min-w-0 align-top xl:table-cell xl:p-3">
            <span className="mb-2 block text-xs font-semibold text-slate-500 xl:hidden">Việc tiếp theo</span>
            {task ? <div className={'space-y-1 rounded-lg p-2 ' + (overdue ? 'bg-red-50 text-red-800' : 'bg-slate-50 text-slate-700')}><p className="break-words text-sm font-medium">{task.title}</p><p className="text-xs">{formatCrmDate(task.dueAt)}</p>{overdue && <p className="text-xs font-semibold">Đã quá hạn</p>}</div> : <p className="text-xs text-slate-400">Chưa có lịch chăm sóc</p>}
          </td>
          <td className="block align-top sm:col-span-2 xl:table-cell xl:p-3"><div className="flex flex-wrap gap-2"><button className={action} onClick={() => onOpen(contact.id)}>Xem hồ sơ</button><button className={action} onClick={() => onEdit(contact.id)}>Sửa</button><button disabled={contact.archived} className={action + ' border-emerald-200 text-emerald-800 disabled:opacity-50'} onClick={() => onCare(contact.id)}>Cập nhật chăm sóc</button></div></td>
        </tr>
      })}</tbody>
    </table>
  </div>
}
