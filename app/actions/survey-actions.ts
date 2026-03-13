'use server'

import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { generatePathFromAnswers, surveyQuestions } from "@/lib/survey-data"
import { getActiveSurvey } from "./roadmap-actions"

/**
 * [BẢN VÁ LOGIC]: Thuật toán duyệt sơ đồ Mindmap thông minh
 * 1. Tự động xác định Node gốc (Root)
 * 2. Thu thập khóa học xuyên thấu các nhánh
 */
function resolvePathFromFlow(flow: any, answers: Record<string, string>): { customPath: number[], goal: string } {
    const { nodes, edges } = flow
    const collectedCourseIds = new Set<number>()
    let currentGoal = ''

    if (!Array.isArray(nodes) || !Array.isArray(edges)) return { customPath: [], goal: '' }

    // [FIX 1]: Tìm đúng Node gốc (Là câu hỏi không có bất kỳ mũi tên nào trỏ vào)
    const targetIds = new Set(edges.map((e: any) => e.target))
    let startNode = nodes.find((n: any) => n.type === 'questionNode' && !targetIds.has(n.id))
    
    // Fallback an toàn nếu không tìm thấy node gốc tuyệt đối
    if (!startNode) startNode = nodes.find((n: any) => n.type === 'questionNode')
    if (!startNode) return { customPath: [], goal: '' }

    currentGoal = startNode.data?.label || ''

    const traverse = (currentNodeId: string) => {
        const outEdges = edges.filter((e: any) => e.source === currentNodeId)
        
        for (const edge of outEdges) {
            const targetNode = nodes.find((n: any) => n.id === edge.target)
            if (!targetNode) continue

            if (targetNode.type === 'optionNode') {
                const optionLabel = targetNode.data?.label
                // [FIX 3]: So khớp đáp án. Hỗ trợ luôn các nút "Xác nhận" từ Input Form
                if (answers[currentNodeId] === optionLabel || answers[currentNodeId] === 'Xác nhận' || answers[currentNodeId] === 'Tiếp tục') {
                    traverse(targetNode.id)
                }
            } 
            else if (targetNode.type === 'courseNode') {
                if (targetNode.data?.courseId) {
                    collectedCourseIds.add(Number(targetNode.data.courseId))
                }
                // [FIX 2]: Thu thập khóa học xong, đi tiếp nếu có câu hỏi hoặc khóa học khác nối sau
                traverse(targetNode.id)
            }
            else if (targetNode.type === 'adviceNode' || targetNode.type === 'questionNode') {
                traverse(targetNode.id)
            }
        }
    }

    traverse(startNode.id)
    return { 
        customPath: Array.from(collectedCourseIds), 
        goal: currentGoal 
    }
}

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
        
        // 1. Lấy bài khảo sát ĐANG KÍCH HOẠT từ Database
        const flowData = await getActiveSurvey()
        const flow = flowData as any
        
        let customPath: number[] = []
        let goal = ''

        if (flow && flow.nodes && Array.isArray(flow.nodes) && flow.nodes.length > 0) {
            console.log('🤖 Đang tính toán lộ trình từ Mindmap ĐỘNG (Bản vá 2.0)...')
            const result = resolvePathFromFlow(flow, answers)
            customPath = result.customPath
            goal = result.goal
        } else {
            console.log('📦 Đang sử dụng logic lộ trình tĩnh (Fallback)...')
            customPath = generatePathFromAnswers(answers)
            const q1AnswerId = answers['q1'] || 'unknown'
            const q1Data = (surveyQuestions as any)['q1']
            const goalOption = q1Data?.options?.find((o: any) => o.id === q1AnswerId)
            goal = goalOption ? goalOption.label : 'Hoàn thiện kỹ năng TikTok'
        }

        // 2. Lưu lịch sử và cập nhật Database
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { surveyResults: true, customPath: true, goal: true }
        });

        const oldResults: any = user?.surveyResults || { history: [] };
        const newHistory = Array.isArray(oldResults.history) ? [...oldResults.history] : [];
        
        if (oldResults.current || user?.customPath) {
            newHistory.push({
                answers: oldResults.current?.answers || answers,
                customPath: user?.customPath,
                goal: user?.goal,
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

        await prisma.user.update({
            where: { id: userId },
            data: {
                surveyResults: surveyData as any,
                customPath: customPath as any,
                goal: goal
            }
        })

        revalidatePath('/')
        return { success: true, customPath, goal }

    } catch (error: any) {
        console.error("Lỗi khi lưu khảo sát:", error)
        if (error.message?.includes('reach database')) {
            return { success: false, error: "Lỗi kết nối Database. Vui lòng thử lại sau giây lát." }
        }
        return { success: false, error: "Hệ thống đang bận. Vui lòng thử lại sau." }
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
            data: { customPath: null as any }
        })
        revalidatePath('/')
        return { success: true }
    } catch (error) {
        return { success: false }
    }
}
