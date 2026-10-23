'use client'
import { Suspense } from 'react'
import CourseTemplateWorkspace from '@/components/course/CourseTemplateWorkspace'

export default function Page() {
  return <Suspense fallback={<p className="p-6 text-sm">Đang mở thư viện mẫu…</p>}><CourseTemplateWorkspace /></Suspense>
}
