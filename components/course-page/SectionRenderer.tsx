'use client'

import React from 'react'
import { CourseSection, CourseSectionType } from '@/lib/course-page/types'
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
  onAction?: (actionType: string, target?: string) => void
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

  return (
    <>
      {visibleSections.map((section) => {
        const type = (section as any).sectionType || (section as any).type
        const Component = sectionRegistry[type as CourseSectionType]
        if (!Component) {
          console.warn(`Unsupported course section type: ${type}`)
          return null
        }

        return (
          <Component
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
