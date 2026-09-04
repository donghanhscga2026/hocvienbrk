import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { supabase } from './supabase';
import { isBlockedHost } from './security/url-safety';

/**
 * Lưu 1 file (Buffer) lên Supabase Storage (ưu tiên) — chỉ dự phòng ghi ổ đĩa
 * cục bộ khi thiếu cấu hình Supabase (chỉ dùng được lúc chạy local/VPS,
 * KHÔNG chạy được trên Vercel vì filesystem chỉ đọc lúc runtime).
 * Dùng cho các route nhận file qua FormData (khác saveBase64Image ở trên,
 * vốn dành cho ảnh dạng base64).
 */
export async function saveUploadedFile(
    buffer: Buffer,
    filename: string,
    subDir: string,
    contentType: string
): Promise<string> {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('uploads')
            .upload(`${subDir}/${filename}`, buffer, {
                contentType,
                cacheControl: '3600',
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
 * Saves a base64 image string to either Supabase Storage (Production)
 * or the local filesystem (Development).
 */
export async function saveBase64Image(base64Data: string, subDir: string = 'avatars'): Promise<string> {
    if (!base64Data || !base64Data.startsWith('data:image')) {
        return base64Data;
    }

    try {
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
                    cacheControl: '3600',
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
 * Với link ảnh do người dùng dán tay (postimg.cc, imgur, ibb.co...), tải ảnh
 * về, nén/resize qua sharp rồi đẩy lên Supabase Storage, trả về link Supabase
 * thay cho link ngoài. Mục đích: next/image không còn phải fetch trực tiếp
 * các host ngoài không ổn định lúc render (nguồn gốc lỗi "upstream image
 * response timed out"). Nếu tải/nén thất bại (mạng lỗi, không phải ảnh, quá
 * lớn...) thì trả lại nguyên url gốc để không chặn việc lưu dữ liệu — trang
 * quản trị vẫn lưu được, chỉ là ảnh đó sẽ còn phụ thuộc host ngoài như cũ.
 */
export async function resolveImageUrl(
    url: string | null | undefined,
    subDir: string
): Promise<string | null> {
    if (!url) return null;
    const trimmed = url.trim();
    if (!trimmed) return null;

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
        console.warn(`⚠️ [resolveImageUrl] Không thể tải/nén "${trimmed}": ${error.message}`);
        return trimmed;
    }
}
