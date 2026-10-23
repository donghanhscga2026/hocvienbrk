'use client'
import WebsiteList from '@/components/website/WebsiteList'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { canCreateProfile } from '@/lib/auth/roles'

/** Danh sách mới thay luồng chỉ tìm website sở hữu; cộng sự không cần có site riêng. */
export default function MySiteTab() {
  const { data: session } = useSession()
  return <>
    {canCreateProfile(session?.user?.role) && <div className="mx-auto max-w-5xl px-4 pt-4 sm:px-6"><Link href="/tools/site-profiles/new" className="inline-flex min-h-11 items-center rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white">Tạo website</Link></div>}
    <WebsiteList />
  </>
}
