'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Trang khóa học đã được tải thật nên Next.js có thể phục hồi đúng khi Back.
// Không chặn nút Back hay tự tạo trạng thái nội bộ của router.
export default function NotificationLessonEntry({
    courseSlug, lessonId,
}: { courseSlug: string; lessonId: string }) {
    const router = useRouter()

    useEffect(() => {
        const current = new URL(window.location.href)
        if (current.searchParams.get('notificationLesson') !== lessonId) return

        // Xóa lệnh tự mở ở mục lịch sử khóa học: Back không mở lại bài.
        // Giữ nguyên state của Next.js, kể cả khi effect chạy trước router.
        current.searchParams.delete('notificationLesson')
        window.history.replaceState(window.history.state, '', current.href)
        router.push(`/courses/${encodeURIComponent(courseSlug)}/learn?lesson=${encodeURIComponent(lessonId)}`)
    }, [courseSlug, lessonId, router])

    return null
}
