const STORAGE_PREFIX = '/storage/v1/object/public/uploads/course-template-sources/'

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
