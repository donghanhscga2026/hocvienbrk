import fs from 'fs';
import path from 'path';
import { supabase } from './supabase';

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
