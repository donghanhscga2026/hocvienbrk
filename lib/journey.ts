/**
 * Hành trình theo ngày cho một khóa học — logic thuần. GĐ4 (24/10/2026).
 * Bài học sắp theo `order`. Mỗi bài đánh dấu thử thách ngày
 * (isDailyChallenge) mở đầu một "Ngày" mới; các bài thường đi kèm thuộc
 * về ngày gần nhất phía trước. Bài nằm trước ngày đầu tiên vào nhóm
 * "Chuẩn bị". Khóa không có bài thử thách ngày → một nhóm "Tất cả bài học".
 */

export interface JourneyLesson {
    id: string
    title: string
    order: number
    isDailyChallenge: boolean
    completed: boolean
}

export interface JourneyDay {
    label: string
    dayNumber: number | null
    lessons: JourneyLesson[]
    completedCount: number
}

export function groupLessonsByDay(lessons: JourneyLesson[]): JourneyDay[] {
    const sorted = [...lessons].sort((a, b) => a.order - b.order)
    const hasDaily = sorted.some((l) => l.isDailyChallenge)
    if (!hasDaily) {
        return [{
            label: 'Tất cả bài học',
            dayNumber: null,
            lessons: sorted,
            completedCount: sorted.filter((l) => l.completed).length,
        }]
    }
    const days: JourneyDay[] = []
    let current: JourneyDay = { label: 'Chuẩn bị', dayNumber: null, lessons: [], completedCount: 0 }
    days.push(current)
    let day = 0
    for (const lesson of sorted) {
        if (lesson.isDailyChallenge) {
            day++
            current = { label: `Ngày ${day}`, dayNumber: day, lessons: [], completedCount: 0 }
            days.push(current)
        }
        current.lessons.push(lesson)
        if (lesson.completed) current.completedCount++
    }
    return days.filter((d) => d.lessons.length > 0)
}
