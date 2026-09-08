const fs = require('fs')

let content = fs.readFileSync('app/actions/course-actions.ts', 'utf8')

// 1. We will extract existing progress lookup earlier so we can reuse it
// find:
//                   if (isCurrentlyOnTime) {
//                       timingScore = 1
//                   } else if (isUpdate) {
//                       // Cập nhật sau hạn: chỉ giữ "đúng hạn" nếu bài GỐC đã từng đạt
//                       // hoàn thành (>=5đ, status COMPLETED) trước hạn - khi đó chặn
//                       // luôn không cho sửa nữa (như cũ).
//                       const existingStatus = await prisma.lessonProgress.findUnique({
//                           where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
//                           select: { status: true }
//                       })
//                       if (existingStatus?.status === 'COMPLETED') {
//                           return { success: false, message: "Bài học đã hết hạn cập nhật." }
//                       }
//                       timingScore = -1
//                   } else {
//                       timingScore = -1
//                   }

content = content.replace(
    /const isCurrentlyOnTime = now\.getTime\(\) <= deadlineUTC[\s\S]*?timingScore = -1\n\s*\} else \{\n\s*timingScore = -1\n\s*\}/,
    `const isCurrentlyOnTime = now.getTime() <= deadlineUTC

                console.log(\`\${logId} TIMING: startDate=\${startDate.toISOString()} lessonOrder=\${lessonOrder} deadlineUTC=\${new Date(deadlineUTC).toISOString()} nowUTC=\${now.toISOString()} onTime=\${isCurrentlyOnTime}\`)

                let existingProgress = null
                if (isUpdate) {
                    existingProgress = await prisma.lessonProgress.findUnique({
                        where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
                        select: { status: true, scores: true }
                    })
                }

                if (isCurrentlyOnTime) {
                    timingScore = 1
                } else if (isUpdate) {
                    if (existingProgress?.status === 'COMPLETED') {
                        return { success: false, message: "Bài học đã hết hạn cập nhật." }
                    }
                    timingScore = -1
                } else {
                    timingScore = -1
                }`
)

// 2. Fix the videoScore calculation
// find:
//         let videoScore = 2 // Không dùng video YouTube -> Auto +2
//         if (rawUrl !== "" && rawUrl.toLowerCase() !== "null" && isYouTube) {
//             const percent = currentDuration && currentDuration > 0 ? (currentMaxTime ?? 0) / currentDuration : 0
//             videoScore = percent >= 0.95 ? 2 : percent >= 0.5 ? 1 : 0
//         }

content = content.replace(
    /let videoScore = 2 \/\/ Không dùng video YouTube -> Auto \+2\n\s*if \(rawUrl !== "" && rawUrl\.toLowerCase\(\) !== "null" && isYouTube\) \{\n\s*const percent = currentDuration && currentDuration > 0 \? \(currentMaxTime \?\? 0\) \/ currentDuration : 0\n\s*videoScore = percent >= 0\.95 \? 2 : percent >= 0\.5 \? 1 : 0\n\s*\}/,
    `let videoScore = 2 // Không dùng video YouTube -> Auto +2
        if (rawUrl !== "" && rawUrl.toLowerCase() !== "null" && isYouTube) {
            const percent = currentDuration && currentDuration > 0 ? (currentMaxTime ?? 0) / currentDuration : 0
            videoScore = percent >= 0.95 ? 2 : percent >= 0.5 ? 1 : 0
            
            // [FIX] Khôi phục điểm video cũ nếu đang cập nhật mà client gửi currentMaxTime thấp do load lại trang
            if (isUpdate) {
                // Nếu chưa có existingProgress do chưa lấy ở trên (vd: không có lessonOrder), thì lấy tạm
                const oldScores = await prisma.lessonProgress.findUnique({
                    where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
                    select: { scores: true }
                })
                const oldVideoScore = (oldScores?.scores as any)?.video ?? 0
                videoScore = Math.max(videoScore, oldVideoScore)
            }
        }`
)

fs.writeFileSync('app/actions/course-actions.ts', content)
console.log('Update OK')
