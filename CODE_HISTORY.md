# CODE_HISTORY.md

================================================================================
PHIÊN BẢN: 1
NGÀY TẠO: 2026-02-28
MÔ TẢ: Phiên bản đầu tiên - Lưu toàn bộ code dự án BRK Academy

================================================================================
CẤU TRÚC DỰ ÁN VÀ Ý NGHĨA CÁC FILE
================================================================================

Dự án: BRK Academy (Học viện BRK - Nền tảng đào tạo trực tuyến)
Framework: Next.js 16.1.6 + NextAuth v5 + Prisma + PostgreSQL + Tailwind CSS v4

Cấu trúc thư mục:
------------------
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Trang chủ - Hiển thị danh sách khóa học
│   ├── layout.tsx                # Root layout - Font, metadata
│   ├── globals.css               # Tailwind CSS + Custom animations
│   ├── login/page.tsx            # Trang đăng nhập (credentials + Google)
│   ├── register/page.tsx         # Trang đăng ký tài khoản
│   ├── courses/[id]/learn/page.tsx # Trang học video + nộp bài
│   └── actions/                  # Server Actions
│       ├── auth-actions.ts       # Đăng ký user mới
│       ├── course-actions.ts     # Đăng ký khóa, lưu tiến độ, nộp bài
│       ├── comment-actions.ts    # Bình luận bài học
│       ├── account-actions.ts    # Quản lý tài khoản
│       └── admin-actions.ts      # Chức năng admin
│
├── components/                   # React Components
│   ├── layout/
│   │   └── Header.tsx            # Header với menu, user dropdown
│   ├── course/
│   │   ├── CourseCard.tsx        # Card hiển thị khóa học
│   │   ├── CoursePlayer.tsx     # Trình phát video + sidebar + nộp bài
│   │   ├── LessonSidebar.tsx    # Danh sách bài học (Desktop)
│   │   ├── VideoPlayer.tsx      # YouTube player với tracking
│   │   ├── AssignmentForm.tsx   # Form nộp bài tập
│   │   ├── ChatSection.tsx      # Bình luận bài học
│   │   ├── PaymentModal.tsx     # Modal thanh toán QR
│   │   └── StartDateModal.tsx   # Modal chọn ngày bắt đầu
│   └── ui/                      # UI Components (shadcn-ui style)
│       ├── button.tsx
│       ├── input.tsx
│       ├── dialog.tsx
│       ├── checkbox.tsx
│       ├── label.tsx
│       └── textarea.tsx
│
├── lib/                         # Thư viện tiện ích
│   ├── prisma.ts                # Prisma client singleton
│   ├── utils.ts                 # Hàm cn() cho Tailwind
│   ├── constants.ts             # Hằng số (reserved IDs)
│   ├── id-helper.ts             # Tính toán ID user
│   └── utils/id-generator.ts    # Generator ID
│
├── prisma/
│   ├── schema.prisma             # Database schema
│   └── seed.ts                  # Seed data script
│
├── scripts/                     # Scripts tiện ích
│   ├── import-csv.ts            # Import user từ CSV
│   ├── import-students.ts       # Import học viên
│   ├── seed-courses.ts          # Seed khóa học
│   ├── seed-lessons.ts          # Seed bài học
│   ├── seed-enrollments.ts      # Seed đăng ký
│   ├── make-admin.ts            # Script tạo admin
│   ├── import-v3-data.ts        # Import data v3
│   └── ...                      # Các script khác
│
├── auth.ts                      # NextAuth configuration
├── auth.config.ts               # NextAuth config chi tiết
├── package.json                  # Dependencies & scripts
└── tsconfig.json                # TypeScript config

Database Models (Prisma):
--------------------------
- User: Học viên (id, name, email, phone, role, referrerId)
- Account: Tài khoản OAuth (Google, etc)
- Session: Phiên đăng nhập
- Course: Khóa học (id_khoa, name_lop, phi_coc, etc)
- Lesson: Bài học (title, videoUrl, content, order)
- Enrollment: Đăng ký khóa học (status, startedAt)
- LessonProgress: Tiến độ học tập (scores, totalScore, assignment)
- LessonComment: Bình luận bài học
- SystemConfig: Cấu hình hệ thống
- ReservedId: ID đã đặt trước

================================================================================
TOÀN BỘ CODE
================================================================================

================================================================================
FILE: package.json
================================================================================
{
  "name": "brk-academy",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "postinstall": "prisma generate",
    "build": "prisma generate && next build",
    "start": "next start",
    "lint": "eslint",
    "import-csv": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/import-csv.ts",
    "process-legacy": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/process-legacy-users.ts",
    "check-missing": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/check-missing-ids.ts",
    "fill-missing": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/fill-missing-ids.ts",
    "change-id": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/change-id.ts",
    "add-reserved": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/add-reserved-id.ts",
    "import-reserved": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/import-reserved-list.ts",
    "make-admin": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/make-admin.ts",
    "seed-courses": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/seed-courses.ts",
    "seed-enrollments": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/seed-enrollments.ts",
    "import-v3": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/import-v3-data.ts",
    "push": "powershell -ExecutionPolicy Bypass -File ./scripts/push.ps1"
  },
  "dependencies": {
    "@auth/prisma-adapter": "^2.11.1",
    "@hookform/resolvers": "^5.2.2",
    "@prisma/client": "5.22.0",
    "@supabase/supabase-js": "^2.95.3",
    "@types/bcryptjs": "^2.4.6",
    "bcryptjs": "^3.0.3",
    "clsx": "^2.1.1",
    "csv-parser": "^3.2.0",
    "csv-writer": "^1.6.0",
    "dotenv": "^17.3.1",
    "fs": "^0.0.1-security",
    "lucide-react": "^0.570.0",
    "next": "16.1.6",
    "next-auth": "^5.0.0-beta.30",
    "prisma": "5.22.0",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "react-hook-form": "^7.71.1",
    "tailwind-merge": "^3.4.1",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.1.6",
    "tailwindcss": "^4",
    "ts-node": "^10.9.2",
    "typescript": "^5"
  },
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  }
}

================================================================================
FILE: prisma/schema.prisma
================================================================================
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model User {
  id            Int          @id @default(autoincrement())
  name          String?
  email         String       @unique
  emailVerified DateTime?
  image         String?
  password      String?
  phone         String?      @unique
  role          Role         @default(STUDENT)
  referrerId    Int?
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  accounts      Account[]
  enrollments   Enrollment[]
  sessions      Session[]
  comments      LessonComment[]
  referrer      User?        @relation("ReferrerToReferee", fields: [referrerId], references: [id])
  referrals     User[]       @relation("ReferrerToReferee")

  @@index([email])
  @@index([phone])
  @@index([referrerId])
}

model Account {
  userId            Int
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([provider, providerAccountId])
}

model Session {
  sessionToken String   @unique
  userId       Int
  expires      DateTime
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String
  expires    DateTime

  @@id([identifier, token])
}

model SystemConfig {
  key   String @id
  value Json
}

model ReservedId {
  id        Int      @id
  note      String?
  createdAt DateTime @default(now())
}

model Course {
  id            Int          @id @default(autoincrement())
  id_khoa       String       @unique
  name_lop      String
  name_khoa     String?
  date_join     String?
  status        Boolean      @default(true)
  pin           Int          @default(0)
  mo_ta_ngan    String?
  mo_ta_dai     String?
  link_anh_bia  String?      @map("link_anh_bia_khoa")
  link_zalo     String?
  phi_coc       Int          @default(0)
  stk           String?
  name_stk      String?
  bank_stk      String?
  noidung_stk   String?
  link_qrcode   String?
  file_email    String?
  noidung_email String?
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  type          CourseType   @default(NORMAL)
  lessons       Lesson[]
  enrollments   Enrollment[]
}

model Lesson {
  id               String           @id @default(cuid())
  courseId         Int
  title            String
  videoUrl         String?
  content          String?
  order            Int
  isDailyChallenge Boolean          @default(false)
  course           Course           @relation(fields: [courseId], references: [id], onDelete: Cascade)
  progress         LessonProgress[]
  comments         LessonComment[]

  @@unique([courseId, order])
}

model Enrollment {
  id           Int              @id @default(autoincrement())
  userId       Int
  courseId     Int
  status       EnrollmentStatus @default(PENDING)
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt
  link_anh_coc String?
  phi_coc      Int              @default(0)
  startedAt    DateTime?
  challengeDays Int?
  course       Course           @relation(fields: [courseId], references: [id], onDelete: Cascade)
  user         User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  lessonProgress LessonProgress[]

  @@unique([userId, courseId])
  @@index([userId])
  @@index([courseId])
}

model LessonProgress {
  id           Int        @id @default(autoincrement())
  enrollmentId Int
  lessonId     String
  scores       Json?
  totalScore   Int        @default(0)
  assignment   Json?
  status       String     @default("IN_PROGRESS")
  maxTime      Float      @default(0)
  duration     Float      @default(0)
  submittedAt  DateTime?
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  enrollment   Enrollment @relation(fields: [enrollmentId], references: [id], onDelete: Cascade)
  lesson       Lesson     @relation(fields: [lessonId], references: [id], onDelete: Cascade)

  @@unique([enrollmentId, lessonId])
  @@index([enrollmentId])
  @@index([lessonId])
}

model LessonComment {
  id        Int      @id @default(autoincrement())
  lessonId  String
  userId    Int
  content   String
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  lesson    Lesson   @relation(fields: [lessonId], references: [id], onDelete: Cascade)

  @@index([lessonId])
  @@index([userId])
}

enum EnrollmentStatus {
  PENDING
  ACTIVE
}

enum Role {
  ADMIN
  STUDENT
  INSTRUCTOR
  AFFILIATE
}

enum CourseType {
  NORMAL
  CHALLENGE
}

================================================================================
FILE: auth.ts
================================================================================
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { z } from "zod"
import prisma from "@/lib/prisma"
import { PrismaAdapter } from "@auth/prisma-adapter"
import type { User, Role } from "@prisma/client"
import bcrypt from "bcryptjs"
import { authConfig } from "./auth.config"

export const { handlers, signIn, signOut, auth } = NextAuth({
    ...authConfig,
    adapter: PrismaAdapter(prisma) as any,
    session: { strategy: "jwt" },
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
        }),
        Credentials({
            credentials: {
                identifier: { label: "Student ID / Email / Phone", type: "text" },
                password: { label: "Password", type: "password" },
            },
            authorize: async (credentials) => {
                const parsedCredentials = z
                    .object({ identifier: z.string(), password: z.string() })
                    .safeParse(credentials)

                if (parsedCredentials.success) {
                    const { identifier, password } = parsedCredentials.data

                    let user = null;
                    const isNumeric = /^\d+$/.test(identifier);
                    const isEmail = identifier.includes("@");

                    if (isNumeric) {
                        user = await prisma.user.findUnique({
                            where: { id: parseInt(identifier) }
                        });
                        if (!user) {
                            user = await prisma.user.findUnique({
                                where: { phone: identifier }
                            });
                        }
                    } else if (isEmail) {
                        user = await prisma.user.findUnique({
                            where: { email: identifier }
                        });
                    } else {
                        user = await prisma.user.findUnique({
                            where: { phone: identifier }
                        });
                    }

                    if (!user) return null;

                    if (!user.password) return null;

                    const passwordsMatch = await bcrypt.compare(password, user.password);
                    if (passwordsMatch) {
                        return {
                            id: user.id.toString(),
                            name: user.name,
                            email: user.email,
                            role: user.role,
                            image: user.image,
                        };
                    }
                }

                console.log("Invalid credentials");
                return null;
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user && user.id) {
                token.id = user.id.toString();
                token.role = user.role;
            }

            if (token.id) {
                try {
                    const freshUser = await prisma.user.findUnique({
                        where: { id: parseInt(token.id as string) },
                        select: { role: true }
                    });
                    if (freshUser) {
                        token.role = freshUser.role;
                    }
                } catch (error) {
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as Role;
            }
            return session;
        },
        async signIn({ user, account, profile }) {
            if (account?.provider === 'google') {
                return true;
            }
            return true;
        }
    },
    pages: {
        signIn: '/login',
    },
})

================================================================================
FILE: auth.config.ts
================================================================================
import type { NextAuthConfig } from "next-auth"

export const authConfig = {
    pages: {
        signIn: '/login',
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');

            if (isOnDashboard) {
                if (isLoggedIn) return true;
                return false;
            } else if (isLoggedIn) {
            }
            return true;
        },
    },
    providers: [],
} satisfies NextAuthConfig

================================================================================
FILE: app/layout.tsx
================================================================================
import type { Metadata } from "next";
import { Be_Vietnam_Pro, Inter } from "next/font/google";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  subsets: ["vietnamese", "latin"],
  variable: "--font-be-vietnam-pro",
});

const inter = Inter({
  subsets: ["vietnamese", "latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Học Viện BRK - Nâng Tầm Năng Lực",
  description: "Học viện đào tạo thực chiến về AI, Nhân hiệu và Affiliate",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${beVietnamPro.variable} ${inter.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

================================================================================
FILE: app/globals.css
================================================================================
@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-be-vietnam-pro), ui-sans-serif, system-ui, sans-serif;
}

@keyframes glow {

  0%,
  100% {
    text-shadow: 0 0 10px #facc15, 0 0 20px #facc15, 2px 2px 0px #854d0e;
  }

  50% {
    text-shadow: 0 0 20px #fde047, 0 0 35px #fde047, 2px 2px 0px #854d0e;
  }
}

.text-glow-3d {
  animation: glow 3s ease-in-out infinite;
  color: #facc15;
  letter-spacing: 0.1em;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-be-vietnam-pro), ui-sans-serif, system-ui, sans-serif;
}

================================================================================
FILE: app/page.tsx (Trang chủ)
================================================================================
import { auth } from "@/auth";
import Header from "@/components/layout/Header";
import CourseCard from "@/components/course/CourseCard";
import prisma from "@/lib/prisma";

export default async function Home() {
  const session = await auth();

  const [courses, userRecord] = await Promise.all([
    (prisma as any).course.findMany({
      where: { status: true },
      orderBy: [{ pin: 'asc' }, { id: 'asc' }]
    }),
    session?.user?.id
      ? (prisma as any).user.findUnique({
          where: { id: parseInt(session.user.id) },
          select: { name: true, id: true, image: true }
        })
      : Promise.resolve(null)
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
        course: {
          select: {
            lessons: {
              select: { id: true }
            }
          }
        },
        lessonProgress: {
          select: {
            lessonId: true,
            status: true
          }
        }
      }
    });
    enrollmentsMap = enrollments.reduce((acc: Record<number, any>, e: any) => {
      const totalLessons = e.course?.lessons?.length || 0;
      const completedCount = e.lessonProgress?.filter((lp: any) => lp.status === 'COMPLETED').length || 0;
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
      <Header session={session} userImage={userImage} />

      <section className="relative flex min-h-[320px] sm:min-h-[440px] flex-col items-center justify-center bg-gradient-to-br from-black via-zinc-900 to-black px-4 pt-20 pb-12 text-center text-white overflow-hidden">
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

      <section className="container mx-auto max-w-5xl px-4 py-8 sm:py-12 text-center">
        <div className="rounded-2xl sm:rounded-3xl bg-white p-6 sm:p-8 shadow-sm border border-purple-50">
          <h2 className="mb-4 text-xl sm:text-2xl font-bold text-[#7c3aed]">
            {session?.user
              ? `Mến chào ${userName || 'Học viên'} -   Mã học tập ${userId}!`
              : 'Xin chào bạn!'}
          </h2>
          <p className="mx-auto max-w-3xl text-sm sm:text-base leading-relaxed text-gray-700">
            Cổng học viện này là nơi tập hợp những tri thức thực chiến đỉnh cao về kinh doanh online,
            nhân hiệu và A.I. Chúng tôi ở đây để đồng hành cùng bạn trên hành trình lan tỏa giá trị
            và kiến tạo sự thịnh vượng bền vững từ gốc.
          </p>
        </div>
      </section>

      <section id="khoa-hoc" className="container mx-auto px-4 pb-24">
        {session?.user ? (
          <>
            {myCourses.length > 0 && (
              <div className="mb-12">
                <div className="mb-8 text-center">
                  <h2 className="text-2xl font-bold text-gray-900">Khóa học của tôi</h2>
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
                    />
                  ))}
                </div>
              </div>
            )}

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

      <footer className="bg-gray-100 py-12 text-center text-gray-500 text-sm">
        <p>© 2026 Học viện BRK. All rights reserved.</p>
      </footer>
    </main>
  );
}

================================================================================
FILE: app/login/page.tsx
================================================================================
'use client'

import { signIn } from "next-auth/react"
import { useForm } from "react-hook-form"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showPassword, setShowPassword] = useState(false)
    const router = useRouter()

    const { register, handleSubmit, formState: { errors } } = useForm({
        defaultValues: {
            identifier: "",
            password: ""
        }
    })

    async function onSubmit(data: any) {
        setIsLoading(true)
        setError(null)

        try {
            const result = await signIn("credentials", {
                identifier: data.identifier,
                password: data.password,
                redirect: false,
            })

            if (result?.error) {
                setError("Invalid credentials. Please try again.")
            } else {
                router.push("/")
                router.refresh()
            }
        } catch (err) {
            setError("An unexpected error occurred.")
        } finally {
            setIsLoading(false)
        }
    }

    const handleGoogleSignIn = () => {
        setIsLoading(true)
        signIn("google", { callbackUrl: "/" })
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-black text-white tracking-tight">HỌC VIỆN BRK</h1>
                    <p className="text-zinc-400 text-sm mt-1">Đăng nhập để tiếp tục hành trình</p>
                </div>

                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 space-y-5 shadow-2xl">
                    <button
                        onClick={handleGoogleSignIn}
                        disabled={isLoading}
                        className="flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-600 bg-white/5 px-4 py-3 text-sm font-medium text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                        <svg className="h-4 w-4 shrink-0" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z" /></svg>
                        Đăng nhập bằng Google
                    </button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-700" /></div>
                        <div className="relative flex justify-center text-xs"><span className="bg-transparent px-2 text-zinc-500">hoặc dùng tài khoản</span></div>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        {error && (
                            <div className="rounded-lg bg-red-900/30 border border-red-700/50 p-3 text-sm text-red-400">{error}</div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Email / SĐT / Mã học viên</label>
                            <input
                                {...register("identifier", { required: "Vui lòng nhập thông tin" })}
                                type="text"
                                autoComplete="username"
                                className="w-full rounded-xl border border-zinc-700 bg-white/5 px-4 py-3 text-white text-sm placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                placeholder="Nhập email hoặc mã học viên"
                            />
                            {errors.identifier && <p className="mt-1 text-xs text-red-400">{errors.identifier.message}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Mật khẩu</label>
                            <div className="relative">
                                <input
                                    {...register("password", { required: "Vui lòng nhập mật khẩu" })}
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="current-password"
                                    className="w-full rounded-xl border border-zinc-700 bg-white/5 px-4 py-3 pr-10 text-white text-sm placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                            {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 px-4 py-3 text-sm font-bold text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Đăng nhập'}
                        </button>
                    </form>

                    <p className="text-center text-sm text-zinc-500">
                        Chưa có tài khoản?{' '}
                        <Link href="/register" className="font-semibold text-orange-400 hover:text-orange-300">Đăng ký ngay</Link>
                    </p>
                </div>
            </div>
        </div>
    )
}

================================================================================
FILE: app/register/page.tsx
================================================================================
'use client'

import { useForm } from "react-hook-form"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, Eye, EyeOff } from "lucide-react"
import { registerUser } from "../actions/auth-actions"

export default function RegisterPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null)
    const [showPassword, setShowPassword] = useState(false)
    const router = useRouter()

    const { register, handleSubmit, formState: { errors } } = useForm({
        defaultValues: {
            name: "",
            email: "",
            phone: "",
            password: ""
        }
    })

    async function onSubmit(data: any) {
        setIsLoading(true)
        setError(null)
        setFieldErrors(null)

        try {
            const formData = new FormData()
            formData.append("name", data.name)
            formData.append("email", data.email)
            formData.append("phone", data.phone)
            formData.append("password", data.password)

            const result = await registerUser(null, formData)

            if (result?.message || result?.errors) {
                if (result.errors) {
                    setFieldErrors(result.errors)
                }
                if (result.message) {
                    setError(result.message)
                }
            }

        } catch (err: any) {
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-lg">
                <div className="text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">Create an account</h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Join BRK Academy today
                    </p>
                </div>

                <div className="space-y-4">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        {error && (
                            <div className="rounded-md bg-red-50 p-3 text-sm text-red-500">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Full Name
                            </label>
                            <input
                                {...register("name", { required: "Name is required" })}
                                type="text"
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                            />
                            {errors.name && (
                                <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
                            )}
                            {fieldErrors?.name && (
                                <p className="mt-1 text-xs text-red-500">{fieldErrors.name[0]}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Email
                            </label>
                            <input
                                {...register("email", {
                                    required: "Email is required",
                                    pattern: { value: /^\S+@\S+$/i, message: "Invalid email" }
                                })}
                                type="email"
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                            />
                            {errors.email && (
                                <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
                            )}
                            {fieldErrors?.email && (
                                <p className="mt-1 text-xs text-red-500">{fieldErrors.email[0]}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Phone Number
                            </label>
                            <input
                                {...register("phone", { required: "Phone is required" })}
                                type="tel"
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                            />
                            {errors.phone && (
                                <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>
                            )}
                            {fieldErrors?.phone && (
                                <p className="mt-1 text-xs text-red-500">{fieldErrors.phone[0]}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    {...register("password", {
                                        required: "Password is required",
                                        minLength: { value: 6, message: "Min 6 characters" }
                                    })}
                                    type={showPassword ? "text" : "password"}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 pr-10 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
                            )}
                            {fieldErrors?.password && (
                                <p className="mt-1 text-xs text-red-500">{fieldErrors.password[0]}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex w-full justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : "Sign up"}
                        </button>
                    </form>

                    <p className="text-center text-sm text-gray-600">
                        Already have an account?{" "}
                        <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}

================================================================================
FILE: app/courses/[id]/learn/page.tsx
================================================================================

import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { redirect } from "next/navigation"
import CoursePlayer from "@/components/course/CoursePlayer"

export default async function CourseLearnPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) redirect("/login")

    const enrollment = await (prisma as any).enrollment.findFirst({
        where: {
            userId: parseInt(session.user.id),
            course: { id_khoa: id },
            status: 'ACTIVE'
        },
        include: {
            course: {
                include: {
                    lessons: {
                        orderBy: { order: 'asc' }
                    }
                }
            },
            lessonProgress: {
                select: {
                    lessonId: true,
                    status: true,
                    scores: true,
                    totalScore: true,
                    assignment: true,
                    maxTime: true,
                    duration: true,
                    submittedAt: true,
                    updatedAt: true
                }
            }
        }
    })

    if (!enrollment || !enrollment.course) redirect(`/courses/${id}`)

    return (
        <div className="h-screen h-dvh bg-black overflow-hidden flex flex-col">
            <CoursePlayer
                course={enrollment.course}
                enrollment={enrollment}
                session={session}
            />
        </div>
    )
}

================================================================================
FILE: app/actions/auth-actions.ts
================================================================================
'use server'

import { z } from "zod"
import prisma from "@/lib/prisma"
import { Role } from "@prisma/client"
import bcrypt from "bcryptjs"
import { redirect } from "next/navigation"

const registerSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(10, "Phone number must be at least 10 characters"),
    password: z.string().min(6, "Password must be at least 6 characters"),
})

export async function registerUser(prevState: any, formData: FormData) {
    const data = Object.fromEntries(formData.entries())

    const validatedFields = registerSchema.safeParse(data)

    if (!validatedFields.success) {
        return {
            message: "Invalid fields",
            errors: validatedFields.error.flatten().fieldErrors,
        }
    }

    const { name, email, phone, password } = validatedFields.data

    const existingUser = await prisma.user.findFirst({
        where: {
            OR: [
                { email },
                { phone }
            ]
        }
    })

    if (existingUser) {
        return {
            message: "User already exists with this email or phone number",
        }
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    try {
        const { getNextAvailableId } = await import("@/lib/id-helper")
        const newId = await getNextAvailableId()

        await prisma.user.create({
            data: {
                id: newId,
                name,
                email,
                phone,
                password: hashedPassword,
                role: Role.STUDENT,
            },
        })
    } catch (error) {
        console.error("Failed to create user:", error)
        return {
            message: "Database Error: Failed to create user. Please try again.",
        }
    }

    redirect('/login')
}

================================================================================
FILE: app/actions/course-actions.ts
================================================================================
'use server'

import prisma from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

function calculateTimingScore(deadlineDate: Date, submittedAt: Date): number {
    const deadline = new Date(deadlineDate)
    deadline.setHours(23, 59, 59, 999)
    return submittedAt <= deadline ? 1 : -1
}

export async function getEnrollmentStatus(courseId: number) {
    const session = await auth()
    if (!session?.user?.id) return null

    const enrollment = await (prisma as any).enrollment.findUnique({
        where: {
            userId_courseId: {
                userId: parseInt(session.user.id),
                courseId: courseId
            }
        },
        include: {
            lessonProgress: { select: { status: true } },
            course: { select: { lessons: { select: { id: true } } } }
        }
    })

    if (!enrollment) return null

    const completedCount = enrollment.lessonProgress.filter((p: any) => p.status === 'COMPLETED').length
    const totalLessons = enrollment.course?.lessons?.length ?? 0

    return {
        status: enrollment.status as string,
        startedAt: enrollment.startedAt as Date | null,
        completedCount,
        totalLessons
    }
}

export async function enrollInCourseAction(courseId: number) {
    const session = await auth()
    if (!session?.user?.id) {
        throw new Error("Bạn cần đăng nhập để đăng ký khóa học.")
    }

    const userId = parseInt(session.user.id)

    const course = await (prisma as any).course.findUnique({
        where: { id: courseId }
    })

    if (!course) throw new Error("Không tìm thấy khóa học.")

    const initialStatus = course.phi_coc === 0 ? 'ACTIVE' : 'PENDING'

    const enrollment = await (prisma as any).enrollment.upsert({
        where: {
            userId_courseId: {
                userId,
                courseId
            }
        },
        update: {},
        create: {
            userId,
            courseId,
            status: initialStatus
        }
    })

    revalidatePath("/")
    revalidatePath(`/courses/${course.id_khoa}`)

    return {
        success: true,
        status: enrollment.status,
        courseId: course.id_khoa
    }
}

export async function confirmStartDateAction(courseId: number, startDate: Date) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    const userId = parseInt(session.user.id)

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const selectedDate = new Date(startDate)
    selectedDate.setHours(0, 0, 0, 0)

    if (selectedDate < today) {
        throw new Error("Ngày bắt đầu không được ở trong quá khứ.")
    }

    await (prisma as any).enrollment.update({
        where: { userId_courseId: { userId, courseId } },
        data: { startedAt: startDate }
    })

    revalidatePath(`/courses/[id]/learn`, 'layout')
    return { success: true }
}

export async function setChallengeDurationAction(courseId: number, days: number) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    const userId = parseInt(session.user.id)

    await (prisma as any).enrollment.update({
        where: { userId_courseId: { userId, courseId } },
        data: { challengeDays: days }
    })

    revalidatePath(`/courses/[id]/learn`, 'layout')
    return { success: true }
}

export async function getEnrollmentWithProgress(courseId: number) {
    const session = await auth()
    if (!session?.user?.id) return null

    const userId = parseInt(session.user.id)

    const enrollment = await (prisma as any).enrollment.findUnique({
        where: { userId_courseId: { userId, courseId } },
        include: {
            course: {
                include: {
                    lessons: {
                        orderBy: { order: 'asc' }
                    }
                }
            },
            lessonProgress: true
        }
    })

    return enrollment
}

export async function saveVideoProgressAction({
    enrollmentId,
    lessonId,
    maxTime,
    duration
}: {
    enrollmentId: number,
    lessonId: string,
    maxTime: number,
    duration: number
}) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    const percent = duration > 0 ? maxTime / duration : 0
    const vidScore = percent >= 0.95 ? 2 : percent >= 0.5 ? 1 : 0

    const existing = await (prisma as any).lessonProgress.findUnique({
        where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
        select: { scores: true }
    })
    const existingScores = (existing?.scores as any) ?? {}

    await (prisma as any).lessonProgress.upsert({
        where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
        update: {
            maxTime,
            duration,
            scores: { ...existingScores, vid: vidScore }
        },
        create: {
            enrollmentId,
            lessonId,
            maxTime,
            duration,
            scores: { vid: vidScore }
        }
    })

    return { success: true, vidScore, percent: Math.round(percent * 100) }
}


export async function submitAssignmentAction({
    enrollmentId,
    lessonId,
    reflection,
    links,
    supports
}: {
    enrollmentId: number,
    lessonId: string,
    reflection: string,
    links: string[],
    supports: boolean[]
}) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")
    const userId = parseInt(session.user.id)

    const [enrollment, lesson] = await Promise.all([
        (prisma as any).enrollment.findUnique({
            where: { id: enrollmentId },
            include: { course: true }
        }),
        (prisma as any).lesson.findUnique({
            where: { id: lessonId }
        })
    ])

    if (!enrollment || !lesson || !enrollment.startedAt) {
        throw new Error("Dữ liệu không hợp lệ hoặc chưa xác nhận ngày bắt đầu.")
    }

    const validLinks = links.filter((l: string) => l && l.trim().length > 0)

    const [otherProgresses, existingProgress] = await Promise.all([
        (prisma as any).lessonProgress.findMany({
            where: {
                enrollment: { userId },
                NOT: { lessonId }
            },
            select: { assignment: true }
        }),
        (prisma as any).lessonProgress.findUnique({
            where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
            select: { scores: true }
        })
    ])

    const allPastLinks = otherProgresses.flatMap((p: any) => p.assignment?.links || [])

    const currentUniqueLinks = new Set(validLinks)
    if (currentUniqueLinks.size < validLinks.length) {
        throw new Error("Phát hiện các link trùng nhau trong cùng một bài nộp. Vui lòng nộp các link khác nhau.")
    }

    const duplicates = validLinks.filter((link: string) => allPastLinks.includes(link))
    if (duplicates.length > 0) {
        throw new Error(`Phát hiện link đã nộp trong các bài trước: ${duplicates.join(', ')}. Vui lòng nộp nội dung mới.`)
    }

    let refScore = 0
    if (reflection.trim().length >= 50) refScore = 2
    else if (reflection.trim().length > 0) refScore = 1

    const pracScore = Math.min(validLinks.length, 3)
    const supportScore = supports.filter((s: boolean) => s === true).length

    const deadlineDate = new Date(enrollment.startedAt)
    deadlineDate.setDate(deadlineDate.getDate() + (lesson.order - 1))
    const submittedAt = new Date()
    const timingScore = calculateTimingScore(deadlineDate, submittedAt)

    const vidScore = (existingProgress?.scores as any)?.vid ?? 0
    const totalScore = vidScore + refScore + pracScore + supportScore + timingScore

    await (prisma as any).lessonProgress.upsert({
        where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
        update: {
            scores: { vid: vidScore, ref: refScore, prac: pracScore, support: supportScore, timing: timingScore },
            totalScore: Math.max(0, totalScore),
            assignment: { reflection, links: validLinks, supports },
            status: 'COMPLETED',
            submittedAt
        },
        create: {
            enrollmentId,
            lessonId,
            scores: { vid: vidScore, ref: refScore, prac: pracScore, support: supportScore, timing: timingScore },
            totalScore: Math.max(0, totalScore),
            assignment: { reflection, links: validLinks, supports },
            status: 'COMPLETED',
            submittedAt
        }
    })

    revalidatePath(`/courses/[id]/learn`, 'layout')
    return { success: true, totalScore }
}

export async function saveAssignmentDraftAction({
    enrollmentId,
    lessonId,
    reflection,
    links,
    supports
}: {
    enrollmentId: number,
    lessonId: string,
    reflection: string,
    links: string[],
    supports: boolean[]
}) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    const validLinks = links.filter((l: string) => l && l.trim().length > 0)

    const lesson = await (prisma as any).lesson.findUnique({
        where: { id: lessonId },
        select: { order: true }
    })

    const enrollment = await (prisma as any).enrollment.findUnique({
        where: { id: enrollmentId },
        select: { startedAt: true }
    })

    const existingProgress = await (prisma as any).lessonProgress.findUnique({
        where: { enrollmentId_lessonId: { enrollmentId, lessonId } }
    })

    const isCompleted = existingProgress?.status === 'COMPLETED'
    let canUpdateScore = true

    if (isCompleted && enrollment?.startedAt && lesson) {
        const deadline = new Date(enrollment.startedAt)
        deadline.setDate(deadline.getDate() + (lesson.order - 1))
        deadline.setHours(23, 59, 59, 999)
        
        if (new Date() > deadline) {
            canUpdateScore = false
        }
    }

    if (isCompleted && !canUpdateScore) {
        await (prisma as any).lessonProgress.update({
            where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
            data: {
                assignment: { reflection, links: validLinks, supports }
            }
        })
    } else {
        await (prisma as any).lessonProgress.upsert({
            where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
            update: {
                assignment: { reflection, links: validLinks, supports }
            },
            create: {
                enrollmentId,
                lessonId,
                assignment: { reflection, links: validLinks, supports }
            }
        })
    }

    return { success: true }
}

================================================================================
FILE: app/actions/comment-actions.ts
================================================================================
'use server'

import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function getCommentsByLesson(lessonId: string) {
    const comments = await prisma.lessonComment.findMany({
        where: { lessonId },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    image: true,
                    accounts: {
                        select: {
                            provider: true,
                            providerAccountId: true,
                        }
                    }
                }
            }
        },
        orderBy: {
            createdAt: 'asc'
        }
    })

    return comments.map(comment => {
        let avatar = comment.user.image
        
        if (!avatar) {
            const googleAccount = comment.user.accounts.find(a => a.provider === 'google')
            if (googleAccount) {
                avatar = `https://www.googleapis.com/plus/v1/people/${googleAccount.providerAccountId}?picture`
            }
        }

        if (!avatar) {
            const facebookAccount = comment.user.accounts.find(a => a.provider === 'facebook')
            if (facebookAccount) {
                avatar = `https://graph.facebook.com/${facebookAccount.providerAccountId}/picture`
            }
        }

        return {
            id: comment.id,
            content: comment.content,
            createdAt: comment.createdAt,
            userId: comment.userId,
            userName: comment.user.name,
            userAvatar: avatar
        }
    })
}

export async function createComment(lessonId: string, content: string) {
    const session = await auth()
    if (!session?.user?.id) {
        return { success: false, message: "Vui lòng đăng nhập để bình luận" }
    }

    const userId = parseInt(session.user.id as string)

    try {
        const comment = await prisma.lessonComment.create({
            data: {
                lessonId,
                userId,
                content: content.trim()
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                        accounts: {
                            select: {
                                provider: true,
                                providerAccountId: true,
                            }
                        }
                    }
                }
            }
        })

        let avatar = comment.user.image
        if (!avatar) {
            const googleAccount = comment.user.accounts.find(a => a.provider === 'google')
            if (googleAccount) {
                avatar = `https://www.googleapis.com/plus/v1/people/${googleAccount.providerAccountId}?picture`
            }
        }

        revalidatePath('/')

        return {
            success: true,
            comment: {
                id: comment.id,
                content: comment.content,
                createdAt: comment.createdAt,
                userId: comment.userId,
                userName: comment.user.name,
                userAvatar: avatar
            }
        }
    } catch (error) {
        console.error("Create comment error:", error)
        return { success: false, message: "Gửi bình luận thất bại" }
    }
}

================================================================================
FILE: lib/prisma.ts
================================================================================
import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
    return new PrismaClient();
};


declare global {
    var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;

================================================================================
FILE: lib/utils.ts
================================================================================
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

================================================================================
FILE: lib/constants.ts
================================================================================
export const RESERVED_IDS = [8668, 3773];

================================================================================
FILE: lib/id-helper.ts
================================================================================
import prisma from "./prisma"
import { RESERVED_IDS } from "./constants"

export async function getNextAvailableId(): Promise<number> {
    const maxUser = await prisma.user.aggregate({
        _max: { id: true }
    })
    
    const nextId = (maxUser._max.id || 0) + 1
    
    if (RESERVED_IDS.includes(nextId)) {
        const nextReserved = RESERVED_IDS.find(id => id > (maxUser._max.id || 0))
        if (nextReserved) return nextReserved
    }
    
    return nextId
}

================================================================================
FILE: components/layout/Header.tsx
================================================================================
'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { signOut } from 'next-auth/react'
import { User, Settings, LogOut, ChevronDown } from 'lucide-react'

export default function Header({ session, userImage }: { session: any, userImage?: string | null }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
    const userMenuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setIsUserMenuOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const userInitials = session?.user?.name 
        ? session.user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
        : '?'

    return (
        <header className="fixed top-0 z-50 w-full bg-black text-white shadow-xl border-b border-white/5">
            <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:px-8">
                <Link href="/" className="shrink-0 transition-opacity hover:opacity-80">
                    <Image
                        src="/logobrk-50px.png"
                        alt="Học Viện BRK Logo"
                        width={150}
                        height={50}
                        priority
                        className="object-contain"
                        style={{ height: '48px', width: 'auto' }}
                    />
                </Link>

                <nav className="hidden flex-1 items-center justify-center gap-12 text-[13px] font-black md:flex">
                    <Link href="/" className="transition-all hover:text-yellow-400 hover:scale-105 tracking-widest">TRANG CHỦ</Link>
                    <Link href="#khoa-hoc" className="transition-all hover:text-yellow-400 hover:scale-105 tracking-widest">KHÓA HỌC</Link>
                    <Link href="#" className="transition-all hover:text-yellow-400 hover:scale-105 tracking-widest">GIỚI THIỆU</Link>
                </nav>

                <div className="flex items-center gap-2 sm:gap-6">
                    {session ? (
                        <div className="relative" ref={userMenuRef}>
                            <button
                                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                className="flex items-center gap-2 rounded-full bg-zinc-800 px-3 py-1.5 pr-4 transition-all hover:bg-zinc-700"
                            >
                                {userImage || session?.user?.image ? (
                                    <img 
                                        src={userImage || session?.user?.image} 
                                        alt="Avatar"
                                        className="h-7 w-7 rounded-full object-cover border-2 border-yellow-400"
                                    />
                                ) : (
                                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-yellow-400 text-xs font-black text-black">
                                        {userInitials}
                                    </div>
                                )}
                                <span className="text-[11px] sm:text-[12px] font-black text-white whitespace-nowrap max-w-[200px] truncate">
                                    {session.user?.name}
                                </span>
                                <ChevronDown className={`h-3 w-3 text-zinc-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isUserMenuOpen && (
                                <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-zinc-700 bg-zinc-900 py-2 shadow-xl animate-in fade-in slide-in-from-top-2">
                                    <div className="border-b border-zinc-800 px-4 py-2 mb-1">
                                        <p className="text-xs font-bold text-white truncate">{session.user?.name}</p>
                                        <p className="text-[10px] text-zinc-500 truncate">{session.user?.email}</p>
                                    </div>
                                    <Link
                                        href="/account-settings"
                                        onClick={() => setIsUserMenuOpen(false)}
                                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                                    >
                                        <Settings className="h-4 w-4" />
                                        Cài đặt tài khoản
                                    </Link>
                                    <button
                                        onClick={() => signOut()}
                                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-zinc-800 transition-colors"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        Đăng xuất
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Link
                            href="/login"
                            className="hidden sm:inline-block rounded-full bg-white px-6 py-2 text-xs font-black text-black shadow-md transition-all hover:bg-yellow-400 hover:scale-105"
                        >
                            ĐĂNG NHẬP
                        </Link>
                    )}

                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-white transition-all hover:bg-white/10 md:hidden"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="h-6 w-6">
                            {isMenuOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                            )}
                        </svg>
                    </button>
                </div>
            </div>

            {isMenuOpen && (
                <div className="animate-in slide-in-from-top-4 absolute left-0 top-16 w-full border-b border-white/5 bg-black px-4 py-8 shadow-2xl md:hidden">
                    <nav className="flex flex-col gap-6 text-center text-sm font-black">
                        <Link href="/" onClick={() => setIsMenuOpen(false)} className="py-2 hover:text-yellow-400 hover:scale-105 transition-all">TRANG CHỦ</Link>
                        <Link href="#khoa-hoc" onClick={() => setIsMenuOpen(false)} className="py-2 hover:text-yellow-400 hover:scale-105 transition-all">KHÓA HỌC</Link>
                        <Link href="#" onClick={() => setIsMenuOpen(false)} className="py-2 hover:text-yellow-400 hover:scale-105 transition-all">GIỚI THIỆU</Link>
                        {!session ? (
                            <Link href="/login" onClick={() => setIsMenuOpen(false)} className="mt-4 rounded-xl bg-white py-4 text-black shadow-lg">ĐĂNG NHẬP</Link>
                        ) : (
                            <button
                                onClick={() => signOut()}
                                className="mt-4 rounded-xl bg-red-600 py-4 text-white shadow-lg"
                            >
                                ĐĂNG XUẤT
                            </button>
                        )}
                    </nav>
                </div>
            )}
        </header>
    )
}

================================================================================
FILE: components/course/CourseCard.tsx
================================================================================
'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import PaymentModal from './PaymentModal'
import { enrollInCourseAction } from '@/app/actions/course-actions'

interface CourseCardProps {
    course: any
    isLoggedIn: boolean
    enrollment?: {
        status: string
        startedAt: Date | null
        completedCount: number
        totalLessons: number
    } | null
    priority?: boolean
}

export default function CourseCard({ course, isLoggedIn, enrollment, priority = false }: CourseCardProps) {
    const [showPayment, setShowPayment] = useState(false)
    const [loading, setLoading] = useState(false)

    const isActive = enrollment?.status === 'ACTIVE'
    const isPending = enrollment?.status === 'PENDING'

    const handleAction = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (!isLoggedIn) {
            alert('Vui lòng Đăng nhập / Đăng ký tài khoản miễn phí để tiếp tục!')
            window.location.href = '/login'
            return
        }

        if (isActive) {
            window.location.href = `/courses/${course.id_khoa}/learn`
            return
        }

        if (course.phi_coc === 0) {
            setLoading(true)
            try {
                const res = await enrollInCourseAction(course.id)
                if (res.success) {
                    window.location.href = `/courses/${course.id_khoa}/learn`
                }
            } catch (err: any) {
                alert(err.message)
            } finally {
                setLoading(false)
            }
        } else {
            if (isPending) {
                setShowPayment(true)
            } else {
                setLoading(true)
                try {
                    const res = await enrollInCourseAction(course.id)
                    if (res.success) {
                        setShowPayment(true)
                    }
                } catch (err: any) {
                    alert(err.message)
                } finally {
                    setLoading(false)
                }
            }
        }
    }

    const progressPct = enrollment && enrollment.totalLessons > 0
        ? Math.round((enrollment.completedCount / enrollment.totalLessons) * 100)
        : 0

    return (
        <>
            <div className="group overflow-hidden rounded-2xl bg-white shadow-lg transition-all hover:shadow-2xl border border-gray-100 flex flex-col h-full">
                <div className="relative aspect-[16/9] w-full overflow-hidden shrink-0">
                    <Image
                        src={course.link_anh_bia || 'https://i.postimg.cc/PJPkm7vB/1.jpg'}
                        alt={course.name_lop}
                        fill
                        priority={priority}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                </div>

                <div className="p-5 flex flex-col flex-grow">
                    <div className="mb-3 flex items-center gap-2.5">
                        <span className="text-2xl leading-none drop-shadow-sm select-none shrink-0">📘</span>
                        <h3 className="text-base sm:text-lg font-black text-black leading-tight truncate flex-1"
                            style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
                            {course.name_lop}
                        </h3>
                    </div>

                    <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className={`inline-block rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider shadow-sm ${course.phi_coc === 0 ? 'bg-yellow-400 text-gray-900' : 'bg-red-600 text-white'}`}>
                            {course.phi_coc === 0 ? 'Miễn phí' : 'Phí cam kết'}
                        </span>
                        {isActive && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-sm border border-sky-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />
                                Đã kích hoạt
                                {enrollment?.startedAt && (
                                    <span className="opacity-80 font-normal">
                                        · Từ {new Date(enrollment.startedAt).toLocaleDateString('vi-VN')}
                                    </span>
                                )}
                            </span>
                        )}
                    </div>

                    <p className="mb-5 flex-grow text-[14px] font-medium text-gray-500 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: course.mo_ta_ngan || '' }} />

                    <button
                        onClick={handleAction}
                        disabled={loading}
                        className={`group/btn relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-full py-3.5 text-sm sm:text-base font-black shadow-xl transition-all active:scale-[0.97]
                            ${loading ? 'bg-gray-400 text-white cursor-not-allowed' :
                                isActive ? 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-emerald-200' :
                                    'bg-sky-500 text-white hover:bg-sky-600 hover:shadow-sky-200'}`}
                    >
                        {loading ? (
                            <span className="flex items-center gap-2 relative z-10">
                                <svg className="h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Đang kết nối...
                            </span>
                        ) : (
                            <>
                                {isActive && enrollment && enrollment.totalLessons > 0 && (
                                    <span
                                        className="absolute inset-0 transition-all duration-700"
                                        style={{ width: `${progressPct}%`, background: 'rgba(255,255,255,0.18)' }}
                                        aria-hidden="true"
                                    />
                                )}
                                <span className="relative z-10 flex items-center gap-2">
                                    <span>{isActive ? '📖' : '⚡'}</span>
                                    <span>
                                        {isActive ? 'Vào học tiếp' : course.phi_coc === 0 ? 'Kích hoạt miễn phí' : 'Kích hoạt ngay'}
                                        {isActive && enrollment && enrollment.totalLessons > 0 && (
                                            <span className="ml-1.5 font-normal opacity-90 text-[11px]">
                                                {enrollment.completedCount}/{enrollment.totalLessons} bài · {progressPct}%
                                            </span>
                                        )}
                                    </span>
                                    <span>{isActive ? '▶' : '🚀'}</span>
                                </span>
                            </>
                        )}
                    </button>

                    {isPending && !loading && (
                        <p className="mt-3 text-center text-xs font-bold text-orange-600 animate-pulse italic">
                            Đang chờ thanh toán...
                        </p>
                    )}
                </div>
            </div>

            {showPayment && (
                <PaymentModal
                    course={course}
                    onClose={() => setShowPayment(false)}
                />
            )}
        </>
    )
}

================================================================================
FILE: components/course/CoursePlayer.tsx (file lớn, hiển thị một phần)
================================================================================
'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import LessonSidebar from "./LessonSidebar"
import VideoPlayer from "./VideoPlayer"
import AssignmentForm from "./AssignmentForm"
import ChatSection from "./ChatSection"
import StartDateModal from "./StartDateModal"
import {
    confirmStartDateAction,
    saveVideoProgressAction,
    submitAssignmentAction
} from "@/app/actions/course-actions"
import { ArrowLeft, ListVideo, FileText, X, ClipboardCheck } from "lucide-react"
import Link from "next/link"

interface CoursePlayerProps {
    course: any
    enrollment: any
    session: any
}

type MobileTab = 'list' | 'content' | 'record'

export default function CoursePlayer({ course, enrollment: initialEnrollment, session }: CoursePlayerProps) {
    const [enrollment, setEnrollment] = useState(initialEnrollment)
    const [currentLessonId, setCurrentLessonId] = useState<string>(() => {
        const incomplete = enrollment.lessonProgress
            .filter((p: any) => p.status !== 'COMPLETED')
            .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        
        return incomplete[0]?.lessonId || course.lessons[0]?.id
    })
    const [videoPercent, setVideoPercent] = useState(0)
    const [mobileTab, setMobileTab] = useState<MobileTab>('content')
    const [progressMap, setProgressMap] = useState<Record<string, any>>(() =>
        enrollment.lessonProgress.reduce((acc: any, p: any) => {
            acc[p.lessonId] = p
            return acc
        }, {})
    )
    const [showContentModal, setShowContentModal] = useState(false)
    const assignmentFormRef = useRef<(() => Promise<void>) | undefined>(undefined)

    const [isMobile, setIsMobile] = useState(false)
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 767px)')
        setIsMobile(mq.matches)
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
        mq.addEventListener('change', handler)
        return () => mq.removeEventListener('change', handler)
    }, [])

    const currentLesson = course.lessons.find((l: any) => l.id === currentLessonId)
    const currentProgress = progressMap[currentLessonId]
    const hasDuration = currentProgress?.duration && currentProgress.duration > 0
    const initialPercent = hasDuration && currentProgress?.maxTime
        ? (currentProgress.maxTime / currentProgress.duration) * 100
        : undefined

    // ... (code continues - xem file gốc để xem đầy đủ)

    return (
        <div className="flex flex-col h-full">
            <header className="h-14 shrink-0 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-900 z-50 fixed top-0 left-0 right-0">
                <div className="flex items-center gap-3 min-w-0">
                    <Link href="/" className="shrink-0 text-zinc-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="font-bold text-white truncate text-sm sm:text-base">{course.name_lop}</h1>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-zinc-400">{completedCount}/{course.lessons.length}</span>
                    <div className="relative h-2.5 w-24 sm:w-32 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                            style={{ width: `${(completedCount / course.lessons.length) * 100}%` }}
                        />
                    </div>
                    <span className="text-xs font-bold text-emerald-400">{Math.round((completedCount / course.lessons.length) * 100)}%</span>
                </div>
            </header>
            {/* ... more code */}
        </div>
    )
}

// (File tiếp tục với LessonSidebarMobile và các hàm helper)

================================================================================
FILE: components/course/VideoPlayer.tsx
================================================================================
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { RotateCcw, CheckCircle } from 'lucide-react'

interface VideoPlayerProps {
    videoUrl: string | null
    playerId?: string
    initialMaxTime?: number
    initialPercent?: number
    onProgress: (maxTime: number, duration: number) => void
    onPercentChange: (percent: number) => void
}

function extractVideoId(url: string) {
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    return match && match[2].length === 11 ? match[2] : null
}

export default function VideoPlayer({
    videoUrl,
    playerId = 'yt-player',
    initialMaxTime = 0,
    initialPercent,
    onProgress,
    onPercentChange,
}: VideoPlayerProps) {
    const playerRef = useRef<any>(null)
    const saveIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const isCompletedRef = useRef(false)

    const initCompleted = initialPercent !== undefined && initialPercent >= 99.9
    const [isCompleted, setIsCompleted] = useState(initCompleted)

    const videoId = videoUrl ? extractVideoId(videoUrl) : null

    const setCompleted = (val: boolean) => {
        isCompletedRef.current = val
        setIsCompleted(val)
    }

    const trackProgress = () => {
        const player = playerRef.current
        if (!player?.getCurrentTime || !player?.getDuration) return
        const cur = player.getCurrentTime()
        const dur = player.getDuration()
        if (dur > 0) {
            const pct = cur / dur
            onPercentChange(Math.round(pct * 100))
            if (pct >= 0.999 && !isCompletedRef.current) {
                setCompleted(true)
            }
        }
    }

    const saveProgress = useCallback(() => {
        const player = playerRef.current
        if (!player?.getCurrentTime || !player?.getDuration) return
        const cur = player.getCurrentTime()
        const dur = player.getDuration()
        if (cur > 0 && dur > 0) {
            onProgress(cur, dur)
        }
    }, [onProgress])

    useEffect(() => {
        if (!videoId) return

        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== 'https://www.youtube.com') return
        }
        
        const handleBeforeUnload = () => {
            saveProgress()
        }
        window.addEventListener('message', handleMessage)
        window.addEventListener('beforeunload', handleBeforeUnload)
        window.addEventListener('pagehide', handleBeforeUnload)

        const initPlayer = () => {
            if (playerRef.current) {
                playerRef.current.destroy()
            }

            const startTime = initCompleted ? 0 : Math.floor(initialMaxTime)

            playerRef.current = new (window as any).YT.Player(playerId, {
                height: '100%',
                width: '100%',
                videoId,
                playerVars: {
                    autoplay: initCompleted ? 0 : 1,
                    modestbranding: 1,
                    rel: 0,
                    start: startTime,
                    playsinline: 1,
                    enablejsapi: 1,
                    fs: 1,
                },
                events: {
                    onReady: (e: any) => {
                        const duration = e.target.getDuration()
                        let pct = 0
                        if (initialPercent !== undefined) {
                            pct = initialPercent
                        } else if (initialMaxTime > 0 && duration > 0) {
                            pct = (initialMaxTime / duration) * 100
                        }

                        if (pct >= 99.9) {
                            setCompleted(true)
                            onPercentChange(100)
                        } else {
                            onPercentChange(Math.round(pct))
                            startTracking()
                        }
                    },
                    onStateChange: (e: any) => {
                        const YT = (window as any).YT.PlayerState
                        if (e.data === YT.PLAYING || e.data === YT.BUFFERING) {
                            startTracking()
                        } else {
                            stopTracking()
                        }
                        if (e.data === YT.ENDED) {
                            const dur = playerRef.current?.getDuration?.() || 0
                            if (dur > 0) {
                                onProgress(dur, dur)
                                onPercentChange(100)
                                setCompleted(true)
                            }
                        }
                    },
                    onError: (e: any) => {
                        console.error('YouTube player error:', e)
                    },
                },
            })
        }

        if ((window as any).YT?.Player) {
            initPlayer()
        } else {
            const prev = (window as any).onYouTubeIframeAPIReady
                ; (window as any).onYouTubeIframeAPIReady = () => {
                    if (typeof prev === 'function') prev()
                    initPlayer()
                }
            if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
                const tag = document.createElement('script')
                tag.src = 'https://www.youtube.com/iframe_api'
                document.head.appendChild(tag)
            }
        }

        return () => {
            window.removeEventListener('message', handleMessage)
            window.removeEventListener('beforeunload', handleBeforeUnload)
            window.removeEventListener('pagehide', handleBeforeUnload)
            stopTracking()
            playerRef.current?.destroy?.()
            playerRef.current = null
        }
    }, [videoId, saveProgress])

    const startTracking = () => {
        if (saveIntervalRef.current) return
        saveIntervalRef.current = setInterval(trackProgress, 5000)
    }

    const stopTracking = () => {
        if (saveIntervalRef.current) {
            clearInterval(saveIntervalRef.current)
            saveIntervalRef.current = null
        }
    }

    const handleRewatch = () => {
        setCompleted(false)
        playerRef.current?.seekTo?.(0, true)
        playerRef.current?.playVideo?.()
        startTracking()
    }

    if (!videoId) {
        return (
            <div className="aspect-video bg-zinc-900 flex items-center justify-center">
                <p className="text-zinc-500 text-sm">Bài học này không có video hướng dẫn</p>
            </div>
        )
    }

    return (
        <div className="relative w-full aspect-video bg-black overflow-hidden">
            <div className={isCompleted ? 'hidden' : 'w-full h-full relative'}>
                <div id={playerId} className="w-full h-full absolute inset-0" />
            </div>

            {isCompleted && (
                <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-3">
                    <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-emerald-500" />
                    <p className="text-white text-lg sm:text-xl font-bold">Video đã xem hết!</p>
                    <p className="text-zinc-400 text-xs sm:text-sm text-center px-4">
                        Hãy điền bài nộp để hoàn thành bài học.
                    </p>
                    <button
                        onClick={handleRewatch}
                        className="flex items-center gap-2 mt-1 px-5 py-2.5 rounded-full border border-zinc-600 text-zinc-300 hover:text-white hover:border-white transition-colors text-sm"
                    >
                        <RotateCcw className="w-4 h-4" /> Xem lại từ đầu
                    </button>
                </div>
            )}
        </div>
    )
}

================================================================================
FILE: components/course/AssignmentForm.tsx (file lớn, hiển thị một phần)
================================================================================
'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Loader2, Info, X, Send } from "lucide-react"
import { saveAssignmentDraftAction } from '@/app/actions/course-actions'

interface AssignmentFormProps {
    lessonId: string
    lessonOrder: number
    startedAt: Date | null
    videoPercent: number
    onSubmit: (data: any) => Promise<{ success: boolean; totalScore: number } | void>
    initialData?: any
    onSaveDraft?: React.RefObject<(() => Promise<void>) | undefined>
}

function formatDate(date: Date | null) {
    if (!date) return '--/--/----'
    return new Date(date).toLocaleDateString('vi-VN')
}

function calcDeadline(startedAt: Date | null, order: number) {
    if (!startedAt) return null
    const d = new Date(startedAt)
    d.setDate(d.getDate() + (order - 1))
    return d
}

// ... (RulesModal, SectionHead components)

// AssignmentForm chính:
// - Form gồm 5 phần: Video, Tâm đắc ngộ, Link video, Hỗ trợ, Đúng hạn
// - Tính điểm realtime: Video (max 2đ), Reflection (max 2đ), Links (max 3đ), Support (max 2đ), Timing (max 1đ)
// - Tổng điểm: 10đ, cần >= 5đ để hoàn thành bài
// - Lưu draft tự động khi rời trang, chuyển bài

export default function AssignmentForm({...}) {
    // ... (xem file gốc để xem đầy đủ code - 344 dòng)
}

================================================================================
FILE: components/course/ChatSection.tsx
================================================================================
'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { getCommentsByLesson, createComment } from '@/app/actions/comment-actions'
import { Send, LogIn, Loader2, MessageCircle } from 'lucide-react'
import Link from 'next/link'

interface Comment {
    id: number
    content: string
    createdAt: Date
    userId: number
    userName: string | null
    userAvatar: string | null
}

interface ChatSectionProps {
    lessonId: string
    session: any
}

export default function ChatSection({ lessonId, session }: ChatSectionProps) {
    const [comments, setComments] = useState<Comment[]>([])
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const [newComment, setNewComment] = useState('')
    const [error, setError] = useState('')
    const commentsEndRef = useRef<HTMLDivElement>(null)

    const commentCache = useRef<Map<string, Comment[]>>(new Map())
    const fetchingRef = useRef<string | null>(null)

    useEffect(() => {
        if (commentCache.current.has(lessonId)) {
            setComments(commentCache.current.get(lessonId)!)
            setLoading(false)
            return
        }

        if (fetchingRef.current === lessonId) return
        fetchingRef.current = lessonId

        setLoading(true)
        getCommentsByLesson(lessonId).then(data => {
            const mapped = data.map((c: any) => ({
                ...c,
                createdAt: new Date(c.createdAt)
            })) as Comment[]

            commentCache.current.set(lessonId, mapped)
            if (fetchingRef.current === lessonId) {
                setComments(mapped)
                setLoading(false)
                fetchingRef.current = null
            }
        })
    }, [lessonId])

    useEffect(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [comments])

    async function handleSendComment(e: React.FormEvent) {
        e.preventDefault()
        if (!newComment.trim()) return

        setSending(true)
        setError('')

        const result = await createComment(lessonId, newComment)

        if (result.success && result.comment) {
            const newEntry = result.comment as Comment
            const updated = [...(commentCache.current.get(lessonId) ?? []), newEntry]
            commentCache.current.set(lessonId, updated)
            setComments(updated)
            setNewComment('')
        } else {
            setError(result.message || 'Có lỗi xảy ra')
        }

        setSending(false)
    }

    // ... (formatTime, formatDate, getInitials, groupedComments)

    return (
        <div className="flex flex-col h-full">
            <div className="shrink-0 px-4 py-3 border-b border-zinc-800 bg-zinc-900">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-yellow-400" />
                    Tương tác
                    <span className="text-zinc-500 font-normal text-xs">({comments.length})</span>
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                {/* Comments list */}
            </div>

            <div className="shrink-0 border-t border-zinc-800 bg-zinc-900 p-3">
                {session?.user ? (
                    <form onSubmit={handleSendComment} className="flex gap-2">
                        <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Nhập bình luận..." className="flex-1 bg-zinc-800 border border-zinc-700 rounded-full px-4 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-yellow-400" disabled={sending} />
                        <button type="submit" disabled={!newComment.trim() || sending} className="shrink-0 w-10 h-10 rounded-full bg-yellow-400 text-black flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-yellow-300 transition-colors">
                            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                        </button>
                    </form>
                ) : (
                    <div className="text-center py-2">
                        <Link href="/login" className="inline-flex items-center gap-2 text-sm text-yellow-400 hover:text-yellow-300 transition-colors">
                            <LogIn className="h-4 w-4" />
                            Đăng nhập để bình luận
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}

================================================================================
FILE: components/course/PaymentModal.tsx
================================================================================
'use client'

import React from 'react'
import Image from 'next/image'

interface PaymentModalProps {
    course: any
    onClose: () => void
}

export default function PaymentModal({ course, onClose }: PaymentModalProps) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-2xl animate-in zoom-in-95 duration-200 overflow-hidden rounded-3xl bg-white shadow-2xl">
                <div className="bg-[#7c3aed] px-8 py-6 text-white">
                    <h2 className="text-2xl font-bold">Kích hoạt khóa học</h2>
                    <p className="text-purple-100 italic opacity-90">{course.name_lop}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
                    <div className="flex flex-col items-center justify-center text-center">
                        <div className="relative mb-4 h-56 w-56 overflow-hidden rounded-xl border-4 border-purple-100 p-2 shadow-inner">
                            <Image
                                src={course.link_qrcode || `https://img.vietqr.io/image/${course.bank_stk}-${course.stk}-compact.png?amount=${course.phi_coc}&addInfo=${course.noidung_stk}`}
                                alt="QR Code Thanh toán"
                                fill
                                className="object-contain"
                            />
                        </div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Quét mã QR để thanh toán nhanh
                        </p>
                    </div>

                    <div className="flex flex-col justify-center space-y-4">
                        <div className="rounded-2xl bg-gray-50 p-5 border border-gray-100">
                            <p className="text-sm font-semibold text-gray-400">Số tiền cần đóng:</p>
                            <p className="text-3xl font-black text-[#7c3aed]">
                                {course.phi_coc?.toLocaleString()}đ
                            </p>
                        </div>

                        <div className="space-y-3 px-1">
                            <div>
                                <span className="block text-xs font-bold text-gray-400 uppercase">Ngân hàng</span>
                                <span className="font-bold text-gray-800">{course.bank_stk || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="block text-xs font-bold text-gray-400 uppercase">Số tài khoản</span>
                                <span className="font-bold text-gray-800 select-all">{course.stk || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="block text-xs font-bold text-gray-400 uppercase">Chủ tài khoản</span>
                                <span className="font-bold text-gray-800">{course.name_stk || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="block text-xs font-bold text-gray-400 uppercase">Nội dung chuyển khoản</span>
                                <span className="inline-block rounded bg-purple-50 px-2 py-1 font-mono font-bold text-[#7c3aed] select-all border border-purple-100">
                                    {course.noidung_stk || 'Kich hoat khoa hoc'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-orange-50 px-8 py-4 text-center">
                    <p className="text-sm font-medium text-orange-700">
                        🚀 Sau khi chuyển khoản thành công, khóa học sẽ được kích hoạt tự động hoặc bác có thể nhắn Zalo hỗ trợ.
                    </p>
                </div>

                <div className="border-t p-4 flex justify-end">
                    <button onClick={onClose} className="rounded-xl px-6 py-2.5 font-bold text-gray-600 hover:bg-gray-100 transition-colors">
                        Để sau
                    </button>
                </div>

                <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    )
}

================================================================================
FILE: components/course/StartDateModal.tsx
================================================================================
'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CalendarDays, Loader2 } from "lucide-react"

interface StartDateModalProps {
    isOpen: boolean
    onConfirm: (date: Date) => Promise<void>
}

export default function StartDateModal({ isOpen, onConfirm }: StartDateModalProps) {
    const [loading, setLoading] = useState(false)
    const today = new Date().toISOString().split('T')[0]
    const [selectedDate, setSelectedDate] = useState(today)

    const handleConfirm = async () => {
        setLoading(true)
        try {
            await onConfirm(new Date(selectedDate))
        } catch (error: any) {
            alert(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen}>
            <DialogContent className="sm:max-w-[425px] bg-zinc-900 border-zinc-800 text-white">
                <DialogHeader>
                    <div className="w-12 h-12 bg-sky-500/10 rounded-full flex items-center justify-center mb-4">
                        <CalendarDays className="w-6 h-6 text-sky-500" />
                    </div>
                    <DialogTitle className="text-xl font-bold">Xác nhận ngày bắt đầu</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Hệ thống sẽ dựa vào ngày này để tính toán Deadline cho toàn bộ các bài học trong khóa của bạn. Lưu ý: Không được chọn ngày trong quá khứ.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="start-date" className="text-sm font-medium text-zinc-300">Chọn ngày bạn muốn bắt đầu lộ trình:</Label>
                        <Input
                            id="start-date"
                            type="date"
                            min={today}
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-zinc-950 border-zinc-800 text-white"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        onClick={handleConfirm}
                        disabled={loading}
                        className="w-full bg-sky-600 hover:bg-sky-500 text-white h-11 font-bold"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "XÁC NHẬN BẮT ĐẦU"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

================================================================================
FILE: components/course/LessonSidebar.tsx
================================================================================
'use client'

import { useState } from 'react'
import { cn } from "@/lib/utils"
import { CheckCircle2, PlayCircle, Lock, CalendarDays, RefreshCw } from "lucide-react"

interface Lesson {
    id: string
    title: string
    order: number
}

interface LessonSidebarProps {
    lessons: Lesson[]
    currentLessonId: string
    onLessonSelect: (lessonId: string) => void
    progress: Record<string, any>
    startedAt: Date | null
    onResetStartDate: (date: Date) => Promise<void>
}

function formatDateVN(date: Date | null) {
    if (!date) return ''
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function toInputValue(date: Date | null): string {
    if (!date) return ''
    const d = new Date(date)
    return d.toISOString().slice(0, 10)
}

function isLessonUnlocked(lesson: Lesson, lessons: Lesson[], progress: Record<string, any>) {
    if (lesson.order === 1) return true
    const prev = lessons.find(l => l.order === lesson.order - 1)
    if (!prev) return true
    const p = progress[prev.id]
    return p?.status === 'COMPLETED' && (p?.totalScore ?? 0) >= 5
}

export default function LessonSidebar({
    lessons, currentLessonId, onLessonSelect, progress, startedAt, onResetStartDate
}: LessonSidebarProps) {
    const [showDatePicker, setShowDatePicker] = useState(false)
    const [dateInput, setDateInput] = useState(toInputValue(startedAt))
    const [saving, setSaving] = useState(false)

    const handleReset = async () => {
        if (!dateInput) return
        setSaving(true)
        try {
            await onResetStartDate(new Date(dateInput))
            setShowDatePicker(false)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="flex flex-col h-full bg-zinc-900 border-r border-zinc-800 w-72 shrink-0">
            <div className="p-4 border-b border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-zinc-300">
                        <CalendarDays className="w-4 h-4 text-orange-400 shrink-0" />
                        <div>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Ngày bắt đầu lộ trình</p>
                            <p className="text-sm font-semibold text-white leading-tight">
                                {startedAt ? formatDateVN(startedAt) : '-- / -- / ----'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        className="flex items-center gap-1 text-[11px] text-orange-400 border border-orange-500/40 hover:border-orange-400 rounded-lg px-2 py-1 transition-colors"
                    >
                        <RefreshCw className="w-3 h-3" />
                        Đặt lại
                    </button>
                </div>

                {showDatePicker && (
                    <div className="bg-zinc-800 rounded-lg p-3 space-y-2 border border-zinc-700">
                        <p className="text-[10px] text-zinc-400">Chọn ngày mới (dd/mm/yyyy):</p>
                        <input
                            type="date"
                            value={dateInput}
                            onChange={e => setDateInput(e.target.value)}
                            className="w-full bg-zinc-700 text-white text-sm rounded-lg px-3 py-2 border border-zinc-600 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                        <div className="flex gap-2">
                            <button onClick={handleReset} disabled={!dateInput || saving} className="flex-1 text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-1.5 disabled:opacity-50 transition-colors">
                                {saving ? 'Đang lưu...' : 'Xác nhận'}
                            </button>
                            <button onClick={() => setShowDatePicker(false)} className="flex-1 text-xs text-zinc-400 hover:text-white border border-zinc-600 rounded-lg py-1.5 transition-colors">
                                Hủy
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="px-4 py-2 border-b border-zinc-800">
                <h2 className="font-bold text-sm text-zinc-400 uppercase tracking-wide">Nội dung khóa học</h2>
            </div>

            <div className="flex-1 overflow-y-auto">
                {lessons.map((lesson) => {
                    const prog = progress[lesson.id]
                    const isCompleted = prog?.status === 'COMPLETED'
                    const isActive = currentLessonId === lesson.id
                    const unlocked = isLessonUnlocked(lesson, lessons, progress)

                    return (
                        <button
                            key={lesson.id}
                            onClick={() => unlocked && onLessonSelect(lesson.id)}
                            disabled={!unlocked}
                            className={cn(
                                "w-full flex items-center gap-3 p-4 text-left transition-colors border-b border-zinc-800/50",
                                isActive && "bg-zinc-800 border-l-2 border-l-orange-500",
                                unlocked && !isActive && "hover:bg-zinc-800/50",
                                !unlocked && "opacity-40 cursor-not-allowed"
                            )}
                        >
                            <div className="shrink-0">
                                {isCompleted ? (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                ) : isActive ? (
                                    <PlayCircle className="w-5 h-5 text-orange-400" />
                                ) : !unlocked ? (
                                    <Lock className="w-4 h-4 text-zinc-600" />
                                ) : (
                                    <div className="w-5 h-5 rounded-full border-2 border-zinc-700 flex items-center justify-center text-[10px] text-zinc-500">
                                        {lesson.order}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={cn("text-sm font-medium line-clamp-2", isActive ? "text-white" : "text-zinc-400")}>
                                    {lesson.title}
                                </p>
                                {prog?.totalScore !== undefined && (
                                    <span className={cn("text-[10px] font-bold", prog.totalScore >= 5 ? "text-emerald-500" : "text-orange-400")}>
                                        {prog.totalScore >= 5 ? '✓' : '✗'} {prog.totalScore}/10đ
                                    </span>
                                )}
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

================================================================================
FILE: prisma/seed.ts
================================================================================
import { PrismaClient, Role } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

const options: any = {
    datasourceUrl: process.env.DATABASE_URL
}

const prisma = new PrismaClient(options)

async function main() {
    console.log('Starting seed...')
    try {
        const admin = await prisma.user.upsert({
            where: { id: 0 },
            update: {},
            create: {
                id: 0,
                email: 'admin@brk.com',
                name: 'BRK Admin',
                role: Role.ADMIN,
                phone: '0909000000',
                password: '$2b$10$EpRnTzVlqHNP0.fMdQbL.e/KA/1h.q9s525aw.z8M.CI6k.v1Giv2',
            },
        })
        console.log('Seed successful:', { admin })
    } catch (error) {
        console.error('Seed failed:', error)
        throw error
    }
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })

================================================================================
HẾT PHIÊN BẢN 1
================================================================================

================================================================================
LƯU Ý CHO CÁC PHIÊN BẢN SAU:
================================================================================
- Mỗi khi có thay đổi code, tạo phiên bản mới với format:
  ================================================================================
  PHIÊN BẢN: [SỐ]
  NGÀY: [Ngày tháng năm]
  THAY ĐỔI: [Mô tả thay đổi]
  FILE: [Tên file thay đổi]
  
  [Nội dung code đã cập nhật]
  =================================================================================
- Giữ nguyên các phiên bản cũ để theo dõi lịch sử
- Phiên bản mới nhất luôn ở cuối file

================================================================================
PHIÊN BẢN: 2
NGÀY: 2026-02-28
THAY ĐỔI: Thêm tính năng import lessons từ Google Docs và hiển thị embed

FILES ĐƯỢC THÊM:
- scripts/import-lessons-from-csv.ts: Script import 133 bài học từ CSV vào database
- Danh sach bai hoc Mentor 7.csv: File CSV chứa danh sách 133 bài học

FILES ĐƯỢC SỬA:
- components/course/VideoPlayer.tsx: Thêm prop lessonContent và hiển thị Google Docs embed
- components/course/CoursePlayer.tsx: Truyền lessonContent cho VideoPlayer

MÔ TẢ CHI TIẾT:
1. Script import-less.ts:
   -ons-from-csv Đọc file CSV "Danh sach bai hoc Mentor 7.csv"
   - STT trong CSV = order bài học (1-133)
   - Chuyển link Google Docs: /edit -> /preview (để embed)
   - Upsert vào bảng Lesson với courseId = 16

2. VideoPlayer.tsx - Thêm logic hiển thị:
   - Nếu có YouTube videoId -> Hiển thị YouTube player
   - Nếu không có video + có link Google Docs -> Hiển thị iframe embed
   - Nếu không có video + có HTML content -> Hiển thị HTML trực tiếp
   - Nếu không có gì -> Hiển thị thông báo

3. CoursePlayer.tsx:
   - Truyền lessonContent={currentLesson?.content} cho VideoPlayer

================================================================================
HẾT PHIÊN BẢN 2
================================================================================

================================================================================
PHIÊN BẢN: 3
NGÀY: 2026-03-02
THAY ĐỔI: Thêm tính năng MessageCard, tự động chấm điểm video, dark mode cho khóa học

FILES ĐƯỢC THÊM:
- components/home/MessageCard.tsx: Component hiển thị thông điệp động với ảnh nền
- app/actions/message-actions.ts: Server action lấy thông điệp ngẫu nhiên
- scripts/seed-messages.ts: Script seed 10 messages với ảnh nền từ postimg.cc
- prisma/schema.prisma: Thêm model Message

FILES ĐƯỢC SỬA:
- components/course/CourseCard.tsx: Thêm prop darkMode cho phần "Khóa học của tôi"
- components/course/AssignmentForm.tsx: Thêm auto-scoring +2 cho lesson không có video
- next.config.ts: Thêm domain postimg.cc cho Image component
- components/home/MessageCard.tsx: 
  * pt-[30px] md:pt-[70px] - Điều chỉnh padding top cho mobile/desktop
  * bo tròn góc trên desktop: md:rounded-none bỏ bo tròn
  * Font size sử dụng clamp() để tự động điều chỉnh theo màn hình
- app/page.tsx:
  * darkMode={true} cho "Khóa học của tôi"
  * Nền tối bg-zinc-950 cho section "Khóa học của tôi"
  * Bỏ bo tròn góc trên: rounded-b-3xl

MÔ TẢ CHI TIẾT:
1. MessageCard.tsx:
   - Hiển thị thông điệp ngẫu nhiên từ database
   - Ảnh nền từ postimg.cc với lớp phủ tối
   - Responsive: font size tự động với clamp()
   - Modal chi tiết khi click vào card

2. Auto-scoring cho lesson không có video:
   - AssignmentForm nhận prop videoUrl
   - Nếu không có videoUrl hoặc rỗng -> auto cộng 2 điểm

3. Dark mode cho "Khóa học của tôi":
   - Nền: bg-zinc-950 thay vì mặc định
   - CourseCard với darkMode={true}: text-white, bg-zinc-900

4. Layout:
   - Header: fixed top-0
   - MessageCard: pt-16 (padding-top = 64px để tránh header)
   - Container: mx-auto với lề 2 bên

================================================================================
HẾT PHIÊN BẢN 3
================================================================================
