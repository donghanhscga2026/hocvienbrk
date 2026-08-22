'use server'

import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { Role } from "@prisma/client"
import { revalidateTag, unstable_cache } from "next/cache"
import { ATTENTION_POSITIONS } from "@/lib/attention-highlight-registry"
import {
    DEFAULT_ATTENTION_CONFIG,
    type AttentionHighlightConfig,
    type AttentionHighlightItem,
} from "@/lib/attention-highlight-types"

const CONFIG_KEY = 'attention_highlight_config'
const ITEMS_KEY = 'attention_highlight_items'
const CACHE_TAG = 'attention-highlight'

async function checkAdmin() {
    const session = await auth()
    if (session?.user?.role !== Role.ADMIN) {
        throw new Error("Không có quyền truy cập.")
    }
}

/**
 * Đọc config + nội dung tooltip từ DB — cache 10 phút, làm mới ngay khi admin
 * lưu (revalidateTag bên dưới). Gọi 1 LẦN DUY NHẤT ở RootLayout (server) rồi
 * truyền xuống qua Context, để mọi AttentionHighlight trên trang không phải
 * tự fetch riêng lẻ.
 */
export const getAttentionHighlightSettings = unstable_cache(
    async (): Promise<{ config: AttentionHighlightConfig; items: AttentionHighlightItem[] }> => {
        const [configRow, itemsRow] = await Promise.all([
            prisma.systemConfig.findUnique({ where: { key: CONFIG_KEY } }),
            prisma.systemConfig.findUnique({ where: { key: ITEMS_KEY } }),
        ])

        const config: AttentionHighlightConfig = {
            ...DEFAULT_ATTENTION_CONFIG,
            ...((configRow?.value as Partial<AttentionHighlightConfig>) || {}),
        }

        const savedItems = (itemsRow?.value as Record<string, { tooltip?: string; enabled?: boolean }>) || {}
        const items: AttentionHighlightItem[] = ATTENTION_POSITIONS.map(p => ({
            id: p.id,
            group: p.group,
            label: p.label,
            tooltip: savedItems[p.id]?.tooltip?.trim() || p.defaultTooltip,
            enabled: savedItems[p.id]?.enabled ?? true,
        }))

        return { config, items }
    },
    ['attention-highlight-settings'],
    { tags: [CACHE_TAG], revalidate: 600 }
)

export async function updateAttentionHighlightConfig(config: AttentionHighlightConfig) {
    await checkAdmin()
    await prisma.systemConfig.upsert({
        where: { key: CONFIG_KEY },
        create: { key: CONFIG_KEY, value: config as any },
        update: { value: config as any },
    })
    revalidateTag(CACHE_TAG, { expire: 0 })
    return { success: true }
}

export async function updateAttentionHighlightItems(items: Record<string, { tooltip: string; enabled: boolean }>) {
    await checkAdmin()
    await prisma.systemConfig.upsert({
        where: { key: ITEMS_KEY },
        create: { key: ITEMS_KEY, value: items as any },
        update: { value: items as any },
    })
    revalidateTag(CACHE_TAG, { expire: 0 })
    return { success: true }
}
