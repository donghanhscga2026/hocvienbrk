import { auth } from "@/auth";
import Header from "@/components/layout/Header";
import CourseCard from "@/components/course/CourseCard";
import CourseSection from "@/components/home/CourseSection";
import MessageCard from "@/components/home/MessageCard";
import CommunityBoard from "@/components/home/CommunityBoard";
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
        select: { name: true, id: true, image: true, phone: true }
      })
      : Promise.resolve(null),
    getRandomMessage()
  ]);

  const userName = userRecord?.name ?? null;
  const userId = userRecord?.id ?? null;
  const userImage = userRecord?.image ?? session?.user?.image ?? null;
  const userPhone = userRecord?.phone ?? null;

  // 1. Sử dụng Set để lưu ID khóa học đã đăng ký
  // 1. Sử dụng Set để lưu ID khóa học đã đăng ký
let myCourseIds = new Set<number>();

let enrollmentsMap: Record<number, { 
  status: string; 
  startedAt: Date | null; 
  completedCount: number; 
  totalLessons: number;
  enrollmentId?: number;
  payment?: {
    id: number;
    status: string;
    proofImage?: string | null;
  };
}> = {};

if (session?.user?.id) {
  const userId = parseInt(session.user.id);

  const enrollments = await (prisma as any).enrollment.findMany({
    where: { userId },
    select: {
      id: true,
      courseId: true,
      status: true,
      startedAt: true,
      payment: {
        select: {
          id: true,
          status: true,
          proofImage: true
        }
      },
      course: {
        select: {
          _count: {
            select: { lessons: true }
          }
        }
      },
      _count: {
        select: {
          lessonProgress: {
            where: { status: 'COMPLETED' }
          }
        }
      }
    }
  });

  enrollments.forEach((e: any) => {
    myCourseIds.add(e.courseId);

    enrollmentsMap[e.courseId] = {
      status: e.status,
      startedAt: e.startedAt,
      completedCount: e._count?.lessonProgress || 0,
      totalLessons: e.course?._count?.lessons || 0,
      enrollmentId: e.id,
      payment: e.payment
    };
  });
}



  const myCourses = courses.filter((c: any) => myCourseIds.has(c.id));
  const otherCourses = courses.filter((c: any) => !myCourseIds.has(c.id));

  // Kiểm tra user có kích hoạt khóa 1 (86 ngày) không
  const isCourseOneActive = enrollmentsMap[1]?.status === 'ACTIVE';

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header session={session} userImage={userImage} />

      {/* Hero Section */}
      <div className="pt-16">
        <MessageCard message={message} session={session} userName={userName || ''} userId={userId ? String(userId) : ''} />
      </div>

      {/* Community Board Module */}
      <section className="container mx-auto px-4 py-8">
        <CommunityBoard isAdmin={session?.user?.role === 'ADMIN'} />
      </section>

      {/* Course List Section */}
      <section id="khoa-hoc" className="container mx-auto px-4 pb-24">
        {session?.user ? (
          <>
            {/* Khóa học của tôi */}
            {myCourses.length > 0 && (
              <CourseSection 
                title="Khóa học của tôi"
                courses={myCourses}
                session={session}
                enrollmentsMap={enrollmentsMap}
                isCourseOneActive={isCourseOneActive}
                userPhone={userPhone}
                userId={userId}
                darkMode={true}
                accentColor="bg-emerald-500"
              />
            )}

            {/* Các khóa học khác */}
            {otherCourses.length > 0 && (
              <CourseSection 
                title="Tất cả khóa học"
                courses={otherCourses}
                session={session}
                enrollmentsMap={enrollmentsMap}
                isCourseOneActive={isCourseOneActive}
                userPhone={userPhone}
                userId={userId}
                accentColor="bg-blue-600"
              />
            )}
          </>
        ) : (
          <CourseSection 
            title="Danh Sách Khóa Học"
            courses={courses}
            session={null}
            enrollmentsMap={{}}
            isCourseOneActive={false}
            userPhone={null}
            userId={null}
            accentColor="bg-blue-600"
          />
        )}
      </section>

      {/* Footer (Optional simple) */}
      <footer className="bg-gray-100 py-12 text-center text-gray-500 text-sm">
        <p>© 2026 Học viện BRK. All rights reserved.</p>
      </footer>
    </main>
  );
}
