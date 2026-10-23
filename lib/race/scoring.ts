/**
 * Luật điểm Cuộc đua tăng tốc — logic thuần, test độc lập. GĐ2B.
 * 6 chỉ số đợt đầu, tất cả đều từ nguồn tự động đã kiểm chứng:
 * - REVENUE: GMV ròng từ sổ cái doanh số (cả hai vai) trong kỳ đua.
 * - CUSTOMERS: khách hàng mới mua qua affiliate của mình (đơn PAID).
 * - LEADS: ghi danh mới có người giới thiệu là mình.
 * - VIDEOS: video mới phát hiện trên kênh đã liên kết trong kỳ.
 * - VIEWS: tổng lượt xem tăng thêm (chênh lệch snapshot) trong kỳ.
 * - FOLLOWERS: người đăng ký tăng thêm (chênh lệch snapshot) trong kỳ.
 * Luật mặc định bên dưới; mỗi cuộc đua có thể ghi đè qua metricConfig.
 */

export const METRIC_KEYS = ['REVENUE', 'CUSTOMERS', 'LEADS', 'VIDEOS', 'VIEWS', 'FOLLOWERS'] as const
export type MetricKey = (typeof METRIC_KEYS)[number]

export const METRIC_LABELS: Record<MetricKey, string> = {
    REVENUE: 'Doanh thu ghi nhận',
    CUSTOMERS: 'Khách hàng mới',
    LEADS: 'Đăng ký mới qua giới thiệu',
    VIDEOS: 'Video mới đăng',
    VIEWS: 'Lượt xem tăng thêm',
    FOLLOWERS: 'Người đăng ký tăng thêm',
}

export const METRIC_SOURCES: Record<MetricKey, string> = {
    REVENUE: 'SALES_LEDGER',
    CUSTOMERS: 'ORDERS',
    LEADS: 'ENROLLMENTS',
    VIDEOS: 'YOUTUBE_LINK',
    VIEWS: 'YOUTUBE_LINK',
    FOLLOWERS: 'YOUTUBE_LINK',
}

export interface MetricRule {
    /** Cứ mỗi `per` đơn vị số đo thì được `points` điểm. */
    per: number
    points: number
    /** Trần điểm cho chỉ số này (null = không trần). */
    cap: number | null
}

export const DEFAULT_METRIC_CONFIG: Record<MetricKey, MetricRule> = {
    REVENUE: { per: 1_000_000, points: 1, cap: 100 },
    CUSTOMERS: { per: 1, points: 5, cap: 50 },
    LEADS: { per: 1, points: 2, cap: 40 },
    VIDEOS: { per: 1, points: 5, cap: 30 },
    VIEWS: { per: 1000, points: 1, cap: 30 },
    FOLLOWERS: { per: 10, points: 1, cap: 20 },
}

export function resolveMetricConfig(raw: unknown): Record<MetricKey, MetricRule> {
    const config: Record<MetricKey, MetricRule> = JSON.parse(JSON.stringify(DEFAULT_METRIC_CONFIG))
    if (!raw || typeof raw !== 'object') return config
    for (const key of METRIC_KEYS) {
        const override = (raw as Record<string, unknown>)[key] as Partial<MetricRule> | undefined
        if (!override) continue
        const per = Number(override.per)
        const points = Number(override.points)
        const cap = override.cap === null ? null : Number(override.cap)
        if (Number.isFinite(per) && per > 0) config[key].per = per
        if (Number.isFinite(points) && points >= 0) config[key].points = points
        if (cap === null || (Number.isFinite(cap) && cap >= 0)) config[key].cap = cap
    }
    return config
}

/** Điểm của một chỉ số: floor(quantity / per) × points, chặn ở cap. Số đo âm → 0. */
export function pointsFor(quantity: number, rule: MetricRule): number {
    const q = Number.isFinite(quantity) ? Math.max(0, quantity) : 0
    const raw = Math.floor(q / rule.per) * rule.points
    return rule.cap === null ? raw : Math.min(rule.cap, raw)
}

/** Tổng tăng trưởng từ chuỗi snapshot đã sắp xếp: chỉ cộng các bước tăng dương. */
export function sumPositiveDeltas(values: number[]): number {
    let total = 0
    for (let i = 1; i < values.length; i++) {
        const d = values[i] - values[i - 1]
        if (d > 0) total += d
    }
    return total
}
