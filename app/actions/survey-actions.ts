'use server'

import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { generatePathFromAnswers, surveyQuestions } from "@/lib/survey-data"
import { getActiveSurvey } from "./roadmap-actions"

/**
 * Thuật toán duyệt sơ đồ Mindmap thông minh (Bản vá 6.0 - GOAL FOCUS)
 * Cập nhật Goal dựa trên điểm dừng cuối cùng của học viên
 */
function resolvePathFromFlow(flow: any, answers: Record<string, string>): { customPath: number[], goalName: string } {
    const { nodes, edges } = flow
    const collectedCourseIds = new Set<number>()
    let lastPointName = ''

    if (!Array.isArray(nodes) || !Array.isArray(edges)) return { customPath: [], goalName: '' }

    const targetIds = new Set(edges.map((e: any) => e.target))
    let startNode = nodes.find((n: any) => n.type === 'questionNode' && !targetIds.has(n.id))
    if (!startNode) startNode = nodes.find((n: any) => n.type === 'questionNode')
    if (!startNode) return { customPath: [], goalName: '' }

    const traverse = (currentNodeId: string) => {
        const node = nodes.find((n: any) => n.id === currentNodeId)
        if (!node) return

        if (node.type === 'questionNode' || node.type === 'finishNode') {
            lastPointName = node.data?.label || lastPointName
        }

        const outEdges = edges.filter((e: any) => e.source === currentNodeId)
        for (const edge of outEdges) {
            const targetNode = nodes.find((n: any) => n.id === edge.target)
            if (!targetNode) continue

            if (targetNode.type === 'finishNode') {
                lastPointName = targetNode.data?.label || lastPointName
                continue 
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
                if (targetNode.data?.courseId) collectedCourseIds.add(Number(targetNode.data.courseId))
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
        goalName: lastPointName 
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
        let goalTitle = ''

        if (flow && flow.nodes && Array.isArray(flow.nodes) && flow.nodes.length > 0) {
            const result = resolvePathFromFlow(flow, answers)
            customPath = result.customPath
            goalTitle = result.goalName
        } else {
            customPath = generatePathFromAnswers(answers)
            goalTitle = 'Hoàn thiện kỹ năng TikTok'
        }

        const config = answers['goal_config'] as any
        let finalGoal = goalTitle
        if (config && config.videoPerDay) {
            finalGoal = `${goalTitle} (Cam kết: ${config.videoPerDay} video/ngày trong ${config.days} ngày để đạt ${config.targetVal} follow)`
        }

        // ĐÃ GỠ BỎ MẶC ĐỊNH [1] - Nếu rỗng thì lưu rỗng
        
        const surveyData = {
            current: {
                answers,
                customPath: customPath,
                goal: finalGoal,
                completedAt: new Date().toISOString()
            }
        };

        await prisma.user.update({
            where: { id: userId },
            data: {
                surveyResults: surveyData as any,
                customPath: customPath as any,
                goal: finalGoal
            }
        })

        revalidatePath('/')
        return { success: true, customPath, goal: finalGoal }

    } catch (error: any) {
        console.error("Lỗi Server Action:", error.message)
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
