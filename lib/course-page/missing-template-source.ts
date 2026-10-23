/** Storage cũ có thể trả HTTP 400 kèm lỗi 404 trong JSON. Không coi lỗi quyền/mạng là file đã mất. */
export async function isMissingTemplateSource(response: Response): Promise<boolean> {
  if (response.status === 404 || response.status === 410) return true
  if (response.status !== 400) return false
  try {
    const error = await response.clone().json()
    return error?.code === 'NoSuchKey' ||
      (String(error?.statusCode) === '404' && error?.error === 'Not Found' && error?.message === 'Object not found')
  } catch { return false }
}
