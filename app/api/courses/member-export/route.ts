import { ZodError } from 'zod'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { domainContext } from '@/lib/website/domain-context'
import { crmBody, crmFailure } from '@/lib/crm/http'
import { CrmError } from '@/lib/crm/service'
import { memberExportSheets } from '@/lib/course/member-export'
import { courseWorkbook } from '@/lib/course/export-workbook'

export async function POST(request: Request) {
  try {
    if (await domainContext()) throw new CrmError('Xuất dữ liệu tại hệ thống chính.', 403)
    const session = await auth()
    const id = session?.user?.id == null ? NaN : Number(session.user.id)
    if (!Number.isSafeInteger(id) || id < 0) throw new CrmError('Vui lòng đăng nhập.', 401)
    const actor = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true, email: true, emailVerified: true } })
    if (!actor) throw new CrmError('Vui lòng đăng nhập lại.', 401)
    const result = await memberExportSheets(prisma, actor, await crmBody(request, 100000))
    if (result.input.format === 'GOOGLE') {
      if (!actor.email || !actor.emailVerified) throw new CrmError('Xác minh email tài khoản để nhận Google Sheet. Bạn vẫn có thể tải Excel.')
      const { createCourseGoogleSheet } = await import('@/lib/course/google-export')
      const sheetUrl = await createCourseGoogleSheet(result.sheets, `Học viên - ${result.title} - ${new Date().toLocaleDateString('vi-VN')}`, actor.email)
      return Response.json({ sheetUrl, total: result.total }, { headers: { 'Cache-Control': 'private, no-store' } })
    }
    const bytes = courseWorkbook(result.sheets)
    if (bytes.length > 4000000) throw new CrmError('File vượt 4 MB. Hãy xuất ít khóa/học viên hơn hoặc bỏ báo cáo chi tiết.', 413)
    const filename = `HocVien_${new Date().toISOString().slice(0, 10)}.xlsx`
    return new Response(new Uint8Array(bytes), { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'private, no-store', 'X-Export-Total': String(result.total) } })
  } catch (error) {
    if (error instanceof CrmError || error instanceof ZodError || error instanceof SyntaxError) return crmFailure(error)
    console.error('[CourseMemberExport]', error instanceof Error ? error.name : 'Unknown error')
    return Response.json({ error: 'Chưa xuất được thông tin học viên. Hãy thử lại hoặc liên hệ quản trị viên.' }, { status: 500, headers: { 'Cache-Control': 'private, no-store' } })
  }
}
