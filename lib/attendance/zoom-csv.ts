/**
 * Phân tích file CSV báo cáo người tham dự của Zoom — logic thuần, không
 * chạm DB. GĐ1, kế hoạch nâng cấp từ WIPA OS (23/10/2026).
 *
 * Hỗ trợ các biến thể Zoom thường gặp:
 * - File "participants" xuất từ Zoom (có thể có vài dòng thông tin buổi
 *   họp ở trên trước khi tới bảng người tham dự thật).
 * - Cột: Name (Original Name) / User Email / Join Time / Leave Time /
 *   Duration (Minutes). Thời lượng cũng có thể dạng "1:23:45".
 * Một người vào/ra nhiều lần (nhiều dòng) → cộng dồn thời lượng.
 */

export interface ZoomAttendeeRow {
    name: string
    email: string
    minutes: number
    joinTime: string | null
}

export interface ParseResult {
    rows: ZoomAttendeeRow[]
    warnings: string[]
}

/** Tách CSV có hỗ trợ ô trong ngoặc kép và dấu phẩy trong ô. */
export function splitCsv(text: string): string[][] {
    const clean = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text
    const rows: string[][] = []
    let row: string[] = []
    let cell = ''
    let inQuotes = false
    const pushCell = () => { row.push(cell); cell = '' }
    const pushRow = () => { pushCell(); rows.push(row); row = [] }
    for (let i = 0; i < clean.length; i++) {
        const ch = clean[i]
        if (inQuotes) {
            if (ch === '"') {
                if (clean[i + 1] === '"') { cell += '"'; i++ }
                else inQuotes = false
            } else cell += ch
        } else if (ch === '"') {
            inQuotes = true
        } else if (ch === ',') {
            pushCell()
        } else if (ch === '\n') {
            pushRow()
        } else if (ch !== '\r') {
            cell += ch
        }
    }
    if (cell !== '' || row.length > 0) pushRow()
    return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

function parseDurationToMinutes(raw: string): number {
    const value = (raw ?? '').trim()
    if (!value) return 0
    if (value.includes(':')) {
        const parts = value.split(':').map((p) => Number(p) || 0)
        if (parts.length === 3) return Math.round(parts[0] * 60 + parts[1] + parts[2] / 60)
        if (parts.length === 2) return Math.round(parts[0] + parts[1] / 60)
        return 0
    }
    const n = Number(value.replace(/[^0-9.]/g, ''))
    return Number.isFinite(n) ? Math.round(n) : 0
}

interface ColumnMap { name: number; email: number; duration: number; join: number }

function detectColumns(header: string[]): ColumnMap | null {
    const lower = header.map((h) => h.trim().toLowerCase())
    const email = lower.findIndex((h) => h.includes('email') || h.includes('e-mail'))
    const name = lower.findIndex((h) => h.includes('name'))
    const duration = lower.findIndex((h) => h.includes('duration'))
    const join = lower.findIndex((h) => h.includes('join'))
    if (email < 0 || name < 0) return null
    return { name, email, duration, join }
}

export function parseZoomCsv(text: string): ParseResult {
    const warnings: string[] = []
    const grid = splitCsv(text)
    if (grid.length === 0) return { rows: [], warnings: ['File rỗng hoặc không đọc được.'] }

    let headerIdx = -1
    let cols: ColumnMap | null = null
    for (let i = 0; i < Math.min(grid.length, 25); i++) {
        const detected = detectColumns(grid[i])
        if (detected) { headerIdx = i; cols = detected; break }
    }
    if (!cols || headerIdx < 0) {
        return { rows: [], warnings: ['Không tìm thấy dòng tiêu đề có cột Tên và Email — file có đúng là báo cáo người tham dự của Zoom (CSV) không?'] }
    }
    if (cols.duration < 0) warnings.push('File không có cột thời lượng (Duration) — thời lượng tham dự sẽ ghi 0 phút.')

    const byKey = new Map<string, ZoomAttendeeRow>()
    for (let i = headerIdx + 1; i < grid.length; i++) {
        const cells = grid[i]
        const name = (cells[cols.name] ?? '').trim()
        const email = (cells[cols.email] ?? '').trim().toLowerCase()
        if (!name && !email) continue
        const minutes = cols.duration >= 0 ? parseDurationToMinutes(cells[cols.duration] ?? '') : 0
        const joinTime = cols.join >= 0 ? (cells[cols.join] ?? '').trim() || null : null
        const key = email || `name:${name.toLowerCase()}`
        const existing = byKey.get(key)
        if (existing) {
            existing.minutes += minutes
            if (!existing.joinTime && joinTime) existing.joinTime = joinTime
        } else {
            byKey.set(key, { name, email, minutes, joinTime })
        }
    }
    const rows = [...byKey.values()]
    if (rows.length === 0) warnings.push('Không có dòng người tham dự nào sau dòng tiêu đề.')
    return { rows, warnings }
}

/** Bỏ dấu tiếng Việt + thường hóa để so khớp tên khi email không khớp. */
export function normalizeName(name: string): string {
    return name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'D')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
}

export interface StudentRef { userId: number; name: string | null; email: string }

export interface MatchResult {
    matched: { userId: number; minutes: number; via: 'email' | 'name'; zoomName: string; zoomEmail: string }[]
    unmatched: ZoomAttendeeRow[]
    absentUserIds: number[]
}

export function matchAttendees(rows: ZoomAttendeeRow[], students: StudentRef[]): MatchResult {
    const byEmail = new Map<string, StudentRef>()
    const byName = new Map<string, StudentRef[]>()
    for (const s of students) {
        if (s.email) byEmail.set(s.email.trim().toLowerCase(), s)
        if (s.name) {
            const key = normalizeName(s.name)
            byName.set(key, [...(byName.get(key) ?? []), s])
        }
    }
    const matched: MatchResult['matched'] = []
    const unmatched: ZoomAttendeeRow[] = []
    const matchedIds = new Set<number>()
    for (const row of rows) {
        let student: StudentRef | undefined
        let via: 'email' | 'name' = 'email'
        if (row.email) student = byEmail.get(row.email.trim().toLowerCase())
        if (!student && row.name) {
            const candidates = byName.get(normalizeName(row.name)) ?? []
            if (candidates.length === 1) { student = candidates[0]; via = 'name' }
        }
        if (student && !matchedIds.has(student.userId)) {
            matchedIds.add(student.userId)
            matched.push({ userId: student.userId, minutes: row.minutes, via, zoomName: row.name, zoomEmail: row.email })
        } else if (!student) {
            unmatched.push(row)
        }
    }
    const absentUserIds = students.filter((s) => !matchedIds.has(s.userId)).map((s) => s.userId)
    return { matched, unmatched, absentUserIds }
}
