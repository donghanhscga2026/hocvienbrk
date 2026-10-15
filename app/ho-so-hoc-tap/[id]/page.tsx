import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { learningProfileActor } from '@/lib/learning-profile/server'
import { readLearningProfile } from '@/lib/learning-profile/service'
import { LearningProfileError, learningProfileHref } from '@/lib/learning-profile/shared'
import LearningProfileView from '@/components/learning-profile/LearningProfileView'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const metadata: Metadata = { title: 'Hồ sơ học tập', robots: { index: false, follow: false }, referrer: 'same-origin' }
const querySchema = z.object({ course: z.coerce.number().int().positive().optional(), page: z.coerce.number().int().min(1).max(10000).optional(), lessonPage: z.coerce.number().int().min(1).max(10000).optional() })

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ id }, raw] = await Promise.all([params, searchParams])
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id))) notFound()
  const query = querySchema.safeParse(raw)
  if (!query.success) notFound()
  try {
    const actor = await learningProfileActor()
    const data = await readLearningProfile(prisma, actor, Number(id), query.data)
    return <LearningProfileView data={data} />
  } catch (error) {
    if (error instanceof LearningProfileError) {
      if (error.status === 401) redirect('/login?callbackUrl=' + encodeURIComponent(learningProfileHref(id, query.data.course)))
      if ([400, 403, 404].includes(error.status)) notFound()
    }
    throw error
  }
}
