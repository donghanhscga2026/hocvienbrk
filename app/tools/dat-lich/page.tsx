import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import prisma from '@/lib/prisma'
import MainHeader from '@/components/layout/MainHeader'
import AdminBookingPanel from '@/components/booking/AdminBookingPanel'
import { parseFormSchema } from '@/lib/booking/slots'
import { isExpertRole, listAvailability, listBookings, listSessions, type BookingActor } from '@/lib/booking/service'

export const dynamic = 'force-dynamic'

/**
 * Quản trị đặt lịch hẹn 1:1: phiên hẹn, lịch rảnh theo tuần, ngày ngoại lệ
 * và danh sách lịch đã đặt. Giáo viên quản lý lịch của mình; quản trị viên
 * xem tất cả và xử lý thay. Giai đoạn 1 — kế hoạch đặt lịch (23/10/2026).
 */
export default async function ToolsDatLichPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/')
  const actor: BookingActor = {
    id: Number(session.user.id),
    role: session.user.role || 'STUDENT',
    name: session.user.name || '',
  }
  if (!isExpertRole(actor.role)) {
    return (
      <div className="min-h-screen bg-slate-50">
        <MainHeader title="Đặt lịch hẹn" />
        <main className="mx-auto max-w-3xl p-6">
          <p className="text-slate-500">Bạn không có quyền quản lý lịch hẹn. Tính năng này dành cho giáo viên và quản trị viên.</p>
        </main>
      </div>
    )
  }

  const [sessions, availability, bookings, courses] = await Promise.all([
    listSessions(actor),
    listAvailability(actor, actor.id),
    listBookings(actor),
    prisma.course.findMany({
      where: actor.role === 'ADMIN' ? {} : { teacherId: actor.id },
      orderBy: { id: 'desc' },
      take: 200,
      select: { id: true, name_khoa: true, name_lop: true },
    }),
  ])

  const host = (await headers()).get('host') || 'giautoandien.io.vn'

  return (
    <div className="min-h-screen bg-slate-50">
      <MainHeader title="Quản lý lịch hẹn 1:1" />
      <main className="mx-auto max-w-6xl p-4 sm:p-6">
        <AdminBookingPanel
          meId={actor.id}
          role={actor.role}
          origin={`https://${host}`}
          courses={courses.map((c) => ({ id: c.id, name: c.name_khoa || c.name_lop || `Khóa #${c.id}` }))}
          initialSessions={sessions.map((s) => ({
            id: s.id,
            code: s.code,
            expertId: s.expertId,
            expertName: s.expert.name || 'Chuyên gia',
            courseId: s.courseId,
            title: s.title,
            description: s.description,
            coverUrl: s.coverUrl,
            durationMin: s.durationMin,
            mode: s.mode,
            meetingUrl: s.meetingUrl,
            isPrivate: s.isPrivate,
            autoConfirm: s.autoConfirm,
            cancelBeforeHours: s.cancelBeforeHours,
            minNoticeHours: s.minNoticeHours,
            maxDaysAhead: s.maxDaysAhead,
            bufferMin: s.bufferMin,
            status: s.status,
            formFields: parseFormSchema(s.formSchema),
          }))}
          initialRules={availability.rules.map((r) => ({ weekday: r.weekday, startMin: r.startMin, endMin: r.endMin }))}
          initialExceptions={availability.exceptions}
          bookings={bookings.map((b) => ({
            id: b.id,
            code: b.code,
            guestName: b.guestName,
            guestEmail: b.guestEmail,
            guestPhone: b.guestPhone,
            startsAt: b.startsAt.toISOString(),
            endsAt: b.endsAt.toISOString(),
            status: b.status,
            sessionTitle: b.session.title,
            expertName: b.expert.name || 'Chuyên gia',
            source: b.source,
          }))}
        />
      </main>
    </div>
  )
}
