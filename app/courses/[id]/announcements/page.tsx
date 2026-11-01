import { getSession } from '@/lib/get-session'
import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function CourseAnnouncementsPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const session = await getSession()
    if (!session?.user?.id) redirect('/login')

    const userId = Number(session.user.id)

    const course = await prisma.course.findUnique({
        where: { id_khoa: id },
        select: { id: true, id_khoa: true, name_lop: true },
    })
    if (!course) redirect(`/khoa-hoc/${id}`)

    const enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId: course.id } },
        select: { status: true },
    })
    if (!enrollment || enrollment.status !== 'ACTIVE') redirect(`/khoa-hoc/${id}`)

    let announcements: { id: number; title: string; body: string; createdAt: Date }[] = []
    try {
        announcements = await prisma.courseAnnouncement.findMany({
            where: { courseId: course.id },
            orderBy: { createdAt: 'desc' },
            take: 50,
            select: { id: true, title: true, body: true, createdAt: true },
        })
    } catch {
        // Bảng CourseAnnouncement chưa được tạo (chưa chạy migration) — hiện danh sách trống.
        announcements = []
    }

    return (
        <div className="min-h-screen bg-brk-background pb-20">
            <div className="mx-auto max-w-2xl p-4">
                <Link href={`/courses/${course.id_khoa}/learn`} className="text-sm text-brk-primary">
                    ← Quay lại phòng học
                </Link>
                <h1 className="mt-3 text-xl font-bold">Thông báo từ giảng viên</h1>
                <p className="mt-1 text-sm text-gray-600">Khóa: {course.name_lop}</p>

                {announcements.length === 0 ? (
                    <p className="mt-8 rounded-2xl border border-brk-outline bg-white p-6 text-center text-sm text-gray-500">
                        Chưa có thông báo nào từ giảng viên.
                    </p>
                ) : (
                    <div className="mt-5 space-y-3">
                        {announcements.map(item => (
                            <article key={item.id} className="rounded-2xl border border-brk-outline bg-white p-4">
                                <p className="text-sm font-semibold">{item.title}</p>
                                <p className="mt-0.5 text-xs text-gray-500">
                                    {new Date(item.createdAt).toLocaleString('vi-VN')}
                                </p>
                                <p className="mt-2 whitespace-pre-line text-sm text-gray-700">{item.body}</p>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
