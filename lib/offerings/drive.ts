export type DriveLinkInfo = { type: 'folder' | 'file'; id: string; embedUrl: string }

export function driveLinkInfo(raw: string): DriveLinkInfo | null {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return null
  }
  if (url.hostname === 'drive.google.com') {
    const folder = url.pathname.match(/^\/drive\/(?:u\/\d+\/)?folders\/([\w-]+)/)?.[1]
    if (folder)
      return {
        type: 'folder',
        id: folder,
        embedUrl: `https://drive.google.com/embeddedfolderview?id=${folder}#list`,
      }
    const file = url.pathname.match(/^\/file\/d\/([\w-]+)/)?.[1] || url.searchParams.get('id')
    if (file && /^[\w-]+$/.test(file))
      return { type: 'file', id: file, embedUrl: `https://drive.google.com/file/d/${file}/preview` }
    return null
  }
  if (/^(docs|sheets|slides)\.google\.com$/.test(url.hostname)) {
    const path = url.pathname.match(/^\/(document|spreadsheets|presentation)\/d\/([\w-]+)/)
    if (path)
      return { type: 'file', id: path[2], embedUrl: `${url.origin}/${path[1]}/d/${path[2]}/preview` }
  }
  return null
}

export function driveLinkHint(raw: string) {
  const info = driveLinkInfo(raw)
  if (!info) return null
  return info.type === 'folder'
    ? 'Đã nhận diện: thư mục Google Drive. Khách sẽ thấy danh sách file ngay trong trang — nhớ để thư mục ở chế độ ai có liên kết đều xem được.'
    : 'Đã nhận diện: tệp Google Drive. Khách sẽ xem trước ngay trong trang.'
}

export type DriveEntry = { id: string; name: string; type: 'folder' | 'file'; children?: DriveEntry[] }

function decodeEntities(text: string) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

/** Đọc danh sách file từ HTML của trang nhúng thư mục Drive (embeddedfolderview). */
export function parseDriveFolderListing(html: string): DriveEntry[] {
  const entries: DriveEntry[] = []
  const seen = new Set<string>()
  const pattern =
    /<a[^>]+href="https:\/\/drive\.google\.com\/(?:file\/d\/([\w-]+)|drive\/folders\/([\w-]+))[^"]*"[^>]*>([\s\S]*?)<\/a>/g
  for (const match of html.matchAll(pattern)) {
    const fileId = match[1]
    const folderId = match[2]
    const id = fileId || folderId
    if (!id || seen.has(id)) continue
    const name = decodeEntities(match[3].replace(/<[^>]+>/g, ' '))
      .replace(/\s+/g, ' ')
      .trim()
    if (!name) continue
    seen.add(id)
    entries.push({ id, name, type: folderId ? 'folder' : 'file' })
  }
  return entries
}

const MAX_TREE_ENTRIES = 300

async function fetchFolderEntries(folderId: string): Promise<DriveEntry[]> {
  const response = await fetch(`https://drive.google.com/embeddedfolderview?id=${folderId}#list`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Wi300/1.0)' },
    next: { revalidate: 600 },
  })
  if (!response.ok) throw new Error(`Drive trả lỗi ${response.status}`)
  return parseDriveFolderListing(await response.text())
}

/** Cây file trong thư mục Drive công khai: thư mục gốc + tối đa 2 tầng thư mục con. */
export async function fetchDriveFolderTree(folderId: string): Promise<DriveEntry[]> {
  const counter = { count: 0 }
  const walk = async (id: string, depth: number): Promise<DriveEntry[]> => {
    const entries = await fetchFolderEntries(id)
    const result: DriveEntry[] = []
    for (const entry of entries) {
      if (counter.count >= MAX_TREE_ENTRIES) break
      counter.count += 1
      if (entry.type === 'folder' && depth < 2) {
        try {
          entry.children = await walk(entry.id, depth + 1)
        } catch {
          entry.children = []
        }
      }
      result.push(entry)
    }
    return result
  }
  return walk(folderId, 0)
}
