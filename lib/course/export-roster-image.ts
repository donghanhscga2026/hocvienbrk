import { toVnMidnightUTC } from './deadline'

export type DayStatus = 'missing' | 'late' | 'onTime'

export type RosterExportRow = {
    stt: number
    name: string
    code: number
    teamText: string
    groupText: string
    isPS: boolean
    /** Ngày bắt đầu học riêng của người này — dùng để quy đổi mỗi cột ngày lịch
     *  chung của bảng thành "ngày học thứ mấy" của riêng họ. */
    startDate: string | Date
    days: { order: number; status: DayStatus }[]
}

const STATUS_COLOR: Record<DayStatus, string> = {
    onTime: '#10b981',
    late: '#a855f7',
    missing: '#ef4444',
}

const DAY_MS = 86400000
// Mỗi lớp có người bắt đầu cách nhau nhiều ngày thì bảng có thể rất nhiều cột
// — giới hạn tối đa số cột/ảnh để dễ theo dõi, vượt quá thì tách thành nhiều
// ảnh (mỗi ảnh 1 khoảng ngày liên tiếp, tính từ ngày bắt đầu sớm nhất lớp).
const MAX_COLS_PER_IMAGE = 15

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
}

function slugify(text: string) {
    return text
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/đ/gi, 'd')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'khoa-hoc'
}

function chunk<T>(arr: T[], size: number): T[][] {
    const out: T[][] = []
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
    return out
}

function formatDDMM(mid: number) {
    return new Date(mid).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
}

/**
 * Vẽ + tải 1 ảnh cho 1 khoảng tối đa MAX_COLS_PER_IMAGE ngày lịch (cùng 1 trục
 * ngày cho cả lớp). Ô của mỗi thành viên ghi SỐ THỨ TỰ NGÀY HỌC riêng của họ
 * (tính từ ngày họ bắt đầu) ứng với cột ngày lịch đó, không phải "Ngày N"
 * chung của khóa — người bắt đầu muộn hơn sẽ có các ô đầu bảng (trước ngày họ
 * vào học) hoặc cuối bảng (chưa tới hạn) để trống.
 */
function renderChunk(
    courseName: string,
    rows: RosterExportRow[],
    dateMids: number[],
    titleSuffix: string,
    fileSuffix: string,
    exportedAt: Date,
    format: 'png' | 'jpeg'
) {
    const measureCanvas = document.createElement('canvas')
    const mctx = measureCanvas.getContext('2d')!

    const PAD = 24
    const ROW_H = 34
    const HEADER_H = 40
    const TITLE_H = 56
    const LEGEND_H = 40
    const DAY_COL_W = 44
    const STT_W = 44
    const CODE_W = 64

    mctx.font = '600 13px Arial, sans-serif'
    const nameW = Math.min(260, Math.max(120, ...rows.map(r => mctx.measureText(r.name || 'Chưa có tên').width + 24)))
    const teamW = Math.min(140, Math.max(70, ...rows.map(r => mctx.measureText(r.teamText).width + 24)))
    const groupW = Math.min(140, Math.max(70, ...rows.map(r => mctx.measureText(r.groupText).width + 24)))

    const tableW = STT_W + nameW + CODE_W + teamW + groupW + DAY_COL_W * dateMids.length
    const width = tableW + PAD * 2
    const height = TITLE_H + HEADER_H + ROW_H * rows.length + LEGEND_H + PAD * 2

    const canvas = document.createElement('canvas')
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = Math.ceil(width * dpr)
    canvas.height = Math.ceil(height * dpr)
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)

    // Background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)

    // Title
    ctx.fillStyle = '#1f2937'
    ctx.font = '700 18px Arial, sans-serif'
    ctx.textBaseline = 'middle'
    ctx.fillText(`Bảng tổng hợp nộp bài — ${courseName}${titleSuffix}`, PAD, PAD + TITLE_H / 2 - 8)
    ctx.font = '400 11px Arial, sans-serif'
    ctx.fillStyle = '#6b7280'
    ctx.fillText(
        `${formatDDMM(dateMids[0])} - ${formatDDMM(dateMids[dateMids.length - 1])} • Xuất lúc ${exportedAt.toLocaleString('vi-VN')} • ${rows.length} thành viên • Số trong ô = ngày học thứ mấy của riêng người đó`,
        PAD, PAD + TITLE_H / 2 + 14
    )

    let y = PAD + TITLE_H
    const cols = [
        { key: 'stt', label: 'STT', w: STT_W },
        { key: 'name', label: 'Họ tên', w: nameW },
        { key: 'code', label: 'Mã', w: CODE_W },
        { key: 'team', label: 'Team', w: teamW },
        { key: 'group', label: 'Group', w: groupW },
        ...dateMids.map(mid => ({ key: `d-${mid}`, label: formatDDMM(mid), w: DAY_COL_W })),
    ]

    // Header row
    ctx.fillStyle = '#7c3aed'
    ctx.fillRect(PAD, y, tableW, HEADER_H)
    ctx.fillStyle = '#ffffff'
    ctx.font = '700 12px Arial, sans-serif'
    ctx.textAlign = 'center'
    let x = PAD
    for (const col of cols) {
        ctx.fillText(col.label, x + col.w / 2, y + HEADER_H / 2, col.w - 6)
        x += col.w
    }
    y += HEADER_H

    // Body rows
    rows.forEach((row, idx) => {
        ctx.fillStyle = row.isPS ? '#fef3c7' : (idx % 2 === 0 ? '#ffffff' : '#f9fafb')
        ctx.fillRect(PAD, y, tableW, ROW_H)

        x = PAD
        ctx.fillStyle = '#374151'
        ctx.font = '600 12px Arial, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(String(row.stt), x + STT_W / 2, y + ROW_H / 2)
        x += STT_W

        ctx.textAlign = 'left'
        ctx.font = '600 12px Arial, sans-serif'
        ctx.fillStyle = '#111827'
        ctx.fillText(row.name || 'Chưa có tên', x + 12, y + ROW_H / 2, nameW - 20)
        x += nameW

        ctx.textAlign = 'center'
        ctx.font = '500 11px Arial, sans-serif'
        ctx.fillStyle = '#7c3aed'
        ctx.fillText(`#${row.code}`, x + CODE_W / 2, y + ROW_H / 2)
        x += CODE_W

        ctx.fillStyle = '#374151'
        ctx.fillText(row.teamText, x + teamW / 2, y + ROW_H / 2, teamW - 10)
        x += teamW

        ctx.fillText(row.groupText, x + groupW / 2, y + ROW_H / 2, groupW - 10)
        x += groupW

        const rowStartMid = toVnMidnightUTC(row.startDate)
        for (const mid of dateMids) {
            const order = Math.floor((mid - rowStartMid) / DAY_MS) + 1
            const d = order >= 1 ? row.days.find(item => item.order === order) : undefined
            if (d) {
                const cx = x + DAY_COL_W / 2
                const cy = y + ROW_H / 2
                ctx.fillStyle = STATUS_COLOR[d.status]
                roundedRect(ctx, x + 6, y + 5, DAY_COL_W - 12, ROW_H - 10, 6)
                ctx.fill()
                ctx.fillStyle = '#ffffff'
                ctx.font = '700 11px Arial, sans-serif'
                ctx.fillText(String(order), cx, cy)
            }
            // Ngoài khoảng ngày bắt đầu → hôm nay của người này: để trống.
            x += DAY_COL_W
        }

        y += ROW_H
    })

    // Grid border
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1
    ctx.strokeRect(PAD, PAD + TITLE_H, tableW, HEADER_H + ROW_H * rows.length)

    // Legend
    ctx.textAlign = 'left'
    ctx.font = '600 11px Arial, sans-serif'
    let lx = PAD
    const ly = y + LEGEND_H / 2
    const legend: [DayStatus, string][] = [['onTime', 'Đúng hạn'], ['late', 'Nộp muộn'], ['missing', 'Chưa nộp']]
    for (const [status, label] of legend) {
        ctx.fillStyle = STATUS_COLOR[status]
        roundedRect(ctx, lx, ly - 7, 14, 14, 3)
        ctx.fill()
        ctx.fillStyle = '#4b5563'
        ctx.fillText(label, lx + 20, ly)
        lx += mctx.measureText(label).width + 50
    }
    ctx.fillStyle = '#9ca3af'
    ctx.font = '500 10px Arial, sans-serif'
    ctx.fillText('Ô trống = chưa bắt đầu học hoặc chưa tới ngày này', lx + 10, ly)

    const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png'
    canvas.toBlob(blob => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `nop-bai-${slugify(courseName)}${fileSuffix}-${exportedAt.toISOString().slice(0, 10)}.${format === 'jpeg' ? 'jpg' : 'png'}`
        a.click()
        URL.revokeObjectURL(url)
    }, mime, format === 'jpeg' ? 0.95 : undefined)
}

/**
 * Xuất bảng tổng hợp nộp bài ra ảnh PNG/JPEG. Trục cột là NGÀY LỊCH THẬT dùng
 * chung cho cả lớp (từ ngày bắt đầu sớm nhất tới hôm nay) — không phải "Ngày
 * N" tương đối của từng người, vì mỗi thành viên có thể bắt đầu 1 ngày khác
 * nhau. Nếu khoảng ngày dài hơn MAX_COLS_PER_IMAGE thì tự tách thành nhiều
 * ảnh (mỗi ảnh 1 khoảng ngày liên tiếp) để bảng không quá rộng khó xem.
 */
export function downloadRosterAsImage(
    courseName: string,
    rows: RosterExportRow[],
    format: 'png' | 'jpeg' = 'png'
) {
    if (rows.length === 0) return

    const exportedAt = new Date()
    const startMids = rows.map(r => toVnMidnightUTC(r.startDate))
    const earliestStartMid = Math.min(...startMids)
    const todayMid = toVnMidnightUTC(exportedAt)
    const totalDays = Math.max(1, Math.floor((todayMid - earliestStartMid) / DAY_MS) + 1)
    const allDateMids = Array.from({ length: totalDays }, (_, i) => earliestStartMid + i * DAY_MS)

    const chunks = chunk(allDateMids, MAX_COLS_PER_IMAGE)

    chunks.forEach((dateMids, i) => {
        const titleSuffix = chunks.length > 1 ? ` — Phần ${i + 1}/${chunks.length}` : ''
        const fileSuffix = chunks.length > 1 ? `-phan-${i + 1}` : ''
        // Giãn nhẹ giữa các lần tải để trình duyệt không chặn tải nhiều file liên tiếp.
        setTimeout(() => renderChunk(courseName, rows, dateMids, titleSuffix, fileSuffix, exportedAt, format), i * 350)
    })
}
