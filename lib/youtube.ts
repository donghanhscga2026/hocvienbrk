import { google, youtube_v3 } from 'googleapis'

export interface YouTubeCredentials {
  access_token: string
  refresh_token: string
  expiry_date: number
}

export interface YouTubeVideo {
  id: string
  title: string
  description: string
  thumbnail: string
  status: 'public' | 'private' | 'unlisted' | 'draft'
  madeForKids: boolean
}

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    getRedirectUri()
  )
}

export function getRedirectUri() {
  if (process.env.NODE_ENV === 'production') {
    return process.env.YOUTUBE_REDIRECT_URI_PROD || process.env.YOUTUBE_REDIRECT_URI
  }
  return process.env.YOUTUBE_REDIRECT_URI
}

export function getAuthUrl(): string {
  const oauth2Client = getOAuth2Client()
  
  const scopes = [
    'https://www.googleapis.com/auth/youtube',
    'https://www.googleapis.com/auth/youtube.force-ssl',
  ]
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  })
}

export async function getTokensFromCode(code: string) {
  const oauth2Client = getOAuth2Client()
  const { tokens } = await oauth2Client.getToken(code)
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: new Date(tokens.expiry_date || Date.now()),
  }
}

export async function refreshAccessToken(refreshToken: string) {
  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  })
  
  const { credentials } = await oauth2Client.refreshAccessToken()
  return {
    accessToken: credentials.access_token,
    expiresAt: new Date(credentials.expiry_date || Date.now()),
  }
}

export async function getChannelInfo(auth: any) {
  const youtube = google.youtube({ version: 'v3', auth })
  
  const response = await youtube.channels.list({
    part: ['snippet', 'contentDetails'],
    mine: true,
  })
  
  const channel = response.data.items?.[0]
  if (!channel) return null
  
  return {
    channelId: channel.id,
    channelTitle: channel.snippet?.title || 'My Channel',
    thumbnail: channel.snippet?.thumbnails?.default?.url || '',
  }
}

export async function getVideos(
  auth: any, 
  statusFilter: 'all' | 'private' | 'unlisted' = 'all'
): Promise<YouTubeVideo[]> {
  const youtube = google.youtube({ version: 'v3', auth })
  const videos: YouTubeVideo[] = []
  const seenIds = new Set<string>()
  
  let pageToken: string | undefined
  const maxResults = 50
  
  const channelResponse = await (youtube.channels.list as any)({
    part: ['contentDetails'],
    mine: true,
  })
  
  const uploadsPlaylistId = channelResponse?.data?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
  if (!uploadsPlaylistId) return videos
  
  do {
    const playlistParams: any = {
      part: ['snippet', 'contentDetails'],
      playlistId: uploadsPlaylistId,
      maxResults,
      pageToken,
    }
    
    const playlistResponse = await (youtube.playlistItems.list as any)(playlistParams)
    
    const videoIds: string[] = []
    for (const item of playlistResponse?.data?.items || []) {
      const videoId = item.snippet?.resourceId?.videoId
      if (videoId && !seenIds.has(videoId)) {
        seenIds.add(videoId)
        videoIds.push(videoId)
      }
    }
    
    if (videoIds.length > 0) {
      const videoResponse = await (youtube.videos.list as any)({
        part: ['snippet', 'status'],
        id: videoIds.join(','),
      })
      
      for (const item of videoResponse?.data?.items || []) {
        const privacyStatus = item.status?.privacyStatus || 'private'
        
        if (statusFilter === 'all' || statusFilter === privacyStatus) {
          videos.push({
            id: item.id || '',
            title: item.snippet?.title || 'Untitled',
            description: item.snippet?.description || '',
            thumbnail: item.snippet?.thumbnails?.medium?.url || 
                       item.snippet?.thumbnails?.default?.url || '',
            status: privacyStatus as 'public' | 'private' | 'unlisted',
            madeForKids: item.status?.madeForKids || false,
          })
        }
      }
    }
    
    pageToken = playlistResponse?.data?.nextPageToken || undefined
  } while (pageToken && videos.length < 500)
  
  return videos
}

export async function getAllNonPublicVideos(auth: any): Promise<YouTubeVideo[]> {
  return getVideos(auth, 'unlisted')
}

export async function updateVideoStatus(
  auth: any, 
  videoId: string, 
  privacyStatus: 'public' | 'private' | 'unlisted'
): Promise<boolean> {
  const youtube = google.youtube({ version: 'v3', auth })
  
  try {
    await (youtube.videos.update as any)({
      part: ['status'],
      requestBody: {
        id: videoId,
        status: {
          privacyStatus,
          selfDeclaredMadeForKids: false,
        },
      },
    })
    return true
  } catch (error) {
    console.error(`Failed to update video ${videoId}:`, error)
    return false
  }
}

export async function publishVideos(
  auth: any, 
  videoIds: string[], 
  onProgress?: (current: number, total: number, videoId: string) => void
): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0
  let failed = 0
  const errors: string[] = []
  
  for (let i = 0; i < videoIds.length; i++) {
    const videoId = videoIds[i]
    
    try {
      const result = await updateVideoStatus(auth, videoId, 'public')
      
      if (result) {
        success++
      } else {
        failed++
        errors.push(`Video ${videoId}: Update failed`)
      }
    } catch (error: any) {
      failed++
      errors.push(`Video ${videoId}: ${error.message}`)
    }
    
    if (onProgress) {
      onProgress(i + 1, videoIds.length, videoId)
    }
    
    if (i < videoIds.length - 1) {
      await sleep(1000)
    }
  }
  
  return { success, failed, errors }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
