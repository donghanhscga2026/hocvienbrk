export type VideoPlatform =
  | 'youtube'
  | 'vimeo'
  | 'dailymotion'
  | 'tiktok'
  | 'facebook'
  | 'drive'
  | 'mp4'
  | 'unknown'

export interface VideoSource {
  platform: VideoPlatform
  embedUrl: string | null
  trackable: boolean
  videoId: string | null
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

function extractVimeoId(url: string): string | null {
  const m = url.match(/(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)/)
  return m ? m[1] : null
}

function extractDailymotionId(url: string): string | null {
  const m = url.match(/(?:dailymotion\.com\/(?:video|embed\/video)\/|dai\.ly\/)([a-zA-Z0-9]+)/)
  return m ? m[1] : null
}

function extractTikTokId(url: string): string | null {
  const m = url.match(/tiktok\.com\/@[\w.-]+\/video\/(\d+)/)
  return m ? m[1] : null
}

function extractFacebookVideoId(url: string): string | null {
  const m = url.match(/facebook\.com\/[\w.]+\/videos\/(\d+)/)
  return m ? m[1] : null
}

function extractDriveId(url: string): string | null {
  const m = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/)
  return m ? m[1] : null
}

function isDirectMp4(url: string): boolean {
  return /\.mp4(\?|#|$)/i.test(url)
}

export function detectVideoSource(url: string): VideoSource {
  if (!url) return { platform: 'unknown', embedUrl: null, trackable: true, videoId: null }

  const trimmed = url.trim()

  const ytId = extractYouTubeId(trimmed)
  if (ytId) {
    return {
      platform: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${ytId}`,
      trackable: true,
      videoId: ytId,
    }
  }

  const vimeoId = extractVimeoId(trimmed)
  if (vimeoId) {
    return {
      platform: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoId}`,
      trackable: true,
      videoId: vimeoId,
    }
  }

  const dmId = extractDailymotionId(trimmed)
  if (dmId) {
    return {
      platform: 'dailymotion',
      embedUrl: `https://www.dailymotion.com/embed/video/${dmId}`,
      trackable: true,
      videoId: dmId,
    }
  }

  const ttId = extractTikTokId(trimmed)
  if (ttId) {
    return {
      platform: 'tiktok',
      embedUrl: `https://www.tiktok.com/embed/v2/${ttId}`,
      trackable: false,
      videoId: ttId,
    }
  }

  const fbId = extractFacebookVideoId(trimmed)
  if (fbId) {
    return {
      platform: 'facebook',
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(trimmed)}`,
      trackable: false,
      videoId: fbId,
    }
  }

  const driveId = extractDriveId(trimmed)
  if (driveId) {
    return {
      platform: 'drive',
      embedUrl: `https://drive.google.com/file/d/${driveId}/preview`,
      trackable: false,
      videoId: driveId,
    }
  }

  if (isDirectMp4(trimmed)) {
    return {
      platform: 'mp4',
      embedUrl: trimmed,
      trackable: true,
      videoId: null,
    }
  }

  return { platform: 'unknown', embedUrl: trimmed, trackable: false, videoId: null }
}

export function isYouTube(url: string): boolean {
  return /youtu\.be\/|youtube\.com\//i.test(url)
}

export function isTrackable(url: string): boolean {
  return detectVideoSource(url).trackable
}