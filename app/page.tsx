import { auth } from "@/auth";
import Header from "@/components/layout/Header";
import CourseCard from "@/components/course/CourseCard";
import MessageCard from "@/components/home/MessageCard";
import prisma from "@/lib/prisma";
import { getRandomMessage } from "./actions/message-actions";

export default async function Home() {
  const session = await auth();

  // Parallel: lấy user + courses + message cùng lúc
  const [courses, userRecord, message] = await Promise.all([
    (prisma as any).course.findMany({
      where: { status: true },
      orderBy: [{ pin: 'asc' }, { id: 'asc' }]
    }),
    session?.user?.id
      ? (prisma as any).user.findUnique({
        where: { id: parseInt(session.user.id) },
        select: { name: true, id: true, image: true }
      })
      : Promise.resolve(null),
    getRandomMessage()
  ]);

  const userName = userRecord?.name ?? null;
  const userId = userRecord?.id ?? null;
  const userImage = userRecord?.image ?? session?.user?.image ?? null;

  let myCourseIds: Set<number> = new Set();
  let enrollmentsMap: Record<number, any> = {};
  if (session?.user?.id) {
    const enrollments = await (prisma as any).enrollment.findMany({
      where: {
        userId: parseInt(session.user.id),
        status: 'ACTIVE'
      },
      select: {
        courseId: true,
        status: true,
        startedAt: true,
        resetAt: true,
        course: {
          select: {
            lessons: {
              select: { id: true }
            }
          }
        },
        lessonProgress: {
          where: {
            status: { not: 'RESET' } // Chỉ lấy progress chưa bị reset
          },
          select: {
            lessonId: true,
            status: true,
            createdAt: true
          }
        }
      }
    });
    enrollmentsMap = enrollments.reduce((acc: Record<number, any>, e: any) => {
      const totalLessons = e.course?.lessons?.length || 0;
      
      // Lọc progress chỉ tính các bài học không bị reset
      const filteredProgress = e.lessonProgress?.filter((lp: any) => {
        return lp.status !== 'RESET'
      }) || []
      
      const completedCount = filteredProgress.filter((lp: any) => lp.status === 'COMPLETED').length;
      myCourseIds.add(e.courseId);
      acc[e.courseId] = {
        status: e.status,
        startedAt: e.startedAt,
        completedCount,
        totalLessons
      };
      return acc;
    }, {});
  }


  const myCourses = courses.filter((c: any) => myCourseIds.has(c.id));
  const otherCourses = courses.filter((c: any) => !myCourseIds.has(c.id));

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header session={session} userImage={userImage} />

      {/* Hero Section */}
      <div className="pt-16">
        <MessageCard message={message} session={session} userName={userName || ''} userId={userId ? String(userId) : ''} />
      </div>

      {/* Course List Section */}
      <section id="khoa-hoc" className="container mx-auto px-4 pb-24">
        {session?.user ? (
          <>
            {/* Khóa học của tôi */}
            {myCourses.length > 0 && (
              <div className="mb-12 -mx-4 px-4 py-8 bg-zinc-950 rounded-b-3xl">
                <div className="mb-8 text-center">
                  <h2 className="text-2xl font-bold text-white">Khóa học của tôi</h2>
                  <div className="mx-auto mt-2 h-1 w-12 rounded-full bg-emerald-500"></div>
                </div>
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                  {myCourses.map((course: any, index: number) => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      isLoggedIn={!!session}
                      enrollment={enrollmentsMap[course.id] || null}
                      priority={index < 3}
                      darkMode={true}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Các khóa học khác */}
            {otherCourses.length > 0 && (
              <div>
                <div className="mb-8 text-center">
                  <h2 className="text-2xl font-bold text-gray-900">Tất cả khóa học</h2>
                  <div className="mx-auto mt-2 h-1 w-12 rounded-full bg-blue-600"></div>
                </div>
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                  {otherCourses.map((course: any, index: number) => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      isLoggedIn={!!session}
                      enrollment={enrollmentsMap[course.id] || null}
                      priority={index < 3}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-bold text-gray-900 ring-offset-current">Danh Sách Khóa Học</h2>
              <div className="mx-auto mt-2 h-1.5 w-16 rounded-full bg-blue-600"></div>
            </div>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((course: any, index: number) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  isLoggedIn={false}
                  enrollment={null}
                  priority={index < 6}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* Footer (Optional simple) */}
      <footer className="bg-gray-100 py-12 text-center text-gray-500 text-sm">
        <p>© 2026 Học viện BRK. All rights reserved.</p>
      </footer>
    </main>
  );
}
