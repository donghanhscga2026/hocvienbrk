import { auth } from "@/auth";
import Header from "@/components/layout/Header";
import CourseCard from "@/components/course/CourseCard";
import CourseSection from "@/components/home/CourseSection";
import MessageCard from "@/components/home/MessageCard";
import CommunityBoard from "@/components/home/CommunityBoard";
import Zero2HeroSurvey from "@/components/home/Zero2HeroSurvey";
import RealityMap from "@/components/home/RealityMap";
import prisma from "@/lib/prisma";
import { getRandomMessage } from "./actions/message-actions";
import { resetSurveyAction } from "./actions/survey-actions";
import { Sparkles } from "lucide-react";

export default async function Home() {
  const session = await auth();

  // Parallel: lấy user + courses + roadmap + points cùng lúc
  const [courses, userRecord, roadmapPoints, message] = await Promise.all([
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
    getRandomMessage()
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

      {/* Lộ trình Zero 2 Hero */}
      {session?.user && (
        <section className="container mx-auto px-4 py-8">
          {customPath === null ? (
            <Zero2HeroSurvey />
          ) : customPath.length === 0 ? (
            <div className="bg-zinc-950 rounded-[3rem] p-12 text-center border border-white/5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400/5 rounded-full blur-[100px]"></div>
                <div className="relative z-10 space-y-6">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/10">
                        <Sparkles className="w-10 h-10 text-yellow-400" />
                    </div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight italic">Bạn chưa có lộ trình riêng</h3>
                    <p className="text-gray-400 text-sm max-w-md mx-auto font-medium italic">
                        Hãy để AI giúp bạn thiết kế một con đường học tập cá nhân hóa dựa trên mục tiêu thực tế của bạn.
                    </p>
                    <form action={async () => {
                        'use server'
                        await resetSurveyAction()
                    }}>
                        <button className="bg-yellow-400 text-black px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-yellow-500 transition-all active:scale-95 shadow-xl shadow-yellow-400/10">
                            🚀 Thiết lập lộ trình cá nhân
                        </button>
                    </form>
                </div>
            </div>
          ) : (
            <RealityMap 
              customPath={customPath}
              enrollmentsMap={enrollmentsMap}
              allCourses={courses}
              userGoal={userGoal || 'Hoàn thiện kỹ năng'}
              targetPointId={targetPointId}
              roadmapPoints={safeRoadmapPoints}
              onReset={resetSurveyAction}
            />
          )}
        </section>
      )}

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
