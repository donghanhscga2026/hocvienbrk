import { compileTemplateSource, sourceFromHtml } from './template-source'

export class CourseCodeError extends Error {
  constructor(message: string, public status = 400) { super(message) }
}

export const MAX_COURSE_CODE_BYTES = 1024 * 1024

/** Một trang code nhỏ, ảnh dùng URL; không lưu file hay tạo bản sao trong kho mẫu. */
export function compileCourseCode(html: string) {
  if (new TextEncoder().encode(html).length > MAX_COURSE_CODE_BYTES) throw new CourseCodeError('Code vượt 1 MB. Hãy rút gọn mã và dùng đường dẫn ảnh HTTPS.', 413)
  if (/data\s*:\s*[^\s"'<>]*;base64\s*,/i.test(html)) throw new CourseCodeError('Không nhúng ảnh hoặc file Base64 vào code. Hãy dùng đường dẫn HTTPS.')
  let compiled
  try { compiled = compileTemplateSource(sourceFromHtml(html)) }
  catch (error) { throw new CourseCodeError(error instanceof Error ? error.message : 'Code không hợp lệ.') }
  if (/data\s*:\s*[^\s"'<>]*;base64\s*,/i.test(compiled.html)) throw new CourseCodeError('Không nhúng ảnh hoặc file Base64 vào code. Hãy dùng đường dẫn HTTPS.')
  if (new TextEncoder().encode(compiled.html).length > MAX_COURSE_CODE_BYTES) throw new CourseCodeError('Trang sau xử lý vượt 1 MB. Hãy rút gọn code.', 413)
  return compiled
}
