'use server'

import prisma from "@/lib/prisma"

export interface ToolHelpSection {
    type: 'color_legend' | 'features' | 'text' | 'tips'
    title: string
    items?: Array<{
        color?: string
        label?: string
        desc?: string
        feature?: string
        text?: string
    }>
    content?: string
}

export interface ToolHelpData {
    id: number
    toolSlug: string
    title: string
    content: ToolHelpSection[]
}

export async function getToolHelpAction(toolSlug: string): Promise<{ success: boolean; data?: ToolHelpData; error?: string }> {
    try {
        const help = await prisma.toolHelp.findUnique({
            where: { toolSlug, isActive: true }
        })
        
        if (!help) {
            return { success: false, error: "Không tìm thấy hướng dẫn" }
        }
        
        return { 
            success: true, 
            data: help as unknown as ToolHelpData
        }
    } catch (error: any) {
        console.error('[getToolHelpAction] Error:', error)
        return { success: false, error: error.message }
    }
}

export async function getAllToolHelpsAction() {
    try {
        const helps = await prisma.toolHelp.findMany({
            where: { isActive: true },
            orderBy: { order: 'asc' },
            select: {
                toolSlug: true,
                title: true
            }
        })
        return { success: true, helps }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}