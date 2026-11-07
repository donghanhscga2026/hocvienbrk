'use server'
import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/get-session'
import { offeringTrialKey, readOfferingDetails } from '@/lib/offerings/server'
import { offeringAccess, offeringHref, offeringWorkspaceHref } from '@/lib/offerings/shared'

// Bắt đầu dùng thử cho một sản phẩm số. Mỗi tài khoản chỉ dùng thử 1 lần cho mỗi
// sản phẩm; bản ghi dùng thử nằm riêng trong SystemConfig, không tạo Enrollment
// nên không ảnh hưởng quyền của khách đã mua hoặc được tặng miễn phí.
export async function startOfferingTrialAction(slug: string): Promise<{ ok: boolean; error: string | null }> {
  const session = await getSession()
  const userId = session?.user?.id != null ? Number(session.user.id) : null
  if (userId == null || !Number.isSafeInteger(userId) || userId < 0)
    return { ok: false, error: 'Vui lòng đăng nhập để dùng thử.' }
  const course = await prisma.course.findUnique({
    where: { id_khoa: slug },
    select: { id: true, productGroup: true, phi_coc: true },
  })
  if (!course || course.productGroup !== 'DIGITAL')
    return { ok: false, error: 'Sản phẩm không hỗ trợ dùng thử.' }
  const details = await readOfferingDetails(course.id)
  if (!details.trialEnabled || details.kind === 'COMBO' || course.phi_coc <= 0)
    return { ok: false, error: 'Sản phẩm không hỗ trợ dùng thử.' }
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId: course.id } },
    include: { payment: { select: { verifiedAt: true } } },
  })
  if (enrollment) {
    if (enrollment.status === 'PENDING')
      return { ok: false, error: 'Bạn đang có đăng ký chờ thanh toán cho sản phẩm này.' }
    if (['ACTIVE', 'COMPLETED'].includes(enrollment.status))
      return {
        ok: false,
        error: offeringAccess(enrollment, details.accessDays)
          ? 'Bạn đã có quyền sử dụng sản phẩm này.'
          : 'Quyền sử dụng trước đây của bạn đã hết hạn, không áp dụng dùng thử lại.',
      }
  }
  const key = offeringTrialKey(course.id, userId)
  const existing = await prisma.systemConfig.findUnique({ where: { key } })
  if (existing) return { ok: false, error: 'Mỗi tài khoản chỉ dùng thử 1 lần cho mỗi sản phẩm.' }
  const startedAt = new Date()
  const endsAt = new Date(startedAt.getTime() + details.trialDays * 86400000)
  try {
    await prisma.systemConfig.create({
      data: { key, value: { startedAt: startedAt.toISOString(), endsAt: endsAt.toISOString() } },
    })
  } catch {
    return { ok: false, error: 'Mỗi tài khoản chỉ dùng thử 1 lần cho mỗi sản phẩm.' }
  }
  revalidatePath(offeringHref('DIGITAL', slug))
  revalidatePath(offeringWorkspaceHref('DIGITAL', slug))
  return { ok: true, error: null }
}
