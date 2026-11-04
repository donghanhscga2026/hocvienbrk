'use client'
import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { BookOpen, FolderOpen, ArrowUpRight, Layers, LockKeyhole } from 'lucide-react'
import { resourceLabels } from '@/lib/offerings/shared'

export type OfferingResource = { title: string; kind: keyof typeof resourceLabels; url?: string; body?: ReactNode }
export default function OfferingResources({ resources, active }: { resources: OfferingResource[]; active: boolean }) {
  const [filter, setFilter] = useState('ALL')
  const visible = resources.filter((item) => filter === 'ALL' || item.kind === filter)
  return (
    <section id="noi-dung" className="scroll-mt-36 space-y-5">
      <h2 className="text-2xl font-bold text-green-950 sm:text-3xl">Nội dung sản phẩm</h2>
      {!active ? (
        <div className="flex items-center gap-4 rounded-2xl border bg-white p-6">
          <LockKeyhole className="h-8 w-8 shrink-0 text-brk-primary" />
          <p>Kích hoạt sản phẩm để mở tài nguyên và hướng dẫn dành cho bạn.</p>
        </div>
      ) : resources.length ? (
        <div className="grid items-start gap-5 md:grid-cols-[210px_minmax(0,1fr)]">
          <nav
            aria-label="Nhóm tài nguyên"
            className="flex flex-wrap gap-1 rounded-2xl border bg-white p-3 md:flex-col"
          >
            {(['ALL', ...Object.keys(resourceLabels)] as string[])
              .filter((kind) => kind === 'ALL' || resources.some((item) => item.kind === kind))
              .map((kind) => (
                <button
                  key={kind}
                  type="button"
                  aria-pressed={filter === kind}
                  onClick={() => setFilter(kind)}
                  className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold ${filter === kind ? 'bg-green-50 text-brk-primary' : 'text-brk-muted hover:bg-stone-50'}`}
                >
                  <Layers className="h-5 w-5" />
                  {kind === 'ALL' ? 'Tất cả' : resourceLabels[kind as keyof typeof resourceLabels]}
                </button>
              ))}
          </nav>
          <div className="min-w-0 divide-y rounded-2xl border bg-white px-5">
            {visible.map((resource, index) => (
              <article key={resource.title + index} className="py-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-xl bg-green-50 p-3 text-brk-primary">
                    <BookOpen className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="break-words font-semibold">{resource.title}</h3>
                    <p className="text-sm text-brk-muted">{resourceLabels[resource.kind]}</p>
                  </div>
                  {resource.url && (
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-brk-primary px-4 text-sm font-semibold text-brk-primary"
                    >
                      Mở <ArrowUpRight className="h-4 w-4" />
                    </a>
                  )}
                </div>
                {resource.body && (
                  <details className="mt-3">
                    <summary className="min-h-11 cursor-pointer py-2 font-semibold text-brk-primary">
                      Xem nội dung
                    </summary>
                    <div className="pb-3 pt-2">{resource.body}</div>
                  </details>
                )}
              </article>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4 rounded-2xl border bg-white p-6">
          <FolderOpen className="h-8 w-8 shrink-0 text-brk-primary" />
          <p>
            Nội dung đang được đơn vị cung cấp cập nhật. Bạn có thể{' '}
            <Link href="/my-requests" className="font-semibold text-brk-primary underline">
              gửi yêu cầu hỗ trợ
            </Link>{' '}
            để được hướng dẫn.
          </p>
        </div>
      )}
    </section>
  )
}
