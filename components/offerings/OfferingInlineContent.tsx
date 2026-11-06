'use client'
import { useState } from 'react'
import OfferingRichText from './OfferingRichText'
import OfferingViewer from './OfferingViewer'

export default function OfferingInlineContent({ text }: { text?: string | null }) {
  const [selected, setSelected] = useState<{
    url: string
    title: string
  } | null>(null)
  return (
    <div className="space-y-4">
      <OfferingRichText text={text} onOpenLink={(url, title) => setSelected({ url, title })} />
      {selected && (
        <div className="space-y-3">
          <button
            type="button"
            className="min-h-11 font-semibold text-brk-primary"
            onClick={() => setSelected(null)}
          >
            Đóng nội dung liên quan
          </button>
          <OfferingViewer key={selected.url} {...selected} />
        </div>
      )}
    </div>
  )
}
