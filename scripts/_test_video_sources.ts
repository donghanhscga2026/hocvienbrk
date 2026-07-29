import 'dotenv/config'

// Inline the detectVideoSource logic so we don't depend on Next.js module resolution
type VideoPlatform =
  | 'youtube' | 'vimeo' | 'dailymotion' | 'tiktok' | 'facebook' | 'drive' | 'mp4' | 'unknown'

interface VideoSource {
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

function detectVideoSource(url: string): VideoSource {
  if (!url) return { platform: 'unknown', embedUrl: null, trackable: true, videoId: null }
  const trimmed = url.trim()
  const ytId = extractYouTubeId(trimmed)
  if (ytId) return { platform: 'youtube', embedUrl: `https://www.youtube.com/embed/${ytId}`, trackable: true, videoId: ytId }
  const vimeoId = extractVimeoId(trimmed)
  if (vimeoId) return { platform: 'vimeo', embedUrl: `https://player.vimeo.com/video/${vimeoId}`, trackable: true, videoId: vimeoId }
  const dmId = extractDailymotionId(trimmed)
  if (dmId) return { platform: 'dailymotion', embedUrl: `https://www.dailymotion.com/embed/video/${dmId}`, trackable: true, videoId: dmId }
  const ttId = extractTikTokId(trimmed)
  if (ttId) return { platform: 'tiktok', embedUrl: `https://www.tiktok.com/embed/v2/${ttId}`, trackable: false, videoId: ttId }
  const fbId = extractFacebookVideoId(trimmed)
  if (fbId) return { platform: 'facebook', embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(trimmed)}`, trackable: false, videoId: fbId }
  const driveId = extractDriveId(trimmed)
  if (driveId) return { platform: 'drive', embedUrl: `https://drive.google.com/file/d/${driveId}/preview`, trackable: false, videoId: driveId }
  if (isDirectMp4(trimmed)) return { platform: 'mp4', embedUrl: trimmed, trackable: true, videoId: null }
  return { platform: 'unknown', embedUrl: trimmed, trackable: false, videoId: null }
}

// ---- TEST CASES ----
const testCases: { name: string; url: string; expectedPlatform: VideoPlatform }[] = [
  { name: 'YouTube watch', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', expectedPlatform: 'youtube' },
  { name: 'YouTube short url', url: 'https://youtu.be/dQw4w9WgXcQ', expectedPlatform: 'youtube' },
  { name: 'YouTube live', url: 'https://youtube.com/live/rrY-2dHWjk4', expectedPlatform: 'youtube' },
  { name: 'YouTube shorts', url: 'https://youtube.com/shorts/dQw4w9WgXcQ', expectedPlatform: 'youtube' },
  { name: 'YouTube embed', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', expectedPlatform: 'youtube' },
  { name: 'Vimeo', url: 'https://vimeo.com/76979871', expectedPlatform: 'vimeo' },
  { name: 'Vimeo player', url: 'https://player.vimeo.com/video/76979871', expectedPlatform: 'vimeo' },
  { name: 'Dailymotion', url: 'https://www.dailymotion.com/video/x8d5e1', expectedPlatform: 'dailymotion' },
  { name: 'Dailymotion short', url: 'https://dai.ly/x8d5e1', expectedPlatform: 'dailymotion' },
  { name: 'TikTok', url: 'https://www.tiktok.com/@user/video/1234567890123456789', expectedPlatform: 'tiktok' },
  { name: 'Facebook', url: 'https://www.facebook.com/user/videos/1234567890', expectedPlatform: 'facebook' },
  { name: 'Google Drive', url: 'https://drive.google.com/file/d/1ABCxyz123/view', expectedPlatform: 'drive' },
  { name: 'Google Drive open', url: 'https://drive.google.com/open?id=1ABCxyz123', expectedPlatform: 'drive' },
  { name: 'Direct MP4', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', expectedPlatform: 'mp4' },
  { name: 'Direct MP4 with query', url: 'https://example.com/video.mp4?token=abc', expectedPlatform: 'mp4' },
  { name: 'Unknown URL', url: 'https://example.com/some-video', expectedPlatform: 'unknown' },
  { name: 'Pipe-delimited YouTube (raw)', url: '[Phần 1]https://youtube.com/watch?v=dQw4w9WgXcQ', expectedPlatform: 'youtube' },
  { name: 'Empty string', url: '', expectedPlatform: 'unknown' },
]

let passed = 0
let failed = 0

for (const tc of testCases) {
  // For pipe-delimited, extract URL after bracket
  const videoMatch = tc.url.match(/^\[(.*?)\](.*)$/)
  const docMatch = tc.url.match(/^\((.*?)\)(.*)$/)
  const testUrl = videoMatch?.[2]?.trim() || docMatch?.[2]?.trim() || tc.url
  const result = detectVideoSource(testUrl)
  const ok = result.platform === tc.expectedPlatform
  if (ok) {
    passed++
    console.log(`  ✅ ${tc.name}: ${result.platform} (trackable=${result.trackable})`)
  } else {
    failed++
    console.log(`  ❌ ${tc.name}: expected ${tc.expectedPlatform}, got ${result.platform} (url="${testUrl}")`)
  }
}

console.log(`\n${'='.repeat(50)}`)
console.log(`Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests`)
console.log(`Trackable platforms: youtube, vimeo, dailymotion, mp4`)
console.log(`Non-trackable: tiktok, facebook, drive, unknown`)
