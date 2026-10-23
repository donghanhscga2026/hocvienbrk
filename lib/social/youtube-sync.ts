import prisma from '@/lib/prisma'
import { parseChannelResponse, parseVideoListResponse, YOUTUBE_PROVIDER, type ChannelStats, type VideoStat } from './youtube'

/**
 * Đồng bộ số liệu YouTube cho các tài khoản đã liên kết — đọc bằng Data
 * API key công khai (không cần token của thành viên cho thống kê kênh
 * công khai), phát hiện video mới qua playlist uploads. Lỗi một tài
 * khoản không làm hỏng các tài khoản khác: ghi status ERROR + lastError.
 */

const API_BASE = 'https://www.googleapis.com/youtube/v3'

async function apiGet(path: string, params: Record<string, string>): Promise<unknown> {
    const key = process.env.YOUTUBE_API_KEY
    if (!key) throw new Error('Thiếu YOUTUBE_API_KEY')
    const url = new URL(`${API_BASE}/${path}`)
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
    url.searchParams.set('key', key)
    const res = await fetch(url.toString())
    if (!res.ok) throw new Error(`YouTube API ${res.status}: ${await res.text().then((t) => t.slice(0, 200))}`)
    return res.json()
}

export async function fetchChannelStats(channelId: string): Promise<ChannelStats> {
    const json = await apiGet('channels', { part: 'snippet,statistics,contentDetails', id: channelId })
    const stats = parseChannelResponse(json)
    if (!stats) throw new Error(`Không tìm thấy kênh ${channelId}`)
    return stats
}

export async function fetchRecentVideos(uploadsPlaylistId: string, max = 50): Promise<VideoStat[]> {
    const list = await apiGet('playlistItems', { part: 'contentDetails', playlistId: uploadsPlaylistId, maxResults: String(max) })
    const ids = ((list as { items?: { contentDetails?: { videoId?: string } }[] } | null)?.items ?? []).map((i) => i?.contentDetails?.videoId).filter(Boolean)
    if (ids.length === 0) return []
    const videos = await apiGet('videos', { part: 'snippet,statistics', id: ids.join(',') })
    return parseVideoListResponse(videos)
}

export interface AccountSyncOutcome { accountId: number; ok: boolean; error?: string; newVideos?: number }

export async function syncConnectedAccount(accountId: number): Promise<AccountSyncOutcome> {
    const account = await prisma.connectedAccount.findUnique({ where: { id: accountId } })
    if (!account || account.provider !== YOUTUBE_PROVIDER || account.status === 'REVOKED') {
        return { accountId, ok: false, error: 'Tài khoản không khả dụng' }
    }
    try {
        const stats = await fetchChannelStats(account.externalId)
        let newVideos = 0
        if (stats.uploadsPlaylistId) {
            const videos = await fetchRecentVideos(stats.uploadsPlaylistId)
            for (const v of videos) {
                const existing = await prisma.externalContentItem.findUnique({
                    where: { accountId_externalId: { accountId, externalId: v.videoId } },
                    select: { id: true },
                })
                await prisma.externalContentItem.upsert({
                    where: { accountId_externalId: { accountId, externalId: v.videoId } },
                    create: {
                        accountId, externalId: v.videoId,
                        url: `https://www.youtube.com/watch?v=${v.videoId}`,
                        title: v.title, publishedAt: v.publishedAt,
                        viewCount: v.viewCount, likeCount: v.likeCount, lastSeenAt: new Date(),
                    },
                    update: { title: v.title, viewCount: v.viewCount, likeCount: v.likeCount, lastSeenAt: new Date() },
                })
                if (!existing) newVideos++
            }
        }
        await prisma.socialSnapshot.create({
            data: { accountId, followers: stats.subscribers, totalViews: stats.totalViews, videoCount: stats.videoCount },
        })
        await prisma.connectedAccount.update({
            where: { id: accountId },
            data: { status: 'ACTIVE', lastSyncAt: new Date(), lastError: null, displayName: stats.title, handle: stats.handle },
        })
        return { accountId, ok: true, newVideos }
    } catch (error) {
        const message = error instanceof Error ? error.message.slice(0, 500) : 'Lỗi không rõ'
        await prisma.connectedAccount.update({
            where: { id: accountId },
            data: { status: 'ERROR', lastError: message },
        }).catch(() => undefined)
        return { accountId, ok: false, error: message }
    }
}

export async function syncAllConnectedAccounts(): Promise<{ total: number; ok: number; failed: number }> {
    const accounts = await prisma.connectedAccount.findMany({
        where: { provider: YOUTUBE_PROVIDER, status: { in: ['ACTIVE', 'ERROR'] } },
        select: { id: true },
    })
    let ok = 0
    for (const a of accounts) {
        const outcome = await syncConnectedAccount(a.id)
        if (outcome.ok) ok++
    }
    return { total: accounts.length, ok, failed: accounts.length - ok }
}
