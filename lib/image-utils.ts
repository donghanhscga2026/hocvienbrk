import fs from 'fs';
import path from 'path';

/**
 * Saves a base64 image string to the local filesystem (public/uploads/avatars)
 * and returns the public URL.
 */
export async function saveBase64Image(base64Data: string, subDir: string = 'avatars'): Promise<string> {
    // If it's already a URL, return it
    if (!base64Data.startsWith('data:image')) {
        return base64Data;
    }

    try {
        const matches = base64Data.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            throw new Error('Invalid base64 image format');
        }

        const extension = matches[1] === 'jpeg' ? 'jpg' : matches[1];
        const data = matches[2];
        const buffer = Buffer.from(data, 'base64');

        const fileName = `upload_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', subDir);

        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, fileName);
        const publicPath = `/uploads/${subDir}/${fileName}`;

        fs.writeFileSync(filePath, buffer);
        console.log(`✅ Image saved to ${publicPath}`);

        return publicPath;
    } catch (error: any) {
        console.error('❌ Error saving base64 image:', error.message);
        return base64Data; // Fallback to original if error
    }
}
