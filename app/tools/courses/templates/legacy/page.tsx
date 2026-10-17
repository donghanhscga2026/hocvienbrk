import { redirect } from 'next/navigation'

// Giữ liên kết cũ mở được, nhưng chỉ có một màn hình chọn giao diện.
export default async function Page({ searchParams }: { searchParams: Promise<{ course?: string; name?: string; courseId?: string }> }) {
  const params = await searchParams
  const query = new URLSearchParams()
  for (const key of ['course', 'name', 'courseId'] as const) if (params[key]) query.set(key, params[key])
  redirect('/tools/courses/templates' + (query.size ? '?' + query : ''))
}
