export async function templateWorkspaceRequest(url: string, input?: unknown, signal?: AbortSignal) {
  const controller = new AbortController(), abort = () => controller.abort()
  signal?.addEventListener('abort', abort, { once: true })
  if (signal?.aborted) controller.abort()
  const timer = setTimeout(abort, input ? 90000 : 25000)
  try {
    let body: Blob | undefined, type = 'application/json'
    if (input) {
      body = new Blob([JSON.stringify(input)], { type })
      if (body.size > 10 * 1024 * 1024) throw new Error('Dữ liệu mẫu vượt 10 MB.')
      if (typeof CompressionStream !== 'undefined') { body = await new Response(body.stream().pipeThrough(new CompressionStream('gzip'))).blob(); type = 'application/gzip' }
      if (body.size > 4 * 1024 * 1024) throw new Error('Dữ liệu gửi vượt 4 MB. Hãy giảm ảnh hoặc số file.')
    }
    const response = await fetch(url, { method: input ? 'POST' : 'GET', body, headers: input ? { 'Content-Type': type } : undefined, cache: 'no-store', signal: controller.signal })
    const text = await response.text(); let result
    try { result = JSON.parse(text) } catch { throw new Error('Máy chủ chưa trả kết quả hợp lệ. Hãy kiểm tra thư viện trước khi lưu lại.') }
    if (!response.ok) throw new Error(result.error || 'Không xử lý được mẫu.')
    return result
  } catch (error) { if (controller.signal.aborted) throw new Error('Chưa nhận được phản hồi. Mã đang sửa được giữ lại; hãy kiểm tra thư viện trước khi lưu lại.'); throw error }
  finally { clearTimeout(timer); signal?.removeEventListener('abort', abort) }
}
