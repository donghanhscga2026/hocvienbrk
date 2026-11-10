'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, ExternalLink, FileText, FileVideo2, Folder } from 'lucide-react'
import type { DriveEntry } from '@/lib/offerings/drive'
import OfferingViewer from './OfferingViewer'

const isVideoName = (name: string) => /\.(mp4|mov|webm|m4v)$/i.test(name)

function countEntries(entries: DriveEntry[]): number {
  return entries.reduce((sum, entry) => sum + 1 + (entry.children ? countEntries(entry.children) : 0), 0)
}

function OpenInDrive({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-brk-primary px-4 font-semibold text-brk-primary"
    >
      Mở thư mục trong Google Drive <ExternalLink className="h-4 w-4" />
    </a>
  )
}

export default function OfferingDriveFolder({
  slug,
  resourceId,
  url,
  title,
}: {
  slug: string
  resourceId: string
  url: string
  title: string
}) {
  const [entries, setEntries] = useState<DriveEntry[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [file, setFile] = useState<{ id: string; name: string } | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    fetch(
      `/api/offerings/${encodeURIComponent(slug)}/resources/${encodeURIComponent(resourceId)}/drive`,
      { signal: controller.signal, cache: 'no-store' },
    )
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error)
        if (!controller.signal.aborted) setEntries(data.entries as DriveEntry[])
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true)
      })
    return () => controller.abort()
  }, [slug, resourceId])
  if (failed)
    return (
      <div className="space-y-3">
        <OfferingViewer url={url} title={title} />
        <OpenInDrive url={url} />
      </div>
    )
  if (!entries) return <p className="p-4 text-brk-muted">Đang đọc danh sách file trong thư mục…</p>
  const expandAll = countEntries(entries) <= 80
  const renderEntries = (items: DriveEntry[], depth: number) => (
    <ul className={depth ? 'ml-4 space-y-1 border-l pl-3' : 'space-y-1'}>
      {items.map((entry) =>
        entry.type === 'folder' ? (
          <li key={entry.id}>
            <button
              type="button"
              onClick={() => setOpen((prev) => ({ ...prev, [entry.id]: !(prev[entry.id] ?? expandAll) }))}
              className="flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-left font-semibold hover:bg-green-50"
            >
              {(open[entry.id] ?? expandAll) ? (
                <ChevronDown className="h-4 w-4 shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0" />
              )}
              <Folder className="h-5 w-5 shrink-0 text-brk-primary" />
              <span className="min-w-0 break-words">{entry.name}</span>
            </button>
            {(open[entry.id] ?? expandAll) &&
              (entry.children?.length ? (
                renderEntries(entry.children, depth + 1)
              ) : (
                <p className="ml-9 py-1 text-sm text-brk-muted">Thư mục trống hoặc chưa đọc được.</p>
              ))}
          </li>
        ) : (
          <li key={entry.id}>
            <button
              type="button"
              onClick={() => setFile({ id: entry.id, name: entry.name })}
              className={`flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-left hover:bg-green-50 ${file?.id === entry.id ? 'bg-green-50 font-bold text-green-950' : ''}`}
            >
              {isVideoName(entry.name) ? (
                <FileVideo2 className="h-5 w-5 shrink-0 text-brk-primary" />
              ) : (
                <FileText className="h-5 w-5 shrink-0 text-brk-primary" />
              )}
              <span className="min-w-0 break-words">{entry.name}</span>
            </button>
          </li>
        ),
      )}
    </ul>
  )
  return (
    <div className="space-y-4">
      {file && (
        <div className="space-y-2">
          <h4 className="font-bold">{file.name}</h4>
          <OfferingViewer
            key={file.id}
            url={`https://drive.google.com/file/d/${file.id}/view`}
            title={file.name}
            kind={isVideoName(file.name) ? 'VIDEO' : undefined}
          />
        </div>
      )}
      {entries.length ? (
        renderEntries(entries, 0)
      ) : (
        <p className="text-brk-muted">
          Chưa đọc được file nào trong thư mục. Thư mục cần ở chế độ ai có liên kết đều xem được.
        </p>
      )}
      <OpenInDrive url={url} />
    </div>
  )
}
