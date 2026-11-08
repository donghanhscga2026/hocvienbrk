// Tiện ích dùng chung cho việc gom khóa học theo kỳ (K01, K02, ...).
// Các kỳ của cùng một khóa học có cùng giảng viên và cùng "Tên khóa học chung"
// (trường name_lop); tên riêng của từng kỳ nằm ở name_khoa, thường kết thúc
// bằng "K02". Không có trạng thái "kỳ" riêng trong cơ sở dữ liệu — mọi tính
// năng gom kỳ đều suy ra từ hai trường tên này.

export interface CohortLink {
    slug: string
    label: string
    dateJoin: string | null
    current: boolean
}

/** Số kỳ đọc từ cuối tên kỳ (ưu tiên) hoặc cuối mã khóa; không đọc được thì xếp cuối. */
export function cohortNumberOf(course: { name_khoa?: string | null; id_khoa?: string | null }): number {
    const fromName = String(course.name_khoa || '').match(/K(\d+)\s*$/i)
    if (fromName) return parseInt(fromName[1], 10)
    const fromCode = String(course.id_khoa || '').match(/K(\d+)\s*$/i)
    return fromCode ? parseInt(fromCode[1], 10) : Number.MAX_SAFE_INTEGER
}

export interface OwnedCohort {
    slug: string
    label: string
    pending: boolean
}

/**
 * Chọn kỳ mà người xem đã có quyền trong các kỳ KHÔNG phải kỳ đại diện:
 * ưu tiên kỳ đang học (ACTIVE) hơn kỳ chờ kích hoạt (PENDING), cùng mức thì
 * lấy kỳ mới nhất. Trả null khi người xem chưa có kỳ nào khác ngoài kỳ đại diện.
 */
export function ownedCohortOf(
    members: { id: number; id_khoa?: string | null; name_khoa?: string | null; name_lop?: string | null }[],
    representativeId: number,
    ownedStatusByCourseId: Map<number, string>,
): OwnedCohort | null {
    const rank = (status: string) => status === 'ACTIVE' ? 0 : status === 'PENDING' ? 1 : 2
    const candidates = members
        .filter(m => m.id !== representativeId)
        .map(m => ({ member: m, status: ownedStatusByCourseId.get(m.id) }))
        .filter((c): c is { member: (typeof members)[number]; status: string } => c.status != null && rank(c.status) < 2)
        .sort((a, b) => rank(a.status) - rank(b.status) || cohortNumberOf(b.member) - cohortNumberOf(a.member))
    const first = candidates[0]
    if (!first || !first.member.id_khoa) return null
    return { slug: first.member.id_khoa, label: cohortShortLabel(first.member), pending: first.status === 'PENDING' }
}

/** Nhãn ngắn của một kỳ, ví dụ "K02"; không có số kỳ thì dùng nguyên tên kỳ/tên khóa. */
export function cohortShortLabel(course: { name_khoa?: string | null; name_lop?: string | null }): string {
    const name = (course.name_khoa || '').trim()
    const token = name.match(/K\d+\s*$/i)
    if (token) return token[0].replace(/\s+/g, '').toUpperCase()
    return name || (course.name_lop || '').trim()
}
