import { redirect, notFound } from 'next/navigation'
import { learningProfileActor } from '@/lib/learning-profile/server'
import { LearningProfileError, learningProfileHref } from '@/lib/learning-profile/shared'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Hồ sơ học tập', robots: { index: false, follow: false } }
export default async function Page() {
  try { redirect(learningProfileHref((await learningProfileActor()).id)) }
  catch (error) {
    if (error instanceof LearningProfileError && error.status === 401) redirect('/login?callbackUrl=%2Fho-so-hoc-tap')
    if (error instanceof LearningProfileError && error.status === 403) notFound()
    throw error
  }
}
