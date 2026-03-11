'use server'

import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { generatePathFromAnswers, surveyQuestions } from "@/lib/survey-data"

/**
 * Lưu kết quả khảo sát và tạo lộ trình học tập cá nhân hóa
 */
export async function saveSurveyResultAction(answers: Record<string, string>) {
    const session = await auth()
    if (!session?.user?.id) {
        return { success: false, error: "Vui lòng đăng nhập để lưu lộ trình." }
    }

    try {
        const userId = parseInt(session.user.id)
        
        // Tạo danh sách khóa học đề xuất
        const customPath = generatePathFromAnswers(answers)

        // Phân tích "Mục tiêu chính" từ câu hỏi đầu tiên (q1)
        const q1AnswerId = answers['q1']
        const goalOption = surveyQuestions['q1'].options.find(o => o.id === q1AnswerId)
        const goal = goalOption ? goalOption.label : 'Hoàn thiện kỹ năng TikTok'

        // Lấy dữ liệu cũ để lưu lịch sử
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { surveyResults: true, customPath: true, goal: true }
        });

        const oldResults: any = user?.surveyResults || { history: [] };
        const newHistory = Array.isArray(oldResults.history) ? [...oldResults.history] : [];
        
        // Đưa TOÀN BỘ snapshot cũ (bao gồm roadmap ID) vào lịch sử
        if (oldResults.current || user?.customPath) {
            newHistory.push({
                answers: oldResults.current?.answers || oldResults,
                customPath: user?.customPath, // LƯU LẠI LỘ TRÌNH CŨ
                goal: user?.goal,             // LƯU LẠI MỤC TIÊU CŨ
                archivedAt: new Date().toISOString()
            });
        }

        const surveyData = {
            current: {
                answers,
                customPath: customPath,
                goal: goal,
                completedAt: new Date().toISOString()
            },
            history: newHistory
        };

        // Cập nhật Database
        await prisma.user.update({
            where: { id: userId },
            data: {
                surveyResults: surveyData,
                customPath: customPath,
                goal: goal
            }
        })

        revalidatePath('/')
        return { success: true, customPath, goal }

    } catch (error: any) {
        console.error("Lỗi khi lưu khảo sát:", error)
        return { success: false, error: "Hệ thống đang bận, vui lòng thử lại sau." }
    }
}

/**
 * Reset lộ trình để làm lại khảo sát
 */
export async function resetSurveyAction() {
    const session = await auth()
    if (!session?.user?.id) return { success: false }

    try {
        await prisma.user.update({
            where: { id: parseInt(session.user.id) },
            data: { customPath: null }
        })
        revalidatePath('/')
        return { success: true }
    } catch (error) {
        return { success: false }
    }
}
