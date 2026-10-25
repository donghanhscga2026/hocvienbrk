import { compileTemplateSource, sourceFromHtml } from './template-source'
import { validateCourseCodeAssets } from './course-code-assets'

export class CourseCodeError extends Error {
  constructor(message: string, public status = 400) { super(message) }
}

export const MAX_COURSE_CODE_BYTES = 1024 * 1024

/** Một trang code nhỏ, ảnh dùng URL; không lưu file hay tạo bản sao trong kho mẫu. */
export function compileCourseCode(html: string) {
  if (new TextEncoder().encode(html).length > MAX_COURSE_CODE_BYTES) throw new CourseCodeError('Code vượt 1 MB. Hãy rút gọn mã và dùng đường dẫn ảnh HTTPS.', 413)
  let compiled
  try { validateCourseCodeAssets(html); compiled = compileTemplateSource(sourceFromHtml(html)); validateCourseCodeAssets(compiled.html) }
  catch (error) { throw new CourseCodeError(error instanceof Error ? error.message : 'Code không hợp lệ.') }
  if (new TextEncoder().encode(compiled.html).length > MAX_COURSE_CODE_BYTES) throw new CourseCodeError('Trang sau xử lý vượt 1 MB. Hãy rút gọn code.', 413)
  return compiled
}

/** Mẫu có thư viện hỗ trợ được đóng gói trên server; HTML thường preview tại chỗ. */
export function needsCourseCodePreparation(html: string) {
  return /cdn\.tailwindcss\.com|@tailwindcss\/browser|data-course-tailwind-config|data-aos|\bAOS\s*\.|data-course-library/i.test(html)
}
