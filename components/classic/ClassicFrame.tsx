import type { ReactNode } from 'react'
import MainHeader from '@/components/layout/MainHeader'
import FooterSection from '@/components/home/FooterSection'
import { getCurrentSiteProfile } from '@/lib/site-profile/runtime'
import { FALLBACK_PROFILE } from '@/lib/db-fallback'

/**
 * Khung classic (header và chân trang của chính site) bọc các trang dùng
 * bản wi300 chọn-dùng trên site không có deployment brand. Các trang đó
 * không tự mang header, layout cũng không bọc khung wi300 cho site này,
 * nên phải bọc tại đây giống cách các trang classic vẫn làm.
 */
export default async function ClassicFrame({ title, children }: { title: string; children: ReactNode }) {
  const profile = await getCurrentSiteProfile()
  const safeProfile = profile || FALLBACK_PROFILE
  return (
    <>
      <MainHeader title={title} profile={profile} />
      {children}
      <FooterSection profile={safeProfile as any} />
    </>
  )
}
