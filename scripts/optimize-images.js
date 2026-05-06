const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function optimizeImages() {
    console.log("🚀 Starting Image Optimization Scan...");
    
    // 1. Find users with base64 images
    const users = await prisma.user.findMany({
        where: {
            image: {
                startsWith: 'data:image'
            }
        },
        select: { id: true, image: true }
    });

    console.log(`🔍 Found ${users.length} users with base64 images.`);

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    let successCount = 0;
    let errorCount = 0;

    for (const user of users) {
        try {
            const base64Data = user.image;
            // Extract format and data
            const matches = base64Data.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
            
            if (!matches || matches.length !== 3) {
                console.warn(`⚠️ User #${user.id}: Invalid base64 format.`);
                continue;
            }

            const extension = matches[1] === 'jpeg' ? 'jpg' : matches[1];
            const data = matches[2];
            const buffer = Buffer.from(data, 'base64');
            
            const fileName = `user_${user.id}_${Date.now()}.${extension}`;
            const filePath = path.join(uploadDir, fileName);
            const publicPath = `/uploads/avatars/${fileName}`;

            // Save file
            fs.writeFileSync(filePath, buffer);
            
            // Update DB
            await prisma.user.update({
                where: { id: user.id },
                data: { image: publicPath }
            });

            console.log(`✅ Optimized User #${user.id}: Saved to ${publicPath} (${(buffer.length / 1024).toFixed(2)} KB)`);
            successCount++;
        } catch (err) {
            console.error(`❌ Error optimizing User #${user.id}:`, err.message);
            errorCount++;
        }
    }

    console.log("\n==========================================");
    console.log("✨ OPTIMIZATION COMPLETED");
    console.log(`- Total processed: ${users.length}`);
    console.log(`- Successfully converted: ${successCount}`);
    console.log(`- Errors: ${errorCount}`);
    console.log("==========================================\n");
}

optimizeImages()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
