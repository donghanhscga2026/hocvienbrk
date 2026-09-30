import { redirect } from 'next/navigation'
import MainHeader from '@/components/layout/MainHeader'
import { getCrmActor } from '@/lib/crm/auth'
import { CrmError } from '@/lib/crm/service'
import CrmWorkspace from '@/components/crm/CrmWorkspace'

export const dynamic = 'force-dynamic'
export default async function CrmPage() {
  try { await getCrmActor() }
  catch (error) {
    if (error instanceof CrmError && error.status === 401) redirect('/login?callbackUrl=%2Ftools%2Fcrm')
    if (error instanceof CrmError && error.status === 403) return <main className="p-6"><h1 className="font-bold">Bạn chưa được cấp quyền CRM.</h1><p>Liên hệ quản trị viên để được phân công khách.</p></main>
    throw error
  }
  return <div className="min-h-screen bg-slate-50"><MainHeader title="CRM — Khách hàng & chăm sóc" /><CrmWorkspace /></div>
}
