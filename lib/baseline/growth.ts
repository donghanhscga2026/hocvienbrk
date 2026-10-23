/**
 * Logic thuần cho Điểm A → Điểm B (không chạm DB — test được độc lập).
 * GĐ1, kế hoạch nâng cấp từ WIPA OS (23/10/2026).
 *
 * Kỷ luật dữ liệu rút từ lỗi của WIPA OS:
 * - Mọi chỉ số phải là số nguyên >= 0 trong trần hợp lý (chặn giá trị
 *   phi lý kiểu 999.999.998 lọt vào báo cáo tăng trưởng).
 * - Ngày ghi do server ấn định (recordedAt = now) — học viên không
 *   nhập ngày, nên không thể có ngày tương lai.
 */

export interface BaselineMetrics {
    followers: number
    views: number
    customers: number
    revenue: number
}

/** Trần hợp lý cho từng chỉ số — vượt trần là lỗi nhập liệu, không phải thành tích. */
export const METRIC_CAPS: Record<keyof BaselineMetrics, number> = {
    followers: 2_000_000_000,
    views: 2_000_000_000,
    customers: 2_000_000_000,
    revenue: 999_999_999_999,
}

export const METRIC_LABELS: Record<keyof BaselineMetrics, string> = {
    followers: 'Người theo dõi',
    views: 'Lượt xem (tích lũy)',
    customers: 'Khách hàng',
    revenue: 'Doanh thu (VNĐ)',
}

export function emptyMetrics(): BaselineMetrics {
    return { followers: 0, views: 0, customers: 0, revenue: 0 }
}

/**
 * Kiểm tra hợp lệ một bộ chỉ số do học viên nhập.
 * Trả về danh sách lỗi (rỗng = hợp lệ).
 */
export function validateMetrics(input: Partial<Record<keyof BaselineMetrics, unknown>>): string[] {
    const errors: string[] = []
    for (const key of Object.keys(METRIC_CAPS) as (keyof BaselineMetrics)[]) {
        const raw = input[key]
        if (raw === undefined || raw === null || raw === '') continue // thiếu = giữ 0 ở tầng gọi
        const value = typeof raw === 'number' ? raw : Number(raw)
        if (!Number.isFinite(value)) {
            errors.push(`${METRIC_LABELS[key]}: phải là số`)
            continue
        }
        if (value < 0) errors.push(`${METRIC_LABELS[key]}: không được âm`)
        if (!Number.isInteger(value)) errors.push(`${METRIC_LABELS[key]}: phải là số nguyên`)
        if (value > METRIC_CAPS[key]) errors.push(`${METRIC_LABELS[key]}: vượt mức hợp lý (${METRIC_CAPS[key].toLocaleString('vi-VN')})`)
    }
    return errors
}

export function normalizeMetrics(input: Partial<Record<keyof BaselineMetrics, unknown>>): BaselineMetrics {
    const out = emptyMetrics()
    for (const key of Object.keys(METRIC_CAPS) as (keyof BaselineMetrics)[]) {
        const raw = input[key]
        const value = typeof raw === 'number' ? raw : Number(raw ?? 0)
        out[key] = Number.isFinite(value) ? Math.trunc(value) : 0
    }
    return out
}

export interface MetricGrowth {
    from: number
    to: number
    delta: number
    /** Phần trăm tăng trưởng; null khi Điểm A = 0 và Điểm B > 0 (không chia cho 0). */
    pct: number | null
}

export type GrowthMap = Record<keyof BaselineMetrics, MetricGrowth>

export function computeGrowth(a: BaselineMetrics, b: BaselineMetrics): GrowthMap {
    const result = {} as GrowthMap
    for (const key of Object.keys(METRIC_CAPS) as (keyof BaselineMetrics)[]) {
        const from = a[key]
        const to = b[key]
        result[key] = {
            from,
            to,
            delta: to - from,
            pct: from > 0 ? ((to - from) / from) * 100 : to > 0 ? null : 0,
        }
    }
    return result
}
