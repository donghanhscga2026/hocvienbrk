'use server'

import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { generatePathFromAnswers, surveyQuestions } from "@/lib/survey-data"
import { getActiveSurvey } from "./roadmap-actions"

/**
 * Thuật toán duyệt sơ đồ Mindmap thông minh (Bản vá 4.0 - SIÊU CẤP)
 * 1. Chấp nhận cả ID và Label của đáp án để so khớp.
 * 2. Tự động thu thập ID khóa học xuyên qua mọi tầng trung gian.
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

            // 1. Nếu là Node Đáp án: So khớp cực kỳ linh hoạt
            if (targetNode.type === 'optionNode') {
                const optionLabel = targetNode.data?.label
                const optionId = targetNode.id
                const userAnswer = answers[currentNodeId]
                
                // So khớp theo: Nội dung chữ, ID node, hoặc các từ khóa xác nhận
                if (
                    userAnswer === optionLabel || 
                    userAnswer === optionId ||
                    userAnswer === 'Xác nhận' || 
                    userAnswer === 'Tiếp tục'
                ) {
                    traverse(targetNode.id)
                }
            } 
            // 2. Nếu là Node Khóa học: Nhặt ID và đi tiếp
            else if (targetNode.type === 'courseNode') {
                const cid = Number(targetNode.data?.courseId)
                if (cid) {
                    collectedCourseIds.add(cid)
                }
                traverse(targetNode.id)
            }
            // 3. Nếu là Node Câu hỏi tiếp theo hoặc Node tư vấn
            else if (targetNode.type === 'questionNode' || targetNode.type === 'adviceNode') {
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
            console.log('🤖 Đang tính toán lộ trình từ sơ đồ động...')
            const result = resolvePathFromFlow(flow, answers)
            customPath = result.customPath
            goal = result.goal
        } else {
            console.log('📦 Fallback về logic tĩnh...')
            customPath = generatePathFromAnswers(answers)
            const q1AnswerId = answers['q1'] || 'unknown'
            const q1Data = (surveyQuestions as any)['q1']
            const goalOption = q1Data?.options?.find((o: any) => o.id === q1AnswerId)
            goal = goalOption ? goalOption.label : 'Hoàn thiện kỹ năng TikTok'
        }

        // PHÒNG THỦ: Luôn đảm bảo có ít nhất khóa học nền tảng (ID 1)
        if (customPath.length === 0) {
            customPath = [1]
        }

        const surveyData = {
            current: {
                answers,
                customPath: customPath,
                goal: goal,
                completedAt: new Date().toISOString()
            }
        };

        // Cập nhật Database
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
        console.error("Lỗi Server Action:", error.message)
        return { success: false, error: "Lỗi hệ thống: " + error.message }
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
