const STORAGE_PREFIX = '/storage/v1/object/public/uploads/course-template-sources/'

export function zipCourseLinks(pathname: string): Record<string, string> {
  if (pathname === '/khoa-hoc/BAN_DO_TAI_CHINH') return { '2': '/khoa-hoc/KICH_HOAT_DONG_TIEN' }
  if (pathname === '/khoa-hoc/KICH_HOAT_DONG_TIEN') return { '21': '/khoa-hoc/BAN_DO_TAI_CHINH' }
  return {}
}

export function zipSelectedBlockKeys(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  const keys = value.filter((key): key is string => typeof key === 'string')
  // The old analyzer collapsed the entire document into this synthetic block.
  // It represents the full page, rather than a real data-mfc-block in the ZIP.
  return keys.length === 1 && keys[0] === 'imported-1' ? null : keys
}

// Only sources uploaded by this importer may be served as HTML by the application.
export function resolveZipStorageSource(value: string, supabaseUrl: string): URL | null {
  try {
    const source = new URL(value)
    const storage = new URL(supabaseUrl)
    if (storage.protocol !== 'https:' || source.origin !== storage.origin ||
        source.username || source.password || source.search || source.hash ||
        !source.pathname.startsWith(STORAGE_PREFIX)) return null
    const filename = source.pathname.slice(STORAGE_PREFIX.length)
    if (!/^[a-z0-9_-]+\.html$/i.test(filename)) return null
    return source
  } catch {
    return null
  }
}

export function zipFrameSource(value: string, supabaseUrl: string): string {
  return resolveZipStorageSource(value, supabaseUrl)
    ? `/api/course-template-source?source=${encodeURIComponent(value)}`
    : value
}
