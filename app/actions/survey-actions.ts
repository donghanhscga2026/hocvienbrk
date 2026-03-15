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
                const cid = parseInt(targetNode.data?.courseId);
                if (!isNaN(cid)) {
                    collectedCourseIds.add(cid);
                }
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
        let structuredGoal: any = {
            title: goalTitle,
            mainGoal: goalTitle,
            commitments: []
        }

        if (config && config.videoPerDay) {
            const isSelling = Object.values(answers).some(val => String(val).toLowerCase().includes('bán hàng'))
            const isBranding = Object.values(answers).some(val => String(val).toLowerCase().includes('nhân hiệu'))
            const isSpreading = Object.values(answers).some(val => String(val).toLowerCase().includes('lan tỏa'))

            // 1. Xác định QUẢ (Main Goal)
            if (isSelling) structuredGoal.mainGoal = `${config.moneyGoal} VNĐ/tháng`
            else if (isBranding) structuredGoal.mainGoal = `${config.targetVal} Follow`
            else if (isSpreading) structuredGoal.mainGoal = `Lan tỏa TLGDTG ra toàn cầu`

            // 2. Xác định NHÂN (Commitments)
            // Cam kết 1: Mặc định học tập
            if (customPath.length > 0) {
                structuredGoal.commitments.push({
                    type: 'LEARN',
                    content: `Hoàn thành lộ trình ${customPath.length} chặng học đã thiết kế`
                })
            }

            // Cam kết 2: Video
            structuredGoal.commitments.push({
                type: 'VIDEO',
                content: `Đăng ít nhất ${config.videoPerDay} video/ngày trong ${config.days} ngày`
            })

            // Cam kết 3: Livestream
            if (config.isLivestream) {
                structuredGoal.commitments.push({
                    type: 'LIVE',
                    content: `Livestream tối thiểu ${config.livePerDay} phút/ngày trong ${config.liveDays} ngày`
                })
            }
        }

        const surveyData = {
            current: {
                answers,
                customPath: customPath,
                goal: structuredGoal,
                completedAt: new Date().toISOString()
            }
        };

        await prisma.user.update({
            where: { id: userId },
            data: {
                surveyResults: surveyData as any,
                customPath: customPath as any,
                goal: JSON.stringify(structuredGoal)
            }
        })

        revalidatePath('/')
        return { success: true, customPath, goal: structuredGoal }

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
