'use client'

import { useId, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { FolderKanban } from 'lucide-react'

export type CourseProjectBadge = { slug: string; name: string; logo: string }

// Giữ chỗ cho logo; thiếu ảnh hoặc ảnh lỗi vẫn đọc được tên dự án.
function ProjectLogo({ logo }: { logo: string }) {
  const [failed, setFailed] = useState<string | null>(null)
  return <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white p-0.5">
    {logo && failed !== logo ? <Image src={logo} alt="" width={24} height={24} sizes="24px" className="h-6 w-6 object-contain" onError={() => setFailed(logo)} /> : <FolderKanban className="h-4 w-4" aria-hidden="true" />}
  </span>
}

/** Nhãn dưới ảnh bìa; mở rộng tại chỗ để dùng được cả cảm ứng và bàn phím. */
export default function CourseProjectBadges({ projects, showAll = false }: { projects: CourseProjectBadge[]; showAll?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const listId = useId()
  if (!projects.length) return null
  const shown = showAll || expanded ? projects : projects.slice(0, 2)
  return <div data-course-projects className="mb-3 flex min-w-0 items-start gap-2 border-b border-brk-outline pb-3">
    <span className="shrink-0 pt-3 text-xs text-brk-muted">Dự án</span>
    <div className="min-w-0 flex-1">
      <ul id={listId} aria-label="Dự án liên kết với khóa học" className="flex min-w-0 flex-wrap gap-1.5">
        {shown.map(project => <li key={project.slug} className="min-w-0 max-w-full">
          <Link href={`/du-an/${encodeURIComponent(project.slug)}`} prefetch={false} className="inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-xl border border-brk-primary/20 bg-brk-primary/5 px-2 py-1 text-xs font-semibold text-brk-primary transition-colors hover:bg-brk-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brk-primary">
            <ProjectLogo logo={project.logo} /><span className="min-w-0 break-words [overflow-wrap:anywhere]">{project.name}</span>
          </Link>
        </li>)}
        {!showAll && projects.length > 2 && <li><button type="button" aria-controls={listId} aria-expanded={expanded} aria-label={expanded ? 'Thu gọn danh sách dự án' : `Xem thêm ${projects.length - 2} dự án`} onClick={() => setExpanded(value => !value)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-brk-outline bg-brk-surface px-2 text-xs font-semibold text-brk-primary hover:bg-brk-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brk-primary">{expanded ? 'Thu gọn' : `+${projects.length - 2}`}</button></li>}
      </ul>
    </div>
  </div>
}
