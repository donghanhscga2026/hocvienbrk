'use client'
import { useState } from 'react'
import { AppWindow, ExternalLink } from 'lucide-react'
import type { WorkspaceResource } from '@/lib/offerings/workspace'
import OfferingViewer, { embeddedSource } from './OfferingViewer'
import OfferingInlineContent from './OfferingInlineContent'
import OfferingDriveFolder from './OfferingDriveFolder'
import { driveLinkInfo } from '@/lib/offerings/drive'

export default function OfferingResourceContent({
  resource,
  slug,
  resourceId,
}: {
  resource: WorkspaceResource
  slug?: string
  resourceId?: string
}) {
  const [opened, setOpened] = useState<Record<number, boolean>>({})
  const isApp = resource.kind === 'APP'
  const validLink = resource.url && embeddedSource(resource.url)
  const icon = resource.iconUrl && embeddedSource(resource.iconUrl)
  return (
    <div className="space-y-5">
      {isApp && (
        <section className="space-y-4 rounded-2xl border bg-green-50 p-5">
          <div className="flex items-start gap-4">
            {icon ? (
              <img src={resource.iconUrl} alt="" className="h-16 w-16 rounded-xl object-contain" />
            ) : (
              <AppWindow className="h-14 w-14 shrink-0 text-green-800" />
            )}
            <div>
              <span className="text-sm font-semibold text-green-800">Ứng dụng</span>
              <h4 className="text-xl font-bold">{resource.title}</h4>
              {resource.description && (
                <p className="mt-2 whitespace-pre-wrap text-brk-muted">{resource.description}</p>
              )}
            </div>
          </div>
          {resource.openMode === 'NEW_TAB' &&
            (validLink ? (
              <>
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-brk-primary px-5 font-semibold text-white"
                >
                  Mở ứng dụng <ExternalLink className="h-4 w-4" />
                </a>
                <p className="text-sm text-brk-muted">
                  Ứng dụng mở ở tab mới. Hướng dẫn vẫn nằm trong mục này.
                </p>
              </>
            ) : (
              <p>Nhập đường dẫn ứng dụng hợp lệ để mở.</p>
            ))}
        </section>
      )}
      {resource.url && (!isApp || resource.openMode !== 'NEW_TAB') && (
        driveLinkInfo(resource.url)?.type === 'folder' && slug && resourceId ? (
          <OfferingDriveFolder
            key={resource.url}
            slug={slug}
            resourceId={resourceId}
            url={resource.url}
            title={resource.title}
          />
        ) : (
          <OfferingViewer key={resource.url} url={resource.url} title={resource.title} kind={resource.kind} />
        )
      )}
      {resource.instructions || resource.guideUrl || resource.guides?.length ? (
        <section className="space-y-4 border-t pt-5">
          <h4 className="text-lg font-bold">Hướng dẫn cho {resource.title}</h4>
          <OfferingInlineContent text={resource.instructions} />
          {resource.guideUrl && (
            <OfferingViewer key={resource.guideUrl} url={resource.guideUrl} title="Hướng dẫn đã nhập" />
          )}
          {resource.guides?.map((guide, index) => (
            <details
              key={index}
              onToggle={(event) => {
                const open = event.currentTarget.open
                setOpened((previous) =>
                  previous[index] === open ? previous : { ...previous, [index]: open },
                )
              }}
              className="rounded-xl border bg-white p-4"
            >
              <summary className="min-h-11 cursor-pointer font-semibold">
                {index + 1}. {guide.title || 'Hướng dẫn mới'} ·{' '}
                {{ TEXT: 'Văn bản', VIDEO: 'Video', DOCS: 'Docs', PDF: 'PDF' }[guide.kind]}
              </summary>
              {opened[index] && (
                <div className="space-y-3 pt-3">
                  {guide.kind === 'TEXT' ? (
                    <OfferingInlineContent text={guide.content} />
                  ) : guide.url ? (
                    <OfferingViewer
                      key={guide.url}
                      url={guide.url}
                      title={guide.title}
                      kind={guide.kind === 'VIDEO' ? 'VIDEO' : undefined}
                    />
                  ) : (
                    <p>Chưa có liên kết hướng dẫn.</p>
                  )}
                </div>
              )}
            </details>
          ))}
        </section>
      ) : null}
    </div>
  )
}
