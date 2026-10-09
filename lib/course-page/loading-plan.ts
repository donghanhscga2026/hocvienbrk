type PublishedPage = {
  useTemplate?: boolean
  theme?: unknown
  sections?: { enabled?: boolean; variant?: string }[]
} | null

/** Chỉ mẫu ZIP nguyên trang trên WI300 mới không cần dữ liệu section hệ thống. */
export function courseLoadingPlan(page: PublishedPage, wi300: boolean, notificationLesson?: unknown) {
  const sections = page?.sections?.filter(section => section.enabled !== false) || []
  const theme = page?.theme as { importedLayout?: boolean } | undefined
  const zipOnly = wi300 && page?.useTemplate !== false && theme?.importedLayout === true
    && sections.length > 0 && sections.every(section => section.variant === 'zip-source-v1')
  return {
    // Link từ thông báo vẫn cần xác minh bài thuộc khóa học trước khi mở.
    lessons: !zipOnly || (typeof notificationLesson === 'string' && notificationLesson.length > 0),
    statistics: !zipOnly,
    testimonials: !zipOnly,
  }
}
