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
      <Header />

      {/* Hero Section */}
      <section className="relative flex min-h-[400px] flex-col items-center justify-center bg-gradient-to-br from-[#7c3aed] to-[#5b21b6] px-4 pt-16 text-center text-white">
        <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="mb-4 text-4xl font-extrabold lg:text-5xl">
            Học viện BRK - Ngân hàng phước báu
          </h1>
          <p className="mb-8 text-xl font-medium text-purple-100 italic">
            Nơi khơi nguồn tri thức, xây dựng tương lai
          </p>
          <div className="mx-auto h-1 w-24 rounded-full bg-white/30"></div>
        </div>
      </section>

      {/* Intro Message */}
      <section className="container mx-auto max-w-5xl px-4 py-12 text-center">
        <div className="rounded-3xl bg-white p-8 shadow-sm border border-purple-50">
          <h2 className="mb-4 text-2xl font-bold text-[#7c3aed]">Xin chào Học viên thân mến!</h2>
          <p className="mx-auto max-w-3xl leading-relaxed text-gray-700">
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
