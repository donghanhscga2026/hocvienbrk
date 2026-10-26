import { redirect } from 'next/navigation'
import { getPagePresentation } from '@/lib/site-profile/presentation'

export const metadata = { title: 'Khám phá hệ sinh thái' }
export default async function Page() {
  // Trang này vốn là stub: cả hai giao diện đều quay về trang chủ.
  await getPagePresentation('explore')
  redirect('/')
}
