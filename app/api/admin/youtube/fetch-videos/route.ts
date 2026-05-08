import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { google } from "googleapis"
import prisma from "@/lib/prisma"

interface VideoResult {
  stt: number
  title: string
  videoId: string
  url: string
  duration: string
  durationSeconds: number
  publishedAt: string
  thumbnail?: string
}

function parseYouTubeUrl(url: string): { type: 'playlist' | 'channel'; id: string } | null {
  try {
    const urlObj = new URL(url)
    
    if (urlObj.searchParams.has('list')) {
      const list = urlObj.searchParams.get('list')
      if (list && !list.startsWith('RD') && !list.startsWith('VL')) {
        return { type: 'playlist', id: list }
      }
    }
    
    const path = urlObj.pathname
    if (path.startsWith('/channel/')) {
      return { type: 'channel', id: path.replace('/channel/', '') }
    }
    if (path.startsWith('/@')) {
      return { type: 'channel', id: path.replace('/@', '') }
    }
    if (path.startsWith('/c/')) {
      return { type: 'channel', id: path.replace('/c/', '') }
    }
    if (path.startsWith('/user/')) {
      return { type: 'channel', id: path.replace('/user/', '') }
    }
    
    return null
  } catch {
    return null
  }
}

function parseDuration(isoDuration: string): { text: string; seconds: number } {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return { text: '0:00', seconds: 0 }
  
  const hours = parseInt(match[1] || '0')
  const minutes = parseInt(match[2] || '0')
  const seconds = parseInt(match[3] || '0')
  
  const totalSeconds = hours * 3600 + minutes * 60 + seconds
  
  let text = ''
  if (hours > 0) text += `${hours}:`
  text += `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  
  return { text, seconds: totalSeconds }
}

async function fetchWithKey(url: string, apiKey: string) {
  const fullUrl = url + (url.includes('?') ? '&' : '?') + `key=${apiKey}`
  
  const response = await fetch(fullUrl, {
    headers: {
      'Referer': 'http://localhost:3000',
    },
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'YouTube API error')
  }
  
  return response.json()
}

async function getYouTubeAuth() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Chưa đăng nhập')
  }
  
  const userId = parseInt(session.user.id)
  
  const ytToken = await prisma.youTubeToken.findUnique({
    where: { userId },
  })
  
  if (!ytToken) {
    throw new Error('Chưa kết nối tài khoản YouTube. Vào YouTube Tools để kết nối.')
  }
  
  const oauth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    process.env.YOUTUBE_REDIRECT_URI
  )
  
  oauth2Client.setCredentials({
    access_token: ytToken.accessToken,
    refresh_token: ytToken.refreshToken,
  })
  
  if (ytToken.expiresAt && new Date(ytToken.expiresAt) < new Date()) {
    const { credentials } = await oauth2Client.refreshAccessToken()
    await prisma.youTubeToken.update({
      where: { userId },
      data: {
        accessToken: (credentials.access_token as string) || '',
        expiresAt: new Date(credentials.expiry_date || Date.now()),
      }
    })
    oauth2Client.setCredentials(credentials)
  }
  
  return oauth2Client
}

async function fetchPlaylistWithOAuth(oauth2Client: any, playlistId: string, maxResults: number): Promise<any[]> {
  const youtube = google.youtube({ version: 'v3', auth: oauth2Client })
  
  const videos: any[] = []
  let nextPageToken: string | undefined
  let fetched = 0
  
  while (fetched < maxResults) {
    const response = await youtube.playlistItems.list({
      part: ['snippet', 'contentDetails'],
      playlistId,
      maxResults: Math.min(50, maxResults - fetched),
      pageToken: nextPageToken,
    })
    
    const items = response.data.items || []
    for (const item of items) {
      if (item.contentDetails?.videoId) {
        videos.push({
          videoId: item.contentDetails.videoId,
          title: item.snippet?.title || 'Untitled',
          publishedAt: item.snippet?.publishedAt,
          thumbnail: item.snippet?.thumbnails?.medium?.url || '',
        })
      }
    }
    
    nextPageToken = response.data.nextPageToken || undefined
    fetched += items.length
    
    if (!nextPageToken) break
  }
  
  return videos
}

async function fetchChannelWithOAuth(oauth2Client: any, channelId: string, maxResults: number): Promise<any[]> {
  const youtube = google.youtube({ version: 'v3', auth: oauth2Client })
  
  const channelResponse = await youtube.channels.list({
    part: ['contentDetails'],
    id: [channelId],
  })
  
  const uploadsPlaylistId = channelResponse.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
  
  if (!uploadsPlaylistId) {
    throw new Error('Không tìm thấy danh sách video của kênh')
  }
  
  return fetchPlaylistWithOAuth(oauth2Client, uploadsPlaylistId, maxResults)
}

async function fetchVideoDetailsWithOAuth(oauth2Client: any, videoIds: string[]): Promise<Map<string, any>> {
  const youtube = google.youtube({ version: 'v3', auth: oauth2Client })
  const videoDetailsMap = new Map()
  
  const batchSize = 50
  for (let i = 0; i < videoIds.length; i += batchSize) {
    const batch = videoIds.slice(i, i + batchSize)
    
    const response = await youtube.videos.list({
      part: ['contentDetails'],
      id: batch,
    })
    
    response.data.items?.forEach((v: any) => {
      videoDetailsMap.set(v.id, v)
    })
  }
  
  return videoDetailsMap
}

async function fetchVideoDetailsWithKey(apiKey: string, videoIds: string[]): Promise<Map<string, any>> {
  const videoDetailsMap = new Map()
  
  const batchSize = 50
  for (let i = 0; i < videoIds.length; i += batchSize) {
    const batch = videoIds.slice(i, i + batchSize)
    
    try {
      const data = await fetchWithKey(
        `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${batch.join(',')}`,
        apiKey
      )
      
      for (const v of data.items || []) {
        videoDetailsMap.set(v.id, v)
      }
    } catch (e) {
      console.error('Video details error:', e)
    }
  }
  
  return videoDetailsMap
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      url,
      type,
      mode = 'public',
      maxResults = 50,
      minDuration,
      maxDuration,
      sortBy = 'date_desc',
      dateFrom,
      dateTo,
    } = body
    
    if (!url) {
      return NextResponse.json({ error: 'Thiếu URL YouTube' }, { status: 400 })
    }
    
    let parsed = parseYouTubeUrl(url)
    if (!parsed) {
      return NextResponse.json({ error: 'URL YouTube không hợp lệ' }, { status: 400 })
    }
    
    const videoType = type || parsed.type
    const playlistId = parsed.id
    
    let videos: any[] = []
    let oauth2Client: any = null
    let apiKey: string | undefined
    
    if (mode === 'private') {
      oauth2Client = await getYouTubeAuth()
    } else {
      apiKey = process.env.YOUTUBE_API_KEY
      if (!apiKey) {
        return NextResponse.json({ error: 'Chưa cấu hình YOUTUBE_API_KEY' }, { status: 500 })
      }
    }
    
    if (videoType === 'playlist') {
      if (mode === 'private') {
        videos = await fetchPlaylistWithOAuth(oauth2Client, playlistId, maxResults)
      } else {
        let nextPageToken: string | undefined
        let fetched = 0
        
        while (fetched < maxResults) {
          const fetchCount = Math.min(50, maxResults - fetched)
          const pageTokenParam = nextPageToken ? `&pageToken=${nextPageToken}` : ''
          
          const data = await fetchWithKey(
            `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=${fetchCount}&playlistId=${playlistId}${pageTokenParam}`,
            apiKey!
          )
          
          for (const item of data.items || []) {
            if (item.contentDetails?.videoId) {
              videos.push({
                videoId: item.contentDetails.videoId,
                title: item.snippet?.title || 'Untitled',
                publishedAt: item.snippet?.publishedAt,
                thumbnail: item.snippet?.thumbnails?.medium?.url || '',
              })
            }
          }
          
          nextPageToken = data.nextPageToken || undefined
          fetched += (data.items || []).length
          
          if (!nextPageToken) break
        }
      }
    } else {
      if (mode === 'private') {
        videos = await fetchChannelWithOAuth(oauth2Client, playlistId, maxResults)
      } else {
        const channelData = await fetchWithKey(
          `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${playlistId}`,
          apiKey!
        )
        
        const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
        
        if (!uploadsPlaylistId) {
          return NextResponse.json({ error: 'Không tìm thấy danh sách video của kênh' }, { status: 404 })
        }
        
        let nextPageToken: string | undefined
        let fetched = 0
        
        while (fetched < maxResults) {
          const fetchCount = Math.min(50, maxResults - fetched)
          const pageTokenParam = nextPageToken ? `&pageToken=${nextPageToken}` : ''
          
          const data = await fetchWithKey(
            `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=${fetchCount}&playlistId=${uploadsPlaylistId}${pageTokenParam}`,
            apiKey!
          )
          
          for (const item of data.items || []) {
            if (item.contentDetails?.videoId) {
              videos.push({
                videoId: item.contentDetails.videoId,
                title: item.snippet?.title || 'Untitled',
                publishedAt: item.snippet?.publishedAt,
                thumbnail: item.snippet?.thumbnails?.medium?.url || '',
              })
            }
          }
          
          nextPageToken = data.nextPageToken || undefined
          fetched += (data.items || []).length
          
          if (!nextPageToken) break
        }
      }
    }

    if (videos.length > 0) {
      const videoIds = videos.map(v => v.videoId).filter(Boolean)
      
      if (videoIds.length > 0) {
        let videoDetailsMap: Map<string, any>
        
        if (mode === 'private') {
          videoDetailsMap = await fetchVideoDetailsWithOAuth(oauth2Client, videoIds)
        } else {
          videoDetailsMap = await fetchVideoDetailsWithKey(apiKey!, videoIds)
        }
        
        videos = videos.map(v => {
          const details = videoDetailsMap.get(v.videoId)
          return {
            ...v,
            duration: details?.contentDetails?.duration || 'PT0M0S',
          }
        })
      }
    }
    
    if (minDuration !== undefined || maxDuration !== undefined) {
      videos = videos.filter(v => {
        const { seconds } = parseDuration(v.duration)
        if (minDuration !== undefined && seconds < minDuration * 60) return false
        if (maxDuration !== undefined && seconds > maxDuration * 60) return false
        return true
      })
    }
    
    if (dateFrom || dateTo) {
      videos = videos.filter(v => {
        const videoDate = new Date(v.publishedAt)
        if (dateFrom && videoDate < new Date(dateFrom)) return false
        if (dateTo && videoDate > new Date(dateTo)) return false
        return true
      })
    }
    
    videos.sort((a, b) => {
      const dateA = new Date(a.publishedAt).getTime()
      const dateB = new Date(b.publishedAt).getTime()
      return sortBy === 'date_asc' ? dateA - dateB : dateB - dateA
    })
    
    videos = videos.slice(0, maxResults)
    
    const results: VideoResult[] = videos.map((v, index) => {
      const { text: durationText, seconds } = parseDuration(v.duration)
      return {
        stt: index + 1,
        title: v.title,
        videoId: v.videoId,
        url: `https://youtu.be/${v.videoId}`,
        duration: durationText,
        durationSeconds: seconds,
        publishedAt: new Date(v.publishedAt).toLocaleDateString('vi-VN'),
      }
    })
    
    return NextResponse.json({
      success: true,
      total: results.length,
      results,
    })
    
  } catch (error: any) {
    console.error('[YouTube Fetch Videos] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Lỗi khi lấy danh sách video' },
      { status: 500 }
    )
  }
}
