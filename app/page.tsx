import { auth } from "@/auth";
import Header from "@/components/layout/Header";
import CourseCard from "@/components/course/CourseCard";
import prisma from "@/lib/prisma";

export default async function Home() {
  const session = await auth();
  const courses = await (prisma as any).course.findMany({
    where: { status: true },
    orderBy: { id: 'asc' }
  });

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header session={session} />

      {/* Hero Section */}
      <section className="relative flex min-h-[320px] sm:min-h-[440px] flex-col items-center justify-center bg-gradient-to-br from-black via-zinc-900 to-black px-4 pt-20 pb-12 text-center text-white overflow-hidden">
        {/* Subtle Decorative Elements */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-yellow-400/5 blur-[100px] rounded-full"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-yellow-400/5 blur-[100px] rounded-full"></div>

        <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-700 relative z-10">
          <h1 className="mb-4 flex flex-col gap-0 sm:gap-0 font-black tracking-tighter">
            <span className="text-3xl sm:text-5xl lg:text-6xl uppercase text-white drop-shadow-2xl opacity-90 pb-2">HỌC VIỆN BRK</span>
            <span className="text-glow-3d text-2xl sm:text-4xl lg:text-5xl uppercase drop-shadow-2xl leading-tight">NGÂN HÀNG PHƯỚC BÁU</span>
          </h1>
          <p className="mb-10 text-lg sm:text-2xl font-medium text-gray-400 italic">
            Nơi khơi nguồn tri thức, xây dựng tương lai
          </p>
          <div className="mx-auto h-1.5 w-32 rounded-full bg-gradient-to-r from-transparent via-yellow-400/50 to-transparent"></div>
        </div>
      </section>

      {/* Intro Message */}
      <section className="container mx-auto max-w-5xl px-4 py-8 sm:py-12 text-center">
        <div className="rounded-2xl sm:rounded-3xl bg-white p-6 sm:p-8 shadow-sm border border-purple-50">
          <h2 className="mb-4 text-xl sm:text-2xl font-bold text-[#7c3aed]">Xin chào Học viên thân mến!</h2>
          <p className="mx-auto max-w-3xl text-sm sm:text-base leading-relaxed text-gray-700">
            Cổng học viện này là nơi tập hợp những tri thức thực chiến đỉnh cao về kinh doanh online,
            nhân hiệu và A.I. Chúng tôi ở đây để đồng hành cùng bạn trên hành trình lan tỏa giá trị
            và kiến tạo sự thịnh vượng bền vững từ gốc.
          </p>
        </div>
      </section>

      {/* Course List Section */}
      <section id="khoa-hoc" className="container mx-auto px-4 pb-24">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-gray-900 ring-offset-current">Danh Sách Khóa Học</h2>
          <div className="mx-auto mt-2 h-1.5 w-16 rounded-full bg-blue-600"></div>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course: any, index: number) => (
            <CourseCard
              key={course.id}
              course={course}
              isLoggedIn={!!session}
              priority={index < 6}
            />
          ))}
        </div>
      </section>

      {/* Footer (Optional simple) */}
      <footer className="bg-gray-100 py-12 text-center text-gray-500 text-sm">
        <p>© 2026 Học viện BRK. All rights reserved.</p>
      </footer>
    </main>
  );
}
