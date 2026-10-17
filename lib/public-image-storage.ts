import 'server-only'
import { randomUUID } from 'node:crypto'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import sharp from 'sharp'

// Only public artwork belongs in this bucket. Proofs/comments keep their existing storage flow.
const publicDirectories = new Set(['courses', 'avatars', 'posts', 'course-templates', 'products', 'projects', 'site-profiles', 'logos', 'banners'])
export const isPublicImageDirectory = (directory: string) => publicDirectories.has(directory)
const MAX_BYTES = 8 * 1024 * 1024

export class PublicImageStorageError extends Error {
  constructor(message: string, readonly status = 503) { super(message); this.name = 'PublicImageStorageError' }
}

/** Read server configuration lazily: builds and external image links do not need R2 credentials. */
export function r2ImageConfig(env: NodeJS.ProcessEnv = process.env) {
  const accountId = env.R2_ACCOUNT_ID?.trim(), bucket = env.R2_BUCKET?.trim()
  const accessKeyId = env.R2_ACCESS_KEY_ID?.trim(), secretAccessKey = env.R2_SECRET_ACCESS_KEY?.trim()
  if (!accountId || !bucket || !accessKeyId || !secretAccessKey || !env.R2_PUBLIC_BASE_URL?.trim()) {
    throw new PublicImageStorageError('Kho ảnh R2 chưa được cấu hình. Hãy dùng link ảnh HTTPS hoặc nhờ admin cấu hình kho ảnh.')
  }
  let publicUrl: URL
  try { publicUrl = new URL(env.R2_PUBLIC_BASE_URL.trim()) } catch { throw new PublicImageStorageError('Đường dẫn công khai của kho ảnh R2 không hợp lệ.') }
  if (!/^[a-f0-9]{32}$/i.test(accountId) || !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket) || publicUrl.protocol !== 'https:' || publicUrl.username || publicUrl.password || publicUrl.search || publicUrl.hash) {
    throw new PublicImageStorageError('Cấu hình kho ảnh R2 không hợp lệ. Vui lòng kiểm tra lại tài khoản, bucket và tên miền ảnh.')
  }
  return { endpoint: `https://${accountId}.r2.cloudflarestorage.com`, bucket, accessKeyId, secretAccessKey, publicBase: publicUrl.toString().replace(/\/$/, '') }
}

/** Validate the actual file bytes, normalize orientation/size, then upload using server-only credentials. */
export async function uploadPublicImage(input: Buffer, directory: string): Promise<string> {
  if (!isPublicImageDirectory(directory)) throw new PublicImageStorageError('Thư mục ảnh công khai không hợp lệ.', 400)
  if (!input.length || input.length > MAX_BYTES) throw new PublicImageStorageError('Ảnh phải có dung lượng từ 1 byte đến 8 MB.', 400)
  const config = r2ImageConfig()
  let buffer: Buffer, contentType: string, extension: string
  try {
    const source = sharp(input, { limitInputPixels: 40_000_000 })
    const meta = await source.metadata()
    if (!meta.format || !['jpeg', 'png', 'webp', 'gif', 'avif'].includes(meta.format)) throw new Error('format')
    // Preserve animated GIFs rather than silently flattening their frames.
    if (meta.format === 'gif') { buffer = input; contentType = 'image/gif'; extension = 'gif' }
    else {
      buffer = await source.rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer()
      contentType = 'image/webp'; extension = 'webp'
    }
  } catch { throw new PublicImageStorageError('File không phải ảnh được hỗ trợ hoặc có kích thước điểm ảnh quá lớn.', 400) }
  const key = `images/${directory}/${randomUUID()}.${extension}`
  const client = new S3Client({ region: 'auto', endpoint: config.endpoint, credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey }, maxAttempts: 2, requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED' })
  try {
    await client.send(new PutObjectCommand({ Bucket: config.bucket, Key: key, Body: buffer, ContentType: contentType, ContentLength: buffer.length, CacheControl: 'public, max-age=31536000, immutable' }), { abortSignal: AbortSignal.timeout(15000) })
  } catch {
    // Never return credentials/provider diagnostics or fall back to Supabase after an R2 failure.
    throw new PublicImageStorageError('Không thể lưu ảnh lên R2. Vui lòng thử lại hoặc dùng link ảnh HTTPS.')
  } finally { client.destroy() }
  return config.publicBase + '/' + key
}
