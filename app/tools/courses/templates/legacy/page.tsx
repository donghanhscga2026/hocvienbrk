import { Suspense } from 'react'
import LegacyTemplateLibrary from '@/components/course/LegacyTemplateLibrary'
export default function Page() { return <Suspense fallback={<p className="p-5 text-sm">Đang mở công cụ nhập mẫu…</p>}><LegacyTemplateLibrary /></Suspense> }
