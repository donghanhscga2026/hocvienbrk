import type { RosterMember, CourseMemberLabels } from '@/components/course/MemberRosterPanel'
import { teamLabel, groupLabel, formatStartDate } from '@/components/course/MemberRosterPanel'

/** Tải bảng học viên ở định dạng CSV UTF-8 (mở trực tiếp bằng Microsoft Excel). */
export function downloadRosterCsv(courseName: string, members: RosterMember[], labels: CourseMemberLabels, includePhone = false) {
    if (typeof document === 'undefined' || members.length === 0) return
    const safeCell = (input: unknown) => {
        const value = String(input ?? '')
        // Chặn Excel coi dữ liệu do học viên nhập là công thức.
        const escaped = /^[\s]*[=+@\-]/.test(value) ? "'" + value : value
        return '"' + escaped.replace(/"/g, '""') + '"'
    }
    const headers = ['STT', 'Họ tên', 'Mã học viên', 'Vai trò', 'Team', 'Group', 'Ngày bắt đầu', 'Tiến độ (%)', ...(includePhone ? ['Số điện thoại'] : [])]
    const sorted = [...members].sort((a, b) => a.team - b.team || (a.memberRole === b.memberRole ? 0 : a.memberRole === 'PS' ? -1 : 1) || a.group - b.group || a.id - b.id)
    const records = sorted.map((m, i) => [
        i + 1, m.user.name || '', m.user.id, m.memberRole, teamLabel(m.team, labels),
        m.memberRole === 'PS' ? '' : groupLabel(m.team, m.group, labels),
        formatStartDate(m.startDate), m.completionPercent ?? '',
        ...(includePhone ? [m.user.phone || ''] : []),
    ])
    const csv = '\uFEFF' + [headers, ...records].map(row => row.map(safeCell).join(',')).join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `danh-sach-hoc-vien-${courseName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase() || 'khoa-hoc'}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
}
