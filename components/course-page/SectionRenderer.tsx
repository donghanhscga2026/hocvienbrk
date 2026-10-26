'use client'

import React from 'react'
import { CourseSection, CourseSectionType } from '@/lib/course-page/types'
import GiftTemplateSection from './sections/GiftTemplateSection'
import HeroSection from './sections/HeroSection'
import QuoteSection from './sections/QuoteSection'
import PainPointsSection from './sections/PainPointsSection'
import BenefitsSection from './sections/BenefitsSection'
import OutcomesSection from './sections/OutcomesSection'
import InstructorSection from './sections/InstructorSection'
import CommitmentSection from './sections/CommitmentSection'
import BonusesSection from './sections/BonusesSection'
import ValueStackSection from './sections/ValueStackSection'
import RoadmapSection from './sections/RoadmapSection'
import PricingSection from './sections/PricingSection'
import ClosingMessageSection from './sections/ClosingMessageSection'
import CurriculumSection from './sections/CurriculumSection'
import TestimonialsSection from './sections/TestimonialsSection'
import RichContentSection from './sections/RichContentSection'
import WiGrowArtworkSection from './sections/WiGrowArtworkSection'
import ImportedSection from './sections/ImportedSection'
import ZipSourceSection from './sections/ZipSourceSection'

const sectionRegistry: Record<CourseSectionType, React.ComponentType<any>> = {
  hero: HeroSection,
  quote: QuoteSection,
  pain_points: PainPointsSection,
  benefits: BenefitsSection,
  outcomes: OutcomesSection,
  instructor: InstructorSection,
  commitment: CommitmentSection,
  bonuses: BonusesSection,
  value_stack: ValueStackSection,
  roadmap: RoadmapSection,
  pricing: PricingSection,
  closing_message: ClosingMessageSection,
  curriculum: CurriculumSection,
  testimonials: TestimonialsSection,
  rich_content: RichContentSection,
  wigrow_artwork: WiGrowArtworkSection,
}

interface SectionRendererProps {
  sections: CourseSection[]
  isEnrolled: boolean
  lessons?: any[]
  testimonials?: any[]
  totalHours?: number
  activeStudentCount?: number
  course?: any
  session?: any
  onAction?: (actionType: string, target?: string, extra?: Record<string, string>) => void
  projectLabels?: React.ReactNode
}

export default function SectionRenderer({
  sections,
  isEnrolled,
  lessons = [],
  testimonials = [],
  totalHours = 0,
  activeStudentCount = 0,
  course,
  session,
  onAction,
  projectLabels,
}: SectionRendererProps) {
  const visibleSections = React.useMemo(() => {
    return [...sections]
      .filter((sec) => {
        if (!sec.enabled) return false
        // Filter based on user registration/enrollment status
        if (isEnrolled && sec.visibility === 'unregistered') return false
        if (!isEnrolled && sec.visibility === 'registered') return false
        return true
      })
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }, [sections, isEnrolled])

  // Đặt nhãn đúng một lần dưới hero đang hiển thị. Với HTML nhúng hoặc mẫu
  // không có hero, dùng dải thông tin ngoài nội dung để giữ nguyên mã đã lưu.
  const projectHero = visibleSections.find(section => ((section as any).sectionType || section.type) === 'hero' && !['zip-source-v1', 'imported-v1'].includes(section.variant || ''))

  return (
    <>
      {projectLabels && !projectHero && <aside aria-label="Thông tin dự án của khóa học" className="bg-white text-slate-900"><div className="mx-auto max-w-7xl px-4 py-2 sm:px-6">{projectLabels}</div></aside>}
      {visibleSections.map((section) => {
        const type = (section as any).sectionType || (section as any).type
        if (section.variant?.startsWith('wi300-gift')) return <GiftTemplateSection key={section.id || section.sectionKey} section={section} onAction={onAction} testimonials={testimonials} isEnrolled={isEnrolled} projectLabels={section === projectHero ? projectLabels : undefined} />
        if (section.variant === 'zip-source-v1') {
          return (
            <ZipSourceSection
              key={section.id}
              id={section.anchorId || section.sectionKey}
              content={section.content}
              onAction={onAction}
            />
          )
        }

        if (section.variant === 'imported-v1') {
          return (
            <ImportedSection
              key={section.id}
              id={section.anchorId || section.sectionKey}
              content={section.content}
              onAction={onAction}
            />
          )
        }

        const Component = sectionRegistry[type as CourseSectionType]
        if (!Component) {
          console.warn(`Unsupported course section type: ${type}`)
          return null
        }

        return (
          <Component
            projectLabels={section === projectHero ? projectLabels : undefined}
            key={section.id}
            id={section.anchorId || section.sectionKey}
            variant={section.variant}
            content={section.content}
            isEnrolled={isEnrolled}
            lessons={lessons}
            testimonials={testimonials}
            totalHours={totalHours}
            activeStudentCount={activeStudentCount}
            course={course}
            session={session}
            onAction={onAction}
          />
        )
      })}
    </>
  )
}
