'use client'

import { useEffect } from 'react'

// Giữ trang khóa học thật trong lịch sử; không chặn nút Back của điện thoại.
export default function NotificationLessonEntry({
    courseSlug, lessonId,
}: { courseSlug: string; lessonId: string }) {
    useEffect(() => {
        const current = new URL(window.location.href)
        if (current.searchParams.get('notificationLesson') !== lessonId) return

        // Xóa lệnh tự mở để Back hoặc tải lại khóa học không mở lại bài.
        // Giữ nguyên state của Next.js, không giả lập cây điều hướng.
        current.searchParams.delete('notificationLesson')
        window.history.replaceState(window.history.state, '', current.href)

        // Điều hướng trang đầy đủ: Back vẫn phục hồi khóa học kể cả khi
        // bài vừa tải lại và trình xử lý lịch sử của Next.js chưa sẵn sàng.
        window.location.assign(`/courses/${encodeURIComponent(courseSlug)}/learn?lesson=${encodeURIComponent(lessonId)}`)
    }, [courseSlug, lessonId])

    return null
}
