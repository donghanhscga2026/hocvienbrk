// ========== BƯỚC 1: COURSE PLAYER - SAU KHI SỬA ==========
// Ngày: 2026-03-24
// Trạng thái: ✅ HOÀN THÀNH
// ==========================================================

/* FILE: app/courses/[id]/learn/page.tsx - SAU KHI SỬA */

// 1. Đã xóa dòng: export const dynamic = "force-dynamic"; 

// 2. Thêm functions parse playlist ở đầu file:
type PlaylistItem = {
  type: 'video' | 'doc'
  title: string
  url: string
  id?: string | null
}

function extractVideoId(url: string) {
  if (!url) return null
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?v=)|(shorts\/)|(live\/)|(\&v=))([^#\&\?]*).*/
  const match = url.match(regExp)
  if (match && match.length > 0) {
    const id = match[match.length - 1]
    return (id && id.length === 11) ? id : null
  }
  return null
}

function parsePlaylist(videoUrl: string | null): PlaylistItem[] {
  if (!videoUrl) return []
  return videoUrl.split('|').map((item, index) => {
    const videoMatch = item.match(/^\[(.*?)\](.*)$/)
    if (videoMatch) return { type: 'video' as const, title: videoMatch[1], url: videoMatch[2].trim(), id: extractVideoId(videoMatch[2].trim()) }
    const docMatch = item.match(/^\((.*?)\)(.*)$/)
    if (docMatch) return { type: 'doc' as const, title: docMatch[1], url: docMatch[2].trim() }
    return { type: 'video' as const, title: `Phần ${index + 1}`, url: item.trim(), id: extractVideoId(item.trim()) }
  })
}

// 3. Parse playlist trước khi truyền vào CoursePlayer:
const lessonsWithPlaylist = enrollment.course.lessons.map((lesson: any) => ({
  ...lesson,
  playlist: parsePlaylist(lesson.videoUrl)
}))

// 4. Truyền lessons đã parse:
<CoursePlayer
  course={{ ...enrollment.course, lessons: lessonsWithPlaylist }}
  enrollment={enrollment}
  session={session}
/>


/* FILE: components/course/VideoPlayer.tsx - SAU KHI SỬA */

// 1. Thêm prop serverPlaylist vào interface:
interface VideoPlayerProps {
    // ... các prop cũ
    serverPlaylist?: PlaylistItem[] // [OPTIMIZE] Parse sẵn từ Server, giảm CPU client
}

// 2. Thêm hàm extractVideoId (để dùng trong useMemo fallback)
function extractVideoId(url: string): string | null {
    if (!url) return null
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?v=)|(shorts\/)|(live\/)|(\&v=))([^#\&\?]*).*/
    const match = url.match(regExp)
    if (match && match.length > 0) {
        const id = match[match.length - 1]
        return (id && id.length === 11) ? id : null
    }
    return null
}

// 3. Thay đổi useMemo để ưu tiên serverPlaylist:
const playlist = useMemo(() => {
    if (serverPlaylist) return serverPlaylist // [OPTIMIZE] Server đã parse sẵn
    if (!videoUrl) return []
    return videoUrl.split('|').map((item, index) => {
        const videoMatch = item.match(/^\[(.*?)\](.*)$/)
        if (videoMatch) return { type: 'video' as const, title: videoMatch[1], url: videoMatch[2].trim(), id: extractVideoId(videoMatch[2].trim()) }
        const docMatch = item.match(/^\((.*?)\)(.*)$/)
        if (docMatch) return { type: 'doc' as const, title: docMatch[1], url: docMatch[2].trim() }
        return { type: 'video' as const, title: `Phần ${index + 1}`, url: item.trim(), id: extractVideoId(item.trim()) }
    })
}, [videoUrl, serverPlaylist])


/* FILE: components/course/CoursePlayer.tsx - SAU KHI SỬA */

// Truyền serverPlaylist vào VideoPlayer:
<VideoPlayer
    key={currentLessonId}
    enrollmentId={enrollment.id}
    lessonId={currentLessonId!}
    videoUrl={currentLesson?.videoUrl || null}
    lessonContent={currentLesson?.content || null}
    initialMaxTime={currentProgress?.maxTime || 0}
    playlistData={currentProgress?.scores?.playlist}
    lastVideoIndex={currentProgress?.scores?.lastVideoIndex}
    serverPlaylist={currentLesson?.playlist} // [OPTIMIZE] Truyền playlist đã parse từ Server
    onProgress={handleVideoProgress}
    onPercentChange={setVideoPercent}
/>


/* TÁC DỤNG CỦA THAY ĐỔI:
1. Xóa dynamic = "force-dynamic" → TTFB cải thiện, Next.js cache được page
2. Server parse playlist 1 lần → Giảm CPU client, không cần regex mỗi lần render
3. Backward compatible: nếu không có serverPlaylist vẫn parse bình thường từ videoUrl
*/
