'use server'

import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { generatePathFromAnswers, surveyQuestions } from "@/lib/survey-data"
import { getActiveSurvey } from "./roadmap-actions"

/**
 * Thuật toán duyệt sơ đồ Mindmap thông minh (Bản vá 3.0)
 * Đảm bảo nhặt đủ ID khóa học kể cả khi chúng nối tiếp nhau
 */
function resolvePathFromFlow(flow: any, answers: Record<string, string>): { customPath: number[], goal: string } {
    const { nodes, edges } = flow
    const collectedCourseIds = new Set<number>()
    let currentGoal = ''

    if (!Array.isArray(nodes) || !Array.isArray(edges)) return { customPath: [], goal: '' }

    // Tìm Node gốc (Root)
    const targetIds = new Set(edges.map((e: any) => e.target))
    let startNode = nodes.find((n: any) => n.type === 'questionNode' && !targetIds.has(n.id))
    if (!startNode) startNode = nodes.find((n: any) => n.type === 'questionNode')
    if (!startNode) return { customPath: [], goal: '' }

    currentGoal = startNode.data?.label || ''

    const traverse = (currentNodeId: string) => {
        const outEdges = edges.filter((e: any) => e.source === currentNodeId)
        
        for (const edge of outEdges) {
            const targetNode = nodes.find((n: any) => n.id === edge.target)
            if (!targetNode) continue

            // 1. Nếu là Node Đáp án: So khớp đáp án người dùng chọn
            if (targetNode.type === 'optionNode') {
                const optionLabel = targetNode.data?.label
                const userAnswer = answers[currentNodeId]
                
                if (userAnswer === optionLabel || userAnswer === 'Xác nhận' || userAnswer === 'Tiếp tục') {
                    traverse(targetNode.id)
                }
            } 
            // 2. Nếu là Node Khóa học: Nhặt ID và đi tiếp xuyên thấu
            else if (targetNode.type === 'courseNode') {
                if (targetNode.data?.courseId) {
                    collectedCourseIds.add(Number(targetNode.data.courseId))
                }
                traverse(targetNode.id)
            }
            // 3. Nếu là Node Câu hỏi tiếp theo hoặc Node tư vấn
            else if (targetNode.type === 'questionNode' || targetNode.type === 'adviceNode') {
                // Nếu nối từ một node đã được xác định đi qua (như CourseNode)
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
        const flowData = await getActiveSurvey()
        const flow = flowData as any
        
        let customPath: number[] = []
        let goal = ''

        if (flow && flow.nodes && Array.isArray(flow.nodes) && flow.nodes.length > 0) {
            console.log('🤖 Đang tính toán lộ trình từ Mindmap ĐỘNG (Recursive Mode)...')
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

        // Kiểm tra an toàn: Nếu vẫn rỗng, cấp khóa 1 làm nền tảng
        if (customPath.length === 0) {
            customPath = [1]
        }

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
