'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import CourseThemeProvider from './CourseThemeProvider'
import SectionRenderer from './SectionRenderer'
import dynamic from 'next/dynamic'
import NotificationBell from '@/components/notifications/NotificationBell'
import CrmRequestButton from '@/components/crm/CrmRequestButton'
import { CoursePage } from '@/lib/course-page/types'
import { checkEnrollmentStatusAction } from '@/app/actions/course-actions'
import { useDomainBrand } from '@/components/website/DomainShell'
import { mapFormDataToContact } from '@/lib/course-page/import-review'
import OfferingConsultation from '@/components/offerings/OfferingConsultation'
import { isQuoteService } from '@/lib/offerings/service'
import { offeringWorkspaceHref } from '@/lib/offerings/shared'

// Nội dung trang vẫn SSR; chỉ các cửa sổ tương tác được tải theo nhu cầu.
const modalLoading = () => <div role="status" className="fixed bottom-4 left-1/2 z-[250] -translate-x-1/2 rounded-xl bg-white px-5 py-3 text-sm shadow-lg">Đang mở…</div>
const ShareLinkModal = dynamic(() => import('./ShareLinkModal'), { ssr: false, loading: modalLoading })
const RegistrationFlowModal = dynamic(() => import('./RegistrationFlowModal'), { ssr: false, loading: modalLoading })

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
  wi300Breadcrumb?: React.ReactNode
  projectLabels?: React.ReactNode
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
  wi300Breadcrumb,
  projectLabels,
}: CoursePageViewProps) {
  const router = useRouter()
  const brand=useDomainBrand()

  // ── Modal state ──────────────────────────────────────────────────────────
  const [showShare, setShowShare] = React.useState(false)
  const [showRegistration, setShowRegistration] = React.useState(false)
  const [registrationPrefill, setRegistrationPrefill] = React.useState<{ fullName?: string; phone?: string; email?: string } | null>(null)

  // ── Enrollment / activation state ────────────────────────────────────────
  const [localEnrollment, setLocalEnrollment] = React.useState<any>(null)
  const [hasActivated, setHasActivated] = React.useState(false)

  const effectiveEnrollment = localEnrollment || enrollment
  const isEnrolled = effectiveEnrollment?.status === 'ACTIVE'
  const isOffering = course.productGroup && course.productGroup !== 'COURSE'
  const quoteOffering = course.productGroup === 'SERVICE' && isQuoteService(course.offeringDetails || {})

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
  const handleAction = (actionType: string, target?: string, extra?: Record<string, string>) => {
    if (actionType === 'open_registration') {
      if (quoteOffering) { document.getElementById('offering-sale-details')?.scrollIntoView({behavior:'smooth'}); return }
      if (isEnrolled) {
        router.push(isOffering ? offeringWorkspaceHref(course.productGroup,course.id_khoa) : `/courses/${course.id_khoa}/learn`)
        return
      }
      // Dữ liệu khách đã điền trên form của trang nhập: giữ để điền sẵn, không lưu DB.
      if (extra && Object.keys(extra).length) {
        const contact = mapFormDataToContact(extra)
        if (Object.keys(contact).length) setRegistrationPrefill(contact)
      }
      setShowRegistration(true)
    } else if (actionType === 'open_share') {
      if(brand && !brand.affiliate) return
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

  const importedLayout = coursePage.theme?.importedLayout === true
  const totalDays = 100
  const currentDay = Math.min(totalDays, Math.round((scrollProgress / 100) * totalDays))

  return (
    <CourseThemeProvider theme={coursePage.theme}>
      {/* Scroll progress bar */}
      {!importedLayout && coursePage.navigation.showProgress && (
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
      {!importedLayout && <nav
        className={`${wi300Breadcrumb ? 'sticky top-0' : 'fixed top-0 left-0 right-0'} z-50 px-2 py-2 pt-[calc(0.5rem_+_env(safe-area-inset-top))] flex justify-between items-center gap-1 sm:gap-3 sm:px-4`}
        style={{
          background: 'color-mix(in srgb, var(--course-surface) 92%, transparent)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--course-border)',
        }}
      >
        <div className="min-w-0 flex-1 truncate" style={{
          fontFamily: 'Cormorant Garamond, Georgia, serif',
          fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-heading)',
        }}>
          {coursePage.navigation.shortName}
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <button
          className="min-h-11 max-w-[110px] truncate sm:max-w-[190px]"
          onClick={() => handleAction('open_registration')}
          style={{
            background: 'var(--accent)',
            color: '#FFF7ED',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px', fontWeight: 600,
            padding: '10px 12px',
            borderRadius: 'var(--radius-button)',
            border: 'none', cursor: 'pointer',
            transition: 'var(--transition)',
            letterSpacing: '0.02em',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
        >
          {quoteOffering ? 'Gửi yêu cầu tư vấn' : isEnrolled ? isOffering ? 'Mở nội dung' : 'Vào học ngay' : coursePage.navigation.ctaText}
        </button>
        <div className="flex items-center justify-end gap-1"><NotificationBell /><CrmRequestButton courseId={course.id} courseTitle={course.name_lop} signedIn={!!session?.user} compact /></div>
        </div>
      </nav>}
      {wi300Breadcrumb}
      {isOffering && <div className={importedLayout || wi300Breadcrumb ? '' : 'pt-[calc(80px_+_env(safe-area-inset-top))]'}><section id="offering-sale-details" className="mx-auto max-w-7xl scroll-mt-24 space-y-3 rounded-xl border bg-white p-5 text-slate-900"><h2 className="text-xl font-bold">{course.name_lop}</h2><p className="text-2xl font-bold">{quoteOffering?'Liên hệ báo giá':course.phi_coc>0?course.phi_coc.toLocaleString('vi-VN')+'đ':'Miễn phí'}</p>{quoteOffering?<OfferingConsultation slug={course.id_khoa} questions={course.offeringDetails?.service?.questions||[]} signedIn={userId!=null}/>:<button type="button" onClick={()=>handleAction('open_registration')} className="min-h-12 rounded-xl bg-emerald-700 px-5 font-semibold text-white">{isEnrolled?'Mở nội dung':course.productGroup==='SERVICE'?'Đăng ký dịch vụ':'Mua / nhận sản phẩm'}</button>}</section></div>}

      {/* Page sections */}
      <div className={isOffering || importedLayout || wi300Breadcrumb ? '' : 'pt-[calc(80px_+_env(safe-area-inset-top))]'}>
        <SectionRenderer
          projectLabels={projectLabels}
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
      {!importedLayout && <footer
        className="py-10 text-center text-sm"
        style={{
          background: 'var(--course-surface)',
          color: 'var(--course-muted)',
          borderTop: '1px solid var(--course-border)',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <p>© 2026 {coursePage.name}. All rights reserved.</p>
      </footer>}

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
      {showRegistration && !quoteOffering && (
        <RegistrationFlowModal
          course={course}
          session={session}
          userPhone={userPhone}
          userId={userId}
          initialEnrollment={effectiveEnrollment}
          initialContact={registrationPrefill || undefined}
          onClose={() => { setShowRegistration(false); setRegistrationPrefill(null) }}
          onEnrolled={(enr) => {
            setLocalEnrollment(enr)
            if (enr?.status === 'ACTIVE') setHasActivated(true)
          }}
        />
      )}
    </CourseThemeProvider>
  )
}
