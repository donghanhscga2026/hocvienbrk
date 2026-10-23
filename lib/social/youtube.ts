import crypto from 'node:crypto'

/**
 * Liên kết kênh YouTube của thành viên — logic thuần ở file này (chữ ký
 * state OAuth, chuẩn hóa đáp án Data API), phần gọi mạng nằm ở sync.ts.
 * GĐ2A (23/10/2026). Dùng OAuth client YOUTUBE_CLIENT_ID/SECRET sẵn có
 * của dự án và Data API key YOUTUBE_API_KEY để đọc số liệu công khai.
 */

export const YOUTUBE_PROVIDER = 'YOUTUBE'

function stateSecret(): string {
    return process.env.NEXTAUTH_SECRET || process.env.CRON_SECRET || 'dev-only-secret'
}

/** State OAuth có chữ ký HMAC: {userId}.{issuedAtMs}.{sig} — callback
 *  đối chiếu người đang đăng nhập với userId trong state, chống giả mạo
 *  liên kết chéo tài khoản. Hết hạn sau 15 phút. */
export function signOAuthState(userId: number, now = Date.now()): string {
    const payload = `${userId}.${now}`
    const sig = crypto.createHmac('sha256', stateSecret()).update(payload).digest('hex').slice(0, 32)
    return `${payload}.${sig}`
}

export function verifyOAuthState(state: string, now = Date.now()): { ok: boolean; userId?: number } {
    const parts = (state ?? '').split('.')
    if (parts.length !== 3) return { ok: false }
    const [userIdRaw, issuedRaw, sig] = parts
    const expected = crypto.createHmac('sha256', stateSecret()).update(`${userIdRaw}.${issuedRaw}`).digest('hex').slice(0, 32)
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { ok: false }
    const issued = Number(issuedRaw)
    if (!Number.isFinite(issued) || now - issued > 15 * 60 * 1000 || issued > now + 60 * 1000) return { ok: false }
    const userId = Number(userIdRaw)
    if (!Number.isInteger(userId) || userId <= 0) return { ok: false }
    return { ok: true, userId }
}

export function buildYouTubeAuthUrl(params: { clientId: string; redirectUri: string; state: string }): string {
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    url.searchParams.set('client_id', params.clientId)
    url.searchParams.set('redirect_uri', params.redirectUri)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('scope', 'https://www.googleapis.com/auth/youtube.readonly')
    url.searchParams.set('access_type', 'offline')
    url.searchParams.set('prompt', 'consent')
    url.searchParams.set('state', params.state)
    return url.toString()
}

export interface ChannelStats {
    channelId: string
    title: string
    handle: string | null
    subscribers: number
    totalViews: number
    videoCount: number
    uploadsPlaylistId: string | null
}

/** Chuẩn hóa đáp án channels.list của YouTube Data API. */
interface YtChannelItem {
    id?: string
    snippet?: { title?: string; customUrl?: string }
    statistics?: Record<string, string>
    contentDetails?: { relatedPlaylists?: { uploads?: string } }
}

export function parseChannelResponse(json: unknown): ChannelStats | null {
    const item = (json as { items?: YtChannelItem[] } | null)?.items?.[0]
    if (!item?.id) return null
    const stats = item.statistics ?? {}
    const num = (v: unknown) => {
        const n = Number(v)
        return Number.isFinite(n) ? n : 0
    }
    return {
        channelId: String(item.id),
        title: String(item.snippet?.title ?? ''),
        handle: item.snippet?.customUrl ? String(item.snippet.customUrl) : null,
        subscribers: num(stats.subscriberCount),
        totalViews: num(stats.viewCount),
        videoCount: num(stats.videoCount),
        uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads ?? null,
    }
}

export interface VideoStat {
    videoId: string
    title: string
    publishedAt: Date | null
    viewCount: number
    likeCount: number
}

/** Chuẩn hóa đáp án videos.list. */
interface YtVideoItem {
    id?: string
    snippet?: { title?: string; publishedAt?: string }
    statistics?: Record<string, string>
}

export function parseVideoListResponse(json: unknown): VideoStat[] {
    const raw = (json as { items?: YtVideoItem[] } | null)?.items
    const items = Array.isArray(raw) ? raw : []
    return items.filter((i) => i?.id).map((i) => ({
        videoId: String(i.id),
        title: String(i.snippet?.title ?? ''),
        publishedAt: i.snippet?.publishedAt ? new Date(i.snippet.publishedAt) : null,
        viewCount: Number(i.statistics?.viewCount) || 0,
        likeCount: Number(i.statistics?.likeCount) || 0,
    }))
}

/** Tăng trưởng giữa hai ảnh chụp liên tiếp (không âm quá mức do chủ kênh
 *  ẩn video — vẫn ghi số thật, tầng tính điểm tự quyết cách dùng). */
export function snapshotDelta(
    prev: { followers: number; totalViews: number; videoCount: number } | null,
    curr: { followers: number; totalViews: number; videoCount: number },
): { followers: number; views: number; videos: number } {
    if (!prev) return { followers: 0, views: 0, videos: 0 }
    return {
        followers: curr.followers - prev.followers,
        views: curr.totalViews - prev.totalViews,
        videos: curr.videoCount - prev.videoCount,
    }
}
