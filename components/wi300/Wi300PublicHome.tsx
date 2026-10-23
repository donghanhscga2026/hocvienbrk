import { Suspense } from 'react'
import prisma from '@/lib/prisma'
import type { DeploymentBrand } from '@/lib/site-profile/deployment-brand'
import { defaultAppearance } from '@/lib/wi300/appearance'
import { readPublicProjects } from '@/lib/wi300/project-service'
import Wi300Businesses from './Wi300Businesses'
import { createHomeSections } from './Wi300HomeSections'

/** Public home has no course/payment/learning bundle and does not wait for a session. */
export default function Wi300PublicHome({ brand }: { brand: DeploymentBrand }) {
  const appearance = brand.appearance || defaultAppearance
  const sections = createHomeSections({ brand, appearance, projects: <Suspense key="projects" fallback={<ProjectsPending />}><Projects limit={appearance.home.projectLimit} /></Suspense> })
  return <main className="flex flex-col overflow-x-clip bg-brk-background text-brk-on-surface [&>section]:w-full">
    {!appearance.home.sections.hero && <h1 className="sr-only">{brand.name}</h1>}
    {appearance.home.order.map(section => appearance.home.sections[section] ? sections[section] : null)}
  </main>
}

async function Projects({ limit }: { limit: number }) {
  try {
    const projects = await readPublicProjects(prisma)
    return <Wi300Businesses projects={projects} limit={limit} />
  } catch (error) {
    console.error('[WI300 public home projects]', error instanceof Error ? error.name : 'Unknown')
    return <Wi300Businesses projects={[]} error limit={limit} />
  }
}

function ProjectsPending() {
  return <section id="du-an-wi" aria-busy="true" aria-label="Đang tải dự án Wi" className="mx-auto min-h-96 max-w-7xl scroll-mt-40 px-4 py-10 sm:py-12 lg:scroll-mt-24 lg:px-6">
    <h2 className="mb-6 text-2xl font-bold sm:text-3xl">Khám phá hệ sinh thái Wi</h2>
    <p role="status" className="text-sm text-brk-muted">Đang tải thông tin dự án…</p>
    <div aria-hidden="true" className="mt-6 grid gap-4 lg:grid-cols-2">{[0, 1, 2, 3].map(index => <div key={index} className="h-44 rounded-2xl border border-brk-outline bg-brk-surface motion-safe:animate-pulse" />)}</div>
  </section>
}
