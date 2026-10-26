import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCrmActor } from '@/lib/crm/auth'
import { crmFailure } from '@/lib/crm/http'
import { readNewAccountsExport } from '@/lib/crm/accounts-export'

export const dynamic = 'force-dynamic'
// Tải xuống danh sách tài khoản website mới theo khoảng ngày (CSV).
// Quyền và phạm vi áp ở tầng truy vấn trong readNewAccountsExport.
export async function GET(request: Request) {
  try {
    const actor = await getCrmActor()
    const params = new URL(request.url).searchParams
    const result = await readNewAccountsExport(prisma, actor, {
      from: params.get('from') || undefined,
      to: params.get('to') || undefined,
    })
    return new NextResponse(result.csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="' + result.filename + '"',
        'Cache-Control': 'private, no-store',
        'X-Export-Total': String(result.total),
      },
    })
  } catch (error) { return crmFailure(error) }
}
