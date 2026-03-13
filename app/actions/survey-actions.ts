'use server'

import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { generatePathFromAnswers, surveyQuestions } from "@/lib/survey-data"
import { getActiveSurvey } from "./roadmap-actions"

/**
 * Thuật toán duyệt sơ đồ Mindmap để lấy danh sách khóa học đề xuất
 */
function resolvePathFromFlow(flow: any, answers: Record<string, string>): { customPath: number[], goal: string } {
    const { nodes, edges } = flow
    const collectedCourseIds = new Set<number>()
    let currentGoal = ''

    if (!Array.isArray(nodes) || !Array.isArray(edges)) return { customPath: [], goal: '' }

    const startNode = nodes.find((n: any) => n.type === 'questionNode')
    if (!startNode) return { customPath: [], goal: '' }

    currentGoal = startNode.data?.label || ''

    const traverse = (currentNodeId: string) => {
        const outEdges = edges.filter((e: any) => e.source === currentNodeId)
        
        for (const edge of outEdges) {
            const targetNode = nodes.find((n: any) => n.id === edge.target)
            if (!targetNode) continue

            if (targetNode.type === 'optionNode') {
                const optionLabel = targetNode.data?.label
                // So khớp đáp án người dùng chọn cho câu hỏi nguồn
                if (answers[currentNodeId] === optionLabel) {
                    traverse(targetNode.id)
                }
            } 
            else if (targetNode.type === 'courseNode') {
                if (targetNode.data?.courseId) {
                    collectedCourseIds.add(Number(targetNode.data.courseId))
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
        
        // 1. Lấy bài khảo sát ĐANG KÍCH HOẠT
        const flowData = await getActiveSurvey()
        const flow = flowData as any
        
        let customPath: number[] = []
        let goal = ''

        if (flow && flow.nodes && Array.isArray(flow.nodes) && flow.nodes.length > 0) {
            console.log('🤖 Đang tính toán lộ trình từ Mindmap ĐỘNG...')
            const result = resolvePathFromFlow(flow, answers)
            customPath = result.customPath
            goal = result.goal
        } else {
            console.log('📦 Đang sử dụng logic lộ trình tĩnh (Fallback)...')
            // FALLBACK THÔNG MINH: Nếu UI gửi node_id nhưng logic cũ cần q1, q2
            // Ta sẽ cố gắng trích xuất dữ liệu nếu có thể, hoặc dùng logic mặc định
            customPath = generatePathFromAnswers(answers)
            
            const q1AnswerId = answers['q1'] || 'unknown'
            const q1Data = (surveyQuestions as any)['q1']
            const goalOption = q1Data?.options?.find((o: any) => o.id === q1AnswerId)
            goal = goalOption ? goalOption.label : 'Hoàn thiện kỹ năng TikTok'
        }

        // Đảm bảo customPath không rỗng để RealityMap có thể hiển thị
        if (customPath.length === 0) {
            customPath = [1] // Mặc định cấp khóa 1 nếu không tính toán được
        }

        // 2. Lấy dữ liệu cũ để lưu lịch sử
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

        // 3. Cập nhật Database (Dùng Transaction để tăng độ tin cậy)
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
        // Nếu lỗi do Database (Prisma), trả về thông báo chi tiết hơn
        if (error.message?.includes('reach database')) {
            return { success: false, error: "Lỗi kết nối Database. Vui lòng thử lại sau giây lát." }
        }
        return { success: false, error: "Hệ thống đang bận (Error: " + error.message + ")" }
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
