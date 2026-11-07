// Thư viện bài giảng thông minh — liệt kê các học phần VIDEO trong 1 Lesson,
// giữ đúng chỉ số playlist mà CoursePlayer/VideoPlayer dùng cho Segment.videoIndex.
//
// Quy tắc khớp components/course/VideoPlayer.tsx#buildPlaylist (góc nhìn học viên):
// - videoUrl gồm nhiều phần nối bằng "|": "[Tiêu đề]url" = video, "(Tiêu đề)url" = tài liệu,
//   không tiền tố = video (hoặc tài liệu nếu cả bài là DOCS).
// - Bài type=ALL có nội dung văn bản → player chèn 1 phần "text" ở vị trí 0,
//   các phần media lùi 1 chỉ số.

import { detectVideoSource } from '@/lib/video-sources'

export type LessonVideoPart = {
    /** Chỉ số trong playlist của player — dùng làm Segment.videoIndex. */
    index: number
    title: string
    url: string
    youtubeId: string | null
}

export function listVideoParts(lesson: {
    videoUrl?: string | null
    type?: string | null
    content?: string | null
}): LessonVideoPart[] {
    if (!lesson.videoUrl) return []
    const lessonType = lesson.type || 'VIDEO'
    const offset = lessonType === 'ALL' && lesson.content ? 1 : 0
    const parts: LessonVideoPart[] = []
    lesson.videoUrl.split('|').forEach((raw, i) => {
        const item = raw.trim()
        if (!item) return
        const videoMatch = item.match(/^\[(.*?)\](.*)$/)
        const docMatch = item.match(/^\((.*?)\)(.*)$/)
        let kind: 'video' | 'doc'
        let title = ''
        let url = item
        if (videoMatch) { kind = 'video'; title = videoMatch[1]; url = videoMatch[2].trim() }
        else if (docMatch) { kind = 'doc'; title = docMatch[1]; url = docMatch[2].trim() }
        else kind = lessonType === 'DOCS' ? 'doc' : 'video'
        if (kind !== 'video' || !url) return
        const source = detectVideoSource(url)
        parts.push({
            index: i + offset,
            title: title || `Phần ${i + 1}`,
            url,
            youtubeId: source.platform === 'youtube' ? source.videoId : null,
        })
    })
    return parts
}
