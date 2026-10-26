'use client'

import { useState } from 'react'

/** Nút sao chép link tuyệt đối theo path (dùng cho link hồ sơ giảng viên). */
export default function CopyLinkButton({ path, label }: { path: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    const url = `${window.location.origin}${path}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = url
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
    >
      {copied ? 'Đã sao chép ✓' : label || 'Sao chép link'}
    </button>
  )
}
