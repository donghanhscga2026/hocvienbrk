import prisma from '@/lib/prisma'

export const MB_TCA_PLAN_CODE = 'MB_TCA'
export const MB_TCA_SYSTEM_ID = 4
export const MB_TCA_APPLICATION_CODE = 'SYS4_MB_TCA_20260702_130000'

export async function getPlanApplicationByCode(applicationCode: string) {
  return prisma.systemPlanApplication.findUnique({
    where: { applicationCode },
    include: { businessPlan: true },
  })
}

export async function getEffectivePlanApplication(onSystem: number, at: Date) {
  return prisma.systemPlanApplication.findFirst({
    where: {
      onSystem,
      status: 'ACTIVE',
      startsAt: { lte: at },
      OR: [{ endsAt: null }, { endsAt: { gt: at } }],
    },
    include: { businessPlan: true },
    orderBy: { startsAt: 'desc' },
  })
}

export async function requireMbtcaApplication(at: Date) {
  const application = await getEffectivePlanApplication(MB_TCA_SYSTEM_ID, at)
  if (!application || application.businessPlan.code !== MB_TCA_PLAN_CODE) {
    throw new Error(`No active MB TCA application for system #${MB_TCA_SYSTEM_ID} at ${at.toISOString()}`)
  }
  return application
}
