'use server'

import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { generatePathFromAnswers, surveyQuestions } from "@/lib/survey-data"
import { getActiveSurvey } from "./roadmap-actions"

/**
 * Thuật toán duyệt sơ đồ Mindmap thông minh (Bản vá 5.0)
 * 1. Tự động xác định Node gốc (Root)
 * 2. Thu thập khóa học xuyên thấu các nhánh
 * 3. [MỚI]: Dừng lại và cập nhật Goal khi gặp FinishNode
 */
function resolvePathFromFlow(flow: any, answers: Record<string, string>): { customPath: number[], goal: string } {
    const { nodes, edges } = flow
    const collectedCourseIds = new Set<number>()
    let currentGoal = ''

    if (!Array.isArray(nodes) || !Array.isArray(edges)) return { customPath: [], goal: '' }

    // Tìm đúng Node gốc (Câu hỏi không có dây trỏ vào)
    const targetIds = new Set(edges.map((e: any) => e.target))
    let startNode = nodes.find((n: any) => n.type === 'questionNode' && !targetIds.has(n.id))
    if (!startNode) startNode = nodes.find((n: any) => n.type === 'questionNode')
    if (!startNode) return { customPath: [], goal: '' }

    // Mặc định goal là câu hỏi đầu tiên
    currentGoal = startNode.data?.label || ''

    const traverse = (currentNodeId: string) => {
        const outEdges = edges.filter((e: any) => e.source === currentNodeId)
        
        for (const edge of outEdges) {
            const targetNode = nodes.find((n: any) => n.id === edge.target)
            if (!targetNode) continue

            // Nếu gặp Đích đến (FinishNode) -> Chốt Goal và dừng nhánh này
            if (targetNode.type === 'finishNode') {
                currentGoal = targetNode.data?.label || currentGoal
                continue // Dừng duyệt tiếp ở nhánh gặp đích
            }

            if (targetNode.type === 'optionNode') {
                const optionLabel = targetNode.data?.label
                const optionId = targetNode.id
                const userAnswer = answers[currentNodeId]
                
                if (userAnswer === optionLabel || userAnswer === optionId || userAnswer === 'Xác nhận' || userAnswer === 'Tiếp tục') {
                    traverse(targetNode.id)
                }
            } 
            else if (targetNode.type === 'courseNode') {
                const cid = Number(targetNode.data?.courseId)
                if (cid) collectedCourseIds.add(cid)
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
        const flowData = await getActiveSurvey()
        const flow = flowData as any
        
        let customPath: number[] = []
        let goal = ''

        if (flow && flow.nodes && Array.isArray(flow.nodes) && flow.nodes.length > 0) {
            console.log('🤖 Đang tính toán lộ trình từ Mindmap ĐỘNG (FinishNode support)...')
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

        if (customPath.length === 0) customPath = [1]

        const surveyData = {
            current: {
                answers,
                customPath: customPath,
                goal: goal,
                completedAt: new Date().toISOString()
            }
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
