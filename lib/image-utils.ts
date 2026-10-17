import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { isPublicImageDirectory, uploadPublicImage } from './public-image-storage';
import { isBlockedHost } from './security/url-safety';

/**
 * Ảnh công khai đi R2; file nghiệp vụ/template nguồn giữ luồng Supabase hiện có.
 * Nhánh R2 không ghi ổ đĩa và không tự quay lại Supabase khi lỗi.
 * Dùng cho các route nhận file qua FormData (khác saveBase64Image ở trên,
 * vốn dành cho ảnh dạng base64).
 */
export async function saveUploadedFile(
    buffer: Buffer,
    filename: string,
    subDir: string,
    contentType: string
): Promise<string> {
    if (isPublicImageDirectory(subDir)) return uploadPublicImage(buffer, subDir);
    const { supabase } = await import('./supabase');
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('uploads')
            .upload(`${subDir}/${filename}`, buffer, {
                contentType,
                cacheControl: '31536000',
                upsert: true
            });

        if (uploadError) {
            console.error(`❌ [saveUploadedFile] Lỗi Supabase Storage:`, uploadError.message);
        } else if (uploadData) {
            const { data: publicUrlData } = supabase.storage
                .from('uploads')
                .getPublicUrl(`${subDir}/${filename}`);
            if (publicUrlData?.publicUrl) {
                return publicUrlData.publicUrl;
            }
        }
    } else {
        console.warn('⚠️ [saveUploadedFile] Thiếu biến môi trường SUPABASE_URL hoặc KEY.');
    }

    // Dự phòng: lưu local
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', subDir);
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
    fs.writeFileSync(path.join(uploadDir, filename), buffer);
    return `/uploads/${subDir}/${filename}`;
}

/**
 * Ảnh đại diện/ảnh công khai dạng base64 được giải mã và lưu R2.
 * Ảnh minh chứng thanh toán tiếp tục dùng luồng lưu trữ cũ.
 */
export async function saveBase64Image(base64Data: string, subDir: string = 'avatars'): Promise<string> {
    if (!base64Data || !base64Data.startsWith('data:image')) {
        return base64Data;
    }

    // Public image errors must reach the form; never save raw base64 or silently use Supabase.
    if (isPublicImageDirectory(subDir)) {
        if (base64Data.length > 12 * 1024 * 1024) throw new Error('Ảnh quá lớn (tối đa 8 MB).');
        const matches = /^data:image\/(?:jpeg|png|webp|gif|avif);base64,([A-Za-z0-9+/]+={0,2})$/.exec(base64Data);
        if (!matches) throw new Error('Định dạng ảnh không hợp lệ.');
        return uploadPublicImage(Buffer.from(matches[1], 'base64'), subDir);
    }

    try {
        const { supabase } = await import('./supabase');
        const matches = base64Data.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            throw new Error('Định dạng base64 không hợp lệ');
        }

        const extension = matches[1] === 'jpeg' ? 'jpg' : matches[1];
        const data = matches[2];
        const buffer = Buffer.from(data, 'base64');
        const fileName = `img_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;

        // 1. THỬ ĐẨY LÊN SUPABASE STORAGE (ƯU TIÊN)
        // Lưu ý: Trên Server ta có thể dùng cả biến có hoặc không có NEXT_PUBLIC_
        const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (supabaseUrl && supabaseKey) {
            console.log(`☁️ [ImageUtils] Đang thử đẩy lên Supabase... (Bucket: uploads, Thư mục: ${subDir})`);
            
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('uploads')
                .upload(`${subDir}/${fileName}`, buffer, {
                    contentType: `image/${extension}`,
                    cacheControl: '31536000',
                    upsert: true
                });

            if (uploadError) {
                console.error(`❌ [ImageUtils] Lỗi Supabase Storage:`, uploadError.message);
                console.error(`🔍 [ImageUtils] Chi tiết lỗi:`, JSON.stringify(uploadError));
            } else if (uploadData) {
                const { data: publicUrlData } = supabase.storage
                    .from('uploads')
                    .getPublicUrl(`${subDir}/${fileName}`);
                
                if (publicUrlData?.publicUrl) {
                    console.log(`✅ [ImageUtils] Up thành công! URL: ${publicUrlData.publicUrl}`);
                    return publicUrlData.publicUrl;
                }
            }
        } else {
            console.warn('⚠️ [ImageUtils] Thiếu biến môi trường SUPABASE_URL hoặc KEY. Kiểm tra lại Vercel Settings.');
        }

        // 2. DỰ PHÒNG: LƯU LOCAL (CHỈ CHẠY ĐƯỢC TRÊN LOCAL/VPS, KHÔNG CHẠY ĐƯỢC TRÊN VERCEL)
        console.log(`📂 [ImageUtils] Đang lưu vào thư mục local...`);
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', subDir);

        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, fileName);
        const publicPath = `/uploads/${subDir}/${fileName}`;

        fs.writeFileSync(filePath, buffer);
        console.log(`✅ [ImageUtils] Đã lưu local thành công: ${publicPath}`);

        return publicPath;

    } catch (error: any) {
        console.error('❌ [ImageUtils] LỖI XỬ LÝ ẢNH:', error.message);
        return base64Data;
    }
}

const EXTERNAL_IMAGE_FETCH_TIMEOUT_MS = 8000;
const EXTERNAL_IMAGE_MAX_BYTES = 8 * 1024 * 1024; // 8MB
const EXTERNAL_IMAGE_MAX_DIMENSION = 1600;

function isAlreadyStoredUrl(url: string): boolean {
    if (url.startsWith('/uploads/') || url.startsWith('data:')) return true;
    try {
        return new URL(url).hostname.endsWith('.supabase.co');
    } catch {
        return false;
    }
}

/**
 * Ảnh công khai: giữ URL HTTPS ngoài, chỉ lưu ảnh base64 mới lên R2.
 * Các thư mục nghiệp vụ khác giữ cơ chế tải/nén và lưu Supabase cũ.
 */
export async function resolveImageUrl(
    url: string | null | undefined,
    subDir: string
): Promise<string | null> {
    if (!url) return null;
    const trimmed = url.trim();
    if (!trimmed) return null;

    // Keep external artwork on its original host. Existing Supabase URLs stay readable,
    // but new external URLs are no longer copied into Supabase (or R2) automatically.
    if (isPublicImageDirectory(subDir) && !trimmed.startsWith('data:image')) {
        if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.includes('\\')) return trimmed;
        try {
            const external = new URL(trimmed);
            if (external.protocol === 'https:' && !external.username && !external.password && !isBlockedHost(external.hostname)) return trimmed;
        } catch { /* Show the same validation message for malformed links. */ }
        throw new Error('Vui lòng dùng đường dẫn ảnh HTTPS công khai hợp lệ.');
    }

    if (trimmed.startsWith('data:image')) {
        return saveBase64Image(trimmed, subDir);
    }

    if (isAlreadyStoredUrl(trimmed)) return trimmed;

    let parsed: URL;
    try {
        parsed = new URL(trimmed);
    } catch {
        return trimmed; // Không phải URL hợp lệ — giữ nguyên, form tự validate
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return trimmed;
    if (isBlockedHost(parsed.hostname)) return trimmed;

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), EXTERNAL_IMAGE_FETCH_TIMEOUT_MS);
        let response: Response;
        try {
            response = await fetch(trimmed, { signal: controller.signal });
        } finally {
            clearTimeout(timeout);
        }

        if (!response.ok) return trimmed;
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.startsWith('image/')) return trimmed;

        const arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer.byteLength > EXTERNAL_IMAGE_MAX_BYTES) return trimmed;

        const optimized = await sharp(Buffer.from(arrayBuffer))
            .resize({ width: EXTERNAL_IMAGE_MAX_DIMENSION, withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();

        const filename = `img_${Date.now()}_${Math.random().toString(36).substring(7)}.webp`;
        const storedUrl = await saveUploadedFile(optimized, filename, subDir, 'image/webp');
        console.log(`✅ [resolveImageUrl] Đã migrate "${trimmed}" -> "${storedUrl}"`);
        return storedUrl;
    } catch (error: any) {
        console.warn(`⚠️ [resolveImageUrl] Không thể tải/nén "${trimmed}": ${error.message}`)
        return trimmed
    }
}

/**
 * Kiểm tra xem một giá trị link_anh_bia có phải URL ảnh hợp lệ không.
 * Bỏ qua các placeholder bị lỗi phổ biến như "image.png".
 */
export function isValidImageUrl(url: string | null | undefined): boolean {
    if (!url) return false
    const trimmed = url.trim()
    if (!trimmed) return false
    // Các giá trị placeholder không hợp lệ
    const invalidValues = ['image.png', 'image.jpg', 'image.jpeg', 'image.gif', '']
    if (invalidValues.includes(trimmed.toLowerCase())) return false
    // Phải là URL hợp lệ có protocol http/https hoặc là relative path bắt đầu bằng /
    try {
        const parsed = new URL(trimmed)
        return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
        return trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../')
    }
}
