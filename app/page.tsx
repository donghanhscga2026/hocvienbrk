import { auth } from "@/auth";
import Header from "@/components/layout/Header";
import MessageCard from "@/components/home/MessageCard";
import HomeClient from "@/components/home/HomeClient";
import prisma from "@/lib/prisma";
import { getRandomMessage } from "./actions/message-actions";
import { resetSurveyAction } from "./actions/survey-actions";
import { Sparkles } from "lucide-react";

export default async function Home() {
  const session = await auth();

  // [OPTIMIZE] Parallel: lấy tất cả dữ liệu cùng lúc (bao gồm enrollments)
  const [courses, userRecord, roadmapPoints, message, enrollments] = await Promise.all([
    (prisma as any).course.findMany({
      where: { status: true },
      orderBy: [{ pin: 'asc' }, { id: 'asc' }]
    }),
    session?.user?.id
      ? (prisma as any).user.findUnique({
        where: { id: parseInt(session.user.id) },
        select: { 
          name: true, id: true, image: true, phone: true,
          roadmap: true // Lấy bảng UserRoadmap mới
        }
      })
      : Promise.resolve(null),
    (prisma as any).roadmapPoint.findMany({
      orderBy: { pointId: 'asc' }
    }),
    getRandomMessage(),
    // [OPTIMIZE] Đưa enrollment vào Promise.all để chạy song song
    session?.user?.id
      ? (prisma as any).enrollment.findMany({
        where: { userId: parseInt(session.user.id) },
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
      })
      : Promise.resolve([])
  ]);

  const userName = userRecord?.name ?? null;
  const userId = userRecord?.id ?? null;
  const userImage = userRecord?.image ?? session?.user?.image ?? null;
  const userPhone = userRecord?.phone ?? null;
  
  // Dữ liệu từ bảng Roadmap mới
  const userRoadmap = userRecord?.roadmap;
  const customPath = (userRoadmap?.customPath as number[] | null) ?? null; // Đảm bảo luôn là null nếu không có
  const userGoal = userRoadmap?.goal ?? null;
  const targetPointId = userRoadmap?.targetPointId ?? 1;
  const safeRoadmapPoints = roadmapPoints || []; // Đảm bảo là mảng

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

  // [OPTIMIZE] enrollments đã lấy sẵn từ Promise.all, không cần query lại
  (enrollments as any[]).forEach((e: any) => {
    // Chỉ thêm vào danh sách "Khóa học của tôi" nếu đã kích hoạt hoặc hoàn thành
    if (e.status === 'ACTIVE' || e.status === 'COMPLETED') {
      myCourseIds.add(e.courseId);
    }

    enrollmentsMap[e.courseId] = {
      status: e.status,
      startedAt: e.startedAt,
      completedCount: e._count?.lessonProgress || 0,
      totalLessons: e.course?._count?.lessons || 0,
      enrollmentId: e.id,
      payment: e.payment
    };
  });



  // 1. Lọc lấy các khóa học đã đăng ký
  const myCourses = courses.filter((c: any) => myCourseIds.has(c.id));

  // Lọc khóa học chưa đăng ký và ưu tiên PENDING lên đầu
  const otherCourses = courses
    .filter((c: any) => !myCourseIds.has(c.id))
    .sort((a: any, b: any) => {
      const aPending = enrollmentsMap[a.id]?.status === 'PENDING' ? 0 : 1
      const bPending = enrollmentsMap[b.id]?.status === 'PENDING' ? 0 : 1
      return aPending - bPending
    })

  // Gom nhóm khóa học theo category cho phần "Tất cả khóa học"
  const groupedOtherCourses = otherCourses.reduce((acc: any[], course: any) => {
    const category = course.category || "Khác";
    const existingGroup = acc.find(g => g.category === category);
    if (existingGroup) {
      existingGroup.courses.push(course);
    } else {
      acc.push({ category, courses: [course] });
    }
    return acc;
  }, []);

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

      {/* Lộ trình Zero 2 Hero & Course Sections - Client Component */}
      <HomeClient 
        courses={courses}
        myCourses={myCourses}
        groupedOtherCourses={groupedOtherCourses}
        session={session}
        enrollmentsMap={enrollmentsMap}
        isCourseOneActive={isCourseOneActive}
        userPhone={userPhone}
        userId={userId}
        customPath={customPath}
        userGoal={userGoal}
        targetPointId={targetPointId}
        roadmapPoints={safeRoadmapPoints}
        resetSurveyAction={resetSurveyAction}
      />

      {/* Footer (Optional simple) */}
      <footer className="bg-gray-100 py-12 text-center text-gray-500 text-sm">
        <p>© 2026 Học viện BRK. All rights reserved.</p>
      </footer>
    </main>
  );
}
