export type DayStatus = 'missing' | 'late' | 'onTime'

export type RosterExportRow = {
    stt: number
    name: string
    code: number
    teamText: string
    groupText: string
    isPS: boolean
    days: { order: number; status: DayStatus }[]
}

const STATUS_COLOR: Record<DayStatus, string> = {
    onTime: '#10b981',
    late: '#a855f7',
    missing: '#ef4444',
}

const STATUS_SYMBOL: Record<DayStatus, string> = {
    onTime: '✓',
    late: 'M',
    missing: '✗',
}

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

export function downloadRosterAsImage(
    courseName: string,
    rows: RosterExportRow[],
    dayOrders: number[],
    format: 'png' | 'jpeg' = 'png'
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

    const tableW = STT_W + nameW + CODE_W + teamW + groupW + DAY_COL_W * dayOrders.length
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
    ctx.fillText(`Bảng tổng hợp nộp bài — ${courseName}`, PAD, PAD + TITLE_H / 2 - 8)
    ctx.font = '400 11px Arial, sans-serif'
    ctx.fillStyle = '#6b7280'
    const now = new Date()
    ctx.fillText(`Xuất lúc ${now.toLocaleString('vi-VN')} • ${rows.length} thành viên`, PAD, PAD + TITLE_H / 2 + 14)

    let y = PAD + TITLE_H
    const cols = [
        { key: 'stt', label: 'STT', w: STT_W },
        { key: 'name', label: 'Họ tên', w: nameW },
        { key: 'code', label: 'Mã', w: CODE_W },
        { key: 'team', label: 'Team', w: teamW },
        { key: 'group', label: 'Group', w: groupW },
        ...dayOrders.map(order => ({ key: `day-${order}`, label: `Ngày ${order}`, w: DAY_COL_W })),
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

        for (const d of row.days) {
            const cx = x + DAY_COL_W / 2
            const cy = y + ROW_H / 2
            ctx.fillStyle = STATUS_COLOR[d.status]
            roundedRect(ctx, x + 6, y + 5, DAY_COL_W - 12, ROW_H - 10, 6)
            ctx.fill()
            ctx.fillStyle = '#ffffff'
            ctx.font = '700 12px Arial, sans-serif'
            ctx.fillText(STATUS_SYMBOL[d.status], cx, cy)
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

    const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png'
    canvas.toBlob(blob => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `nop-bai-${slugify(courseName)}-${now.toISOString().slice(0, 10)}.${format === 'jpeg' ? 'jpg' : 'png'}`
        a.click()
        URL.revokeObjectURL(url)
    }, mime, format === 'jpeg' ? 0.95 : undefined)
}
