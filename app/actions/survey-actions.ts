'use server'

import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { generatePathFromAnswers, surveyQuestions } from "@/lib/survey-data"
import { getActiveSurvey } from "./roadmap-actions"

/**
 * Thuật toán duyệt sơ đồ Mindmap để lấy danh sách khóa học đề xuất
 * Lần theo các 'edges' dựa trên 'answers' của học viên
 */
function resolvePathFromFlow(flow: any, answers: Record<string, string>): { customPath: number[], goal: string } {
    const { nodes, edges } = flow
    const collectedCourseIds = new Set<number>()
    let currentGoal = ''

    // 1. Tìm node bắt đầu (thường là node câu hỏi không có đầu vào hoặc node đầu tiên)
    const startNode = nodes.find((n: any) => n.type === 'questionNode')
    if (!startNode) return { customPath: [], goal: '' }

    // Lưu mục tiêu từ câu hỏi đầu tiên
    currentGoal = startNode.data?.label || ''

    // 2. Thuật toán duyệt đồ thị (DFS/BFS đơn giản)
    const traverse = (currentNodeId: string) => {
        const outEdges = edges.filter((e: any) => e.source === currentNodeId)
        
        for (const edge of outEdges) {
            const targetNode = nodes.find((n: any) => n.id === edge.target)
            if (!targetNode) continue

            // Nếu gặp node Đáp án (optionNode)
            if (targetNode.type === 'optionNode') {
                const optionLabel = targetNode.data?.label
                if (answers[currentNodeId] === optionLabel) {
                    traverse(targetNode.id)
                }
            } 
            // Nếu gặp node Khóa học (courseNode) - Thêm ID vào danh sách
            else if (targetNode.type === 'courseNode') {
                if (targetNode.data?.courseId) {
                    collectedCourseIds.add(targetNode.data.courseId)
                }
                traverse(targetNode.id)
            }
            // Nếu gặp node Tư vấn (adviceNode) hoặc Câu hỏi tiếp theo (questionNode)
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
        
        // 1. Lấy bài khảo sát ĐANG KÍCH HOẠT từ Database (Động)
        const flowData = await getActiveSurvey()
        const flow = flowData as any
        
        let customPath: number[] = []
        let goal = ''

        if (flow && flow.nodes && Array.isArray(flow.nodes) && flow.nodes.length > 0) {
            // SỬ DỤNG BỘ MÁY TÍNH TOÁN TỪ SƠ ĐỒ MỚI
            console.log('🤖 Đang tính toán lộ trình từ Mindmap ĐỘNG ĐANG KÍCH HOẠT...')
            const result = resolvePathFromFlow(flow, answers)
            customPath = result.customPath
            goal = result.goal
        } else {
            // FALLBACK: DÙNG LOGIC CŨ (Đảm bảo hệ thống luôn chạy)
            console.log('📦 Đang sử dụng logic lộ trình tĩnh (Fallback)...')
            customPath = generatePathFromAnswers(answers)
            const q1AnswerId = answers['q1']
            const goalOption = surveyQuestions['q1']?.options.find(o => o.id === q1AnswerId)
            goal = goalOption ? goalOption.label : 'Hoàn thiện kỹ năng TikTok'
        }

        // 2. Xử lý lưu lịch sử khảo sát
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { surveyResults: true, customPath: true, goal: true }
        });

        const oldResults: any = user?.surveyResults || { history: [] };
        const newHistory = Array.isArray(oldResults.history) ? [...oldResults.history] : [];
        
        if (oldResults.current || user?.customPath) {
            newHistory.push({
                answers: oldResults.current?.answers || oldResults,
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

        // 3. Cập nhật Database
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
