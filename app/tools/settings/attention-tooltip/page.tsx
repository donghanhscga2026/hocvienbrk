import { redirect } from "next/navigation"
import { getSession } from "@/lib/get-session"
import { getAttentionHighlightSettings } from "@/app/actions/attention-highlight-actions"
import AttentionTooltipSettingsClient from "@/components/admin/settings/AttentionTooltipSettingsClient"

export default async function AttentionTooltipSettingsPage() {
    const session = await getSession()
    if (session?.user?.role !== "ADMIN") redirect("/tools/settings")

    const { config, items } = await getAttentionHighlightSettings()

    return <AttentionTooltipSettingsClient initialConfig={config} initialItems={items} />
}
