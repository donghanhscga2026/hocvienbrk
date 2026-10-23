/**
 * Bộ huy hiệu đợt đầu (24 chiếc) + danh hiệu — định nghĩa bằng code để
 * có kiểm chứng trong CI; engine đồng bộ các định nghĩa này vào bảng
 * Badge (upsert theo code) trước khi trao. GĐ3 (24/10/2026).
 *
 * Chỉ số dùng trong luật (đo tự động, xem lib/badges/engine.ts):
 * - LESSONS_COMPLETED: số bài học đã hoàn thành.
 * - ACTIVE_DAYS: số ngày riêng biệt có hoàn thành bài học (giờ VN).
 * - COURSES_COMPLETED: số khóa đã hoàn thành toàn bộ bài học.
 * - VIDEOS_PUBLISHED: số video phát hiện trên kênh đã liên kết.
 * - CHANNEL_VIEWS: tổng lượt xem ở snapshot mới nhất của kênh đã liên kết.
 * - REVENUE_TOTAL: GMV ròng tích lũy từ sổ cái doanh số (cả hai vai).
 * - CUSTOMERS_TOTAL: tổng khách hàng riêng biệt mua qua affiliate.
 * - RACE_BEST_RANK: hạng tốt nhất trong một cuộc đua đã kết thúc.
 */

export type BadgeMetric =
    | 'LESSONS_COMPLETED' | 'ACTIVE_DAYS' | 'COURSES_COMPLETED'
    | 'VIDEOS_PUBLISHED' | 'CHANNEL_VIEWS'
    | 'REVENUE_TOTAL' | 'CUSTOMERS_TOTAL' | 'RACE_BEST_RANK'

export interface BadgeDefinition {
    code: string
    name: string
    description: string
    icon: string
    tier: number
    category: 'LEARNING' | 'CONTENT' | 'BUSINESS' | 'RACE'
    metric: BadgeMetric
    threshold: number
}

export const BADGE_CATALOG: BadgeDefinition[] = [
    // Học tập (10)
    { code: 'LEARN_FIRST', name: 'Khởi động', description: 'Hoàn thành bài học đầu tiên', icon: '🌱', tier: 1, category: 'LEARNING', metric: 'LESSONS_COMPLETED', threshold: 1 },
    { code: 'LEARN_10', name: 'Vào guồng', description: 'Hoàn thành 10 bài học', icon: '📘', tier: 1, category: 'LEARNING', metric: 'LESSONS_COMPLETED', threshold: 10 },
    { code: 'LEARN_25', name: 'Đà tiến bộ', description: 'Hoàn thành 25 bài học', icon: '📗', tier: 2, category: 'LEARNING', metric: 'LESSONS_COMPLETED', threshold: 25 },
    { code: 'LEARN_50', name: 'Học sâu', description: 'Hoàn thành 50 bài học', icon: '📚', tier: 2, category: 'LEARNING', metric: 'LESSONS_COMPLETED', threshold: 50 },
    { code: 'LEARN_100', name: 'Trăm bài vững vàng', description: 'Hoàn thành 100 bài học', icon: '🏛️', tier: 3, category: 'LEARNING', metric: 'LESSONS_COMPLETED', threshold: 100 },
    { code: 'DAYS_3', name: 'Ba ngày liên tục', description: 'Có 3 ngày học có hoàn thành bài', icon: '🔥', tier: 1, category: 'LEARNING', metric: 'ACTIVE_DAYS', threshold: 3 },
    { code: 'DAYS_7', name: 'Một tuần bền bỉ', description: 'Có 7 ngày học có hoàn thành bài', icon: '🗓️', tier: 2, category: 'LEARNING', metric: 'ACTIVE_DAYS', threshold: 7 },
    { code: 'DAYS_30', name: 'Ba mươi ngày kỷ luật', description: 'Có 30 ngày học có hoàn thành bài', icon: '💎', tier: 3, category: 'LEARNING', metric: 'ACTIVE_DAYS', threshold: 30 },
    { code: 'COURSE_1', name: 'Về đích đầu tiên', description: 'Hoàn thành toàn bộ một khóa học', icon: '🏁', tier: 2, category: 'LEARNING', metric: 'COURSES_COMPLETED', threshold: 1 },
    { code: 'COURSE_3', name: 'Ba lần về đích', description: 'Hoàn thành toàn bộ ba khóa học', icon: '🎓', tier: 3, category: 'LEARNING', metric: 'COURSES_COMPLETED', threshold: 3 },
    // Nội dung (5)
    { code: 'VIDEO_1', name: 'Video đầu tiên', description: 'Đăng video đầu tiên trên kênh đã liên kết', icon: '🎬', tier: 1, category: 'CONTENT', metric: 'VIDEOS_PUBLISHED', threshold: 1 },
    { code: 'VIDEO_5', name: 'Năm video', description: 'Đăng 5 video trên kênh đã liên kết', icon: '🎥', tier: 1, category: 'CONTENT', metric: 'VIDEOS_PUBLISHED', threshold: 5 },
    { code: 'VIDEO_10', name: 'Mười video', description: 'Đăng 10 video trên kênh đã liên kết', icon: '📺', tier: 2, category: 'CONTENT', metric: 'VIDEOS_PUBLISHED', threshold: 10 },
    { code: 'VIDEO_25', name: 'Hai mươi lăm video', description: 'Đăng 25 video trên kênh đã liên kết', icon: '🌟', tier: 3, category: 'CONTENT', metric: 'VIDEOS_PUBLISHED', threshold: 25 },
    { code: 'VIEWS_10K', name: 'Mười nghìn lượt xem', description: 'Kênh đã liên kết đạt 10.000 tổng lượt xem', icon: '👀', tier: 2, category: 'CONTENT', metric: 'CHANNEL_VIEWS', threshold: 10000 },
    // Kinh doanh (6)
    { code: 'REV_1M', name: 'Triệu đầu tiên', description: 'Doanh thu ghi nhận tích lũy đạt 1 triệu đồng', icon: '💰', tier: 1, category: 'BUSINESS', metric: 'REVENUE_TOTAL', threshold: 1000000 },
    { code: 'REV_10M', name: 'Mười triệu', description: 'Doanh thu ghi nhận tích lũy đạt 10 triệu đồng', icon: '💵', tier: 2, category: 'BUSINESS', metric: 'REVENUE_TOTAL', threshold: 10000000 },
    { code: 'REV_50M', name: 'Năm mươi triệu', description: 'Doanh thu ghi nhận tích lũy đạt 50 triệu đồng', icon: '🏦', tier: 3, category: 'BUSINESS', metric: 'REVENUE_TOTAL', threshold: 50000000 },
    { code: 'REV_100M', name: 'Trăm triệu', description: 'Doanh thu ghi nhận tích lũy đạt 100 triệu đồng', icon: '👑', tier: 3, category: 'BUSINESS', metric: 'REVENUE_TOTAL', threshold: 100000000 },
    { code: 'CUST_5', name: 'Năm khách đầu tiên', description: 'Có 5 khách hàng mua qua giới thiệu của bạn', icon: '🤝', tier: 1, category: 'BUSINESS', metric: 'CUSTOMERS_TOTAL', threshold: 5 },
    { code: 'CUST_20', name: 'Hai mươi khách hàng', description: 'Có 20 khách hàng mua qua giới thiệu của bạn', icon: '🌐', tier: 2, category: 'BUSINESS', metric: 'CUSTOMERS_TOTAL', threshold: 20 },
    // Cuộc đua (3)
    { code: 'RACE_TOP10', name: 'Top 10 cuộc đua', description: 'Vào top 10 một cuộc đua đã kết thúc', icon: '🏅', tier: 2, category: 'RACE', metric: 'RACE_BEST_RANK', threshold: 10 },
    { code: 'RACE_TOP3', name: 'Top 3 cuộc đua', description: 'Vào top 3 một cuộc đua đã kết thúc', icon: '🥉', tier: 3, category: 'RACE', metric: 'RACE_BEST_RANK', threshold: 3 },
    { code: 'RACE_WINNER', name: 'Quán quân cuộc đua', description: 'Đứng đầu một cuộc đua đã kết thúc', icon: '🏆', tier: 3, category: 'RACE', metric: 'RACE_BEST_RANK', threshold: 1 },
]

/** Huy hiệu hạng (rank) đạt khi giá trị đo <= threshold và > 0; các huy
 *  hiệu khác đạt khi giá trị đo >= threshold. */
export function isEarned(def: BadgeDefinition, value: number): boolean {
    if (def.metric === 'RACE_BEST_RANK') return value > 0 && value <= def.threshold
    return value >= def.threshold
}

export interface TitleLevel { minBadges: number; title: string }

export const TITLE_LEVELS: TitleLevel[] = [
    { minBadges: 20, title: 'Huyền thoại cộng đồng' },
    { minBadges: 15, title: 'Bậc thầy tăng trưởng' },
    { minBadges: 10, title: 'Chuyên gia thực chiến' },
    { minBadges: 6, title: 'Học viên xuất sắc' },
    { minBadges: 3, title: 'Học viên chăm chỉ' },
    { minBadges: 0, title: 'Thành viên mới' },
]

export function titleForBadgeCount(count: number): string {
    for (const level of TITLE_LEVELS) {
        if (count >= level.minBadges) return level.title
    }
    return 'Thành viên mới'
}
