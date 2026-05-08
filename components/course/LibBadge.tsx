import { BookOpen } from "lucide-react"

export function LibBadge() {
    return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-purple-200 shadow-sm">
            <BookOpen className="w-3 h-3" />
            Tài liệu tự do
        </span>
    )
}
