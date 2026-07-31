'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import CourseThemeProvider from './CourseThemeProvider'
import SectionRenderer from './SectionRenderer'
import ShareLinkModal from './ShareLinkModal'
import RegistrationFlowModal from './RegistrationFlowModal'
import { CoursePage } from '@/lib/course-page/types'
import { checkEnrollmentStatusAction } from '@/app/actions/course-actions'

interface CoursePageViewProps {
  coursePage: CoursePage
  course: any
  enrollment?: any
  userPhone: string | null
  userId: number | null
  session: any
  lessons?: any[]
  testimonials?: any[]
  totalHours?: number
  activeStudentCount?: number
}

export default function CoursePageView({
  coursePage,
  course,
  enrollment,
  userPhone,
  userId,
  session,
  lessons = [],
  testimonials = [],
  totalHours = 0,
  activeStudentCount = 0,
}: CoursePageViewProps) {
  const router = useRouter()

  // ── Modal state ──────────────────────────────────────────────────────────
  const [showShare, setShowShare] = React.useState(false)
  const [showRegistration, setShowRegistration] = React.useState(false)

  // ── Enrollment / activation state ────────────────────────────────────────
  const [localEnrollment, setLocalEnrollment] = React.useState<any>(null)
  const [hasActivated, setHasActivated] = React.useState(false)

  const effectiveEnrollment = localEnrollment || enrollment
  const isEnrolled = effectiveEnrollment?.status === 'ACTIVE'

  // ── Scroll progress ───────────────────────────────────────────────────────
  const [scrollProgress, setScrollProgress] = React.useState(0)

  React.useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight
      if (totalHeight > 0) {
        setScrollProgress((window.scrollY / totalHeight) * 100)
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // ── Passive polling when payment modal is NOT open (background check) ────
  React.useEffect(() => {
    if (!course?.id || hasActivated || isEnrolled || showRegistration) return
    const interval = setInterval(async () => {
      try {
        const res = await checkEnrollmentStatusAction(course.id)
        if (res.status === 'ACTIVE') {
          setHasActivated(true)
          setLocalEnrollment((prev: any) => ({ ...(prev || {}), status: 'ACTIVE' }))
          router.refresh()
        }
      } catch {}
    }, 10_000)
    const timeout = setTimeout(() => clearInterval(interval), 20 * 60 * 1000)
    return () => { clearInterval(interval); clearTimeout(timeout) }
  }, [course?.id, hasActivated, isEnrolled, showRegistration, router])

  // ── Action handler (called by sections) ──────────────────────────────────
  const handleAction = (actionType: string, target?: string) => {
    if (actionType === 'open_registration') {
      if (isEnrolled) {
        router.push(`/courses/${course.id_khoa}/learn`)
        return
      }
      setShowRegistration(true)
    } else if (actionType === 'open_share') {
      if (!session) {
        // Not logged in — open registration flow which starts at auth
        setShowRegistration(true)
        return
      }
      setShowShare(true)
    } else if (actionType === 'scroll') {
      const el = document.getElementById(target || '')
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    } else if (actionType === 'external_link') {
      if (target) window.open(target, '_blank')
    }
  }

  const totalDays = 100
  const currentDay = Math.min(totalDays, Math.round((scrollProgress / 100) * totalDays))

  return (
    <CourseThemeProvider theme={coursePage.theme}>
      {/* Scroll progress bar */}
      {coursePage.navigation.showProgress && (
        <div className="fixed right-[18px] top-0 bottom-0 z-40 hidden md:flex items-center pointer-events-none">
          <div className="relative w-[2px] h-[70vh] bg-white/10 mx-auto">
            <div
              className="absolute top-0 left-0 w-full transition-all duration-75"
              style={{
                height: `${scrollProgress}%`,
                background: 'linear-gradient(to bottom, var(--accent), var(--accent-hover))',
              }}
            />
            <div
              className="absolute bottom-[-28px] left-1/2 -translate-x-1/2 text-[10px] opacity-50 whitespace-nowrap"
              style={{ fontFamily: 'Inter, monospace', color: 'var(--text-muted)' }}
            >
              {currentDay}/{totalDays}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex justify-between items-center"
        style={{
          background: 'rgba(23,24,35,0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border-dark)',
        }}
      >
        <div style={{
          fontFamily: 'Cormorant Garamond, Georgia, serif',
          fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-heading)',
        }}>
          {coursePage.navigation.shortName}
        </div>

        <button
          onClick={() => handleAction('open_registration')}
          style={{
            background: 'var(--accent)',
            color: '#FFF7ED',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px', fontWeight: 600,
            padding: '10px 22px',
            borderRadius: 'var(--radius-button)',
            border: 'none', cursor: 'pointer',
            transition: 'var(--transition)',
            letterSpacing: '0.02em',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
        >
          {isEnrolled ? 'Vào học ngay' : coursePage.navigation.ctaText}
        </button>
      </nav>

      {/* Page sections */}
      <div className="pt-[72px]">
        <SectionRenderer
          sections={coursePage.sections}
          isEnrolled={isEnrolled}
          lessons={lessons}
          testimonials={testimonials}
          totalHours={totalHours}
          activeStudentCount={activeStudentCount}
          course={course}
          session={session}
          onAction={handleAction}
        />
      </div>

      {/* Footer */}
      <footer
        className="py-10 text-center text-sm"
        style={{
          background: 'var(--bg-dark)',
          color: 'var(--text-muted)',
          borderTop: '1px solid var(--border-dark)',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <p>© 2026 {coursePage.name}. All rights reserved.</p>
      </footer>

      {/* ── Share Link Modal ─────────────────────────────────────────────── */}
      {showShare && (
        <ShareLinkModal
          course={course}
          userId={userId}
          isEnrolled={isEnrolled}
          onClose={() => setShowShare(false)}
        />
      )}

      {/* ── Registration Flow Modal ──────────────────────────────────────── */}
      {showRegistration && (
        <RegistrationFlowModal
          course={course}
          session={session}
          userPhone={userPhone}
          userId={userId}
          initialEnrollment={effectiveEnrollment}
          onClose={() => setShowRegistration(false)}
          onEnrolled={(enr) => {
            setLocalEnrollment(enr)
            if (enr?.status === 'ACTIVE') setHasActivated(true)
          }}
        />
      )}
    </CourseThemeProvider>
  )
}
