import type { WebsiteTemplateAnalysis } from './types'

export type SaveTemplateInput = {
  name: string
  description?: string
  analysis: WebsiteTemplateAnalysis
  selectedSectionIds: string[]
}

// API riêng tránh giới hạn 1 MB của Server Action khi gửi CSS và HTML đã phân tích.
export async function saveImportedTemplate(input: SaveTemplateInput) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 90_000)
  try {
    const json = new Blob([JSON.stringify(input)], { type: 'application/json' })
    if (json.size > 16 * 1024 * 1024) throw new Error('Dữ liệu mẫu vượt quá 16 MB. Hãy giảm ảnh nhúng hoặc nội dung rồi thử lại.')
    let body: Blob = json
    let contentType = 'application/json'
    if (typeof CompressionStream !== 'undefined') {
      body = await new Response(json.stream().pipeThrough(new CompressionStream('gzip'))).blob()
      contentType = 'application/gzip'
    }
    if (body.size > 4 * 1024 * 1024) throw new Error('Dữ liệu gửi vẫn vượt quá 4 MB. Hãy giảm ảnh nhúng trong mẫu rồi thử lại.')
    const response = await fetch('/api/admin/course-page-templates/create', {
      method: 'POST', headers: { 'Content-Type': contentType }, body,
      signal: controller.signal,
    })
    const text = await response.text()
    let result
    try { result = JSON.parse(text) } catch {
      throw new Error(response.status === 413
        ? 'Dữ liệu mẫu vượt giới hạn máy chủ.'
        : `Máy chủ chưa trả kết quả lưu hợp lệ (HTTP ${response.status}). Hãy kiểm tra thư viện trước khi tạo lại.`)
    }
    if (!response.ok || !result?.success) throw new Error(result?.error || `Không thể tạo mẫu (HTTP ${response.status}).`)
    return result as { success: true; template: { id: string; key: string; name: string } }
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Chưa nhận được kết quả lưu sau 90 giây. Hãy kiểm tra thư viện mẫu trước khi tạo lại để tránh trùng mẫu.')
    if (error instanceof TypeError) throw new Error('Kết nối bị gián đoạn khi lưu mẫu. Hãy kiểm tra thư viện trước khi tạo lại.')
    throw error
  } finally {
    clearTimeout(timer)
  }
}
