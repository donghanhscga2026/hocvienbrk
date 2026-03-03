# CODE_HISTORY.md

================================================================================
PHIÊN BẢN: 1
NGÀY TẠO: 2026-03-03
MÔ TẢ: Phiên bản đầu tiên - Lưu toàn bộ code dự án BRK Academy
================================================================================

================================================================================
CẤU TRÚC DỰ ÁN VÀ Ý NGHĨA CÁC FILE
================================================================================

Dự án: BRK Academy (Học viện BRK - Nền tảng đào tạo trực tuyến)
Framework: Next.js 16.1.6 + NextAuth v5 + Prisma + PostgreSQL + Tailwind CSS v4

Cấu trúc thư mục:
------------------
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Trang chủ - Hiển thị danh sách khóa học + MessageCard
│   ├── layout.tsx                # Root layout - Font Be Vietnam Pro, Inter
│   ├── globals.css               # Tailwind CSS v4 + Custom animations (text-glow-3d)
│   ├── login/page.tsx            # Trang đăng nhập (credentials + Google)
│   ├── register/page.tsx         # Trang đăng ký tài khoản
│   ├── account-settings/page.tsx # Trang cài đặt tài khoản
│   ├── courses/[id]/learn/page.tsx # Trang học video + nộp bài
│   ├── admin/                    # Trang admin
│   │   ├── layout.tsx            # Admin layout
│   │   └── reserved-ids/         # Quản lý ID đặt trước
│   ├── api/auth/[...nextauth]/route.ts # NextAuth API route
│   └── actions/                  # Server Actions
│       ├── auth-actions.ts       # Đăng ký user mới
│       ├── course-actions.ts     # Đăng ký khóa, lưu tiến độ, nộp bài, reset lộ trình
│       ├── comment-actions.ts    # Bình luận bài học
│       ├── account-actions.ts    # Quản lý tài khoản
│       ├── admin-actions.ts      # Chức năng admin
│       └── message-actions.ts    # Tin nhắn chào mừng
│
├── components/                   # React Components
│   ├── layout/
│   │   └── Header.tsx           # Header với menu, user dropdown
│   ├── course/
│   │   ├── CourseCard.tsx       # Card hiển thị khóa học
│   │   ├── CoursePlayer.tsx     # Trình phát video + sidebar + nộp bài
│   │   ├── LessonSidebar.tsx    # Danh sách bài học (Desktop)
│   │   ├── VideoPlayer.tsx      # YouTube player với tracking
│   │   ├── AssignmentForm.tsx   # Form nộp bài tập (5 section: Video, Reflection, Links, Support, Timing)
│   │   ├── ChatSection.tsx      # Bình luận bài học
│   │   ├── PaymentModal.tsx     # Modal thanh toán QR
│   │   └── StartDateModal.tsx   # Modal chọn ngày bắt đầu
│   ├── home/
│   │   └── MessageCard.tsx      # Card hiển thị tin nhắn chào mừng
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
│   ├── utils.ts                # Hàm cn() cho Tailwind
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
│   ├── change-id.ts             # Đổi ID user
│   ├── add-reserved-id.ts       # Thêm ID đặt trước
│   ├── import-reserved-list.ts  # Import danh sách ID đặt trước
│   └── ...                      # Các script khác
│
├── auth.ts                      # NextAuth configuration (Google + Credentials)
├── auth.config.ts               # NextAuth config chi tiết
├── middleware.ts                # Next.js middleware
├── package.json                  # Dependencies & scripts
├── next.config.ts               # Next.js config
└── tsconfig.json                # TypeScript config

Database Models (Prisma):
--------------------------
- User: Học viên (id, name, email, phone, role, referrerId)
- Account: Tài khoản OAuth (Google, etc)
- Session: Phiên đăng nhập
- Course: Khóa học (id_khoa, name_lop, phi_coc, pin, mo_ta_ngan, etc)
- Lesson: Bài học (title, videoUrl, content, order, isDailyChallenge)
- Enrollment: Đăng ký khóa học (status, startedAt, resetAt, lastLessonId, challengeDays)
- LessonProgress: Tiến độ học tập (scores, totalScore, assignment, status, maxTime, duration)
- LessonComment: Bình luận bài học
- Message: Tin nhắn chào mừng
- SystemConfig: Cấu hình hệ thống
- ReservedId: ID đã đặt trước

================================================================================
PACKAGE.JSON
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
    "date-fns": "^4.1.0",
    "dotenv": "^17.3.1",
    "fs": "^0.0.1-security",
    "lucide-react": "^0.570.0",
    "next": "16.1.6",
    "next-auth": "^5.0.0-beta.30",
    "prisma": "5.22.0",
    "react": "19.2.3",
    "react-day-picker": "^9.14.0",
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
DATABASE SCHEMA (prisma/schema.prisma)
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
  resetAt      DateTime?
  lastLessonId String?
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
  @@index([status])
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

model Message {
  id        Int      @id @default(autoincrement())
  content   String
  detail    String
  imageUrl  String?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
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
AUTH CONFIG (auth.ts)
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
  0%, 100% {
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
import MessageCard from "@/components/home/MessageCard";
import prisma from "@/lib/prisma";
import { getRandomMessage } from "./actions/message-actions";

export default async function Home() {
  const session = await auth();

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
            status: { not: 'RESET' }
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
      <Header session={session} userImage={userImage} />
      <div className="pt-16">
        <MessageCard message={message} session={session} userName={userName || ''} userId={userId ? String(userId) : ''} />
      </div>
      <section id="khoa-hoc" className="container mx-auto px-4 pb-24">
        {session?.user ? (
          <>
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
        select: {
            id: true,
            status: true,
            startedAt: true,
            resetAt: true,
            lastLessonId: true,
            createdAt: true,
            course: {
                include: {
                    lessons: {
                        orderBy: { order: 'asc' }
                    }
                }
            },
            lessonProgress: {
                where: {
                    status: { not: 'RESET' }
                },
                select: {
                    lessonId: true,
                    status: true,
                    scores: true,
                    totalScore: true,
                    assignment: true,
                    maxTime: true,
                    duration: true,
                    submittedAt: true,
                    updatedAt: true,
                    createdAt: true
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
FILE: app/actions/course-actions.ts (CHỨC NĂNG CHÍNH)
================================================================================

Các chức năng chính trong course-actions.ts:

1. getEnrollmentStatus(courseId: number)
   - Lấy trạng thái đăng ký khóa học

2. enrollInCourseAction(courseId: number)
   - Đăng ký khóa học (miễn phí → ACTIVE, có phí → PENDING)

3. confirmStartDateAction(courseId: number, startDate: Date)
   - Xác nhận ngày bắt đầu lộ trình học
   - Đánh dấu tất cả progress hiện tại thành RESET
   - Cập nhật startedAt và resetAt

4. updateLastLessonAction(enrollmentId: number, lessonId: string)
   - Lưu bài học cuối đang học (để quay lại đúng bài)

5. setChallengeDurationAction(courseId: number, days: number)
   - Đặt số ngày cho challenge

6. getEnrollmentWithProgress(courseId: number)
   - Lấy enrollment kèm tiến độ

7. saveVideoProgressAction({ enrollmentId, lessonId, maxTime, duration })
   - Lưu tiến độ video (tự động tính điểm video)
   - Chỉ lưu vào progress chưa bị RESET

8. submitAssignmentAction({ enrollmentId, lessonId, reflection, links, supports })
   - Nộp bài tập hoàn chỉnh
   - Tính điểm: Video + Reflection + Links + Support + Timing
   - Kiểm tra link trùng lặp
   - Auto-complete nếu điểm ≥ 5

9. saveAssignmentDraftAction({ enrollmentId, lessonId, reflection, links, supports })
   - Lưu nháp bài tập
   - Kiểm tra deadline, không cho cập nhật điểm nếu đã trễ hạn

================================================================================
FILE: components/layout/Header.tsx
================================================================================

- Fixed header với logo, navigation menu
- User dropdown với tên, email, avatar
- Menu items: Trang chủ, Khóa học, Giới thiệu
- Responsive: Hamburger menu cho mobile
- Link đến /account-settings

================================================================================
FILE: components/course/CourseCard.tsx
================================================================================

- Hiển thị thông tin khóa học (ảnh bìa, tên, mô tả, trạng thái)
- Badge: Miễn phí / Phí cam kết
- Badge: Đã kích hoạt + ngày bắt đầu
- Nút hành động:
  - Chưa đăng nhập → Alert chuyển login
  - Đã active → Vào học tiếp (hiển thị tiến độ)
  - Miễn phí → Kích hoạt ngay
  - Có phí → Hiển thị modal thanh toán
- Dark mode support

================================================================================
FILE: components/course/CoursePlayer.tsx (TRÌNH PHÁT CHÍNH)
================================================================================

- Header với tên khóa, tiến độ %
- Desktop: Sidebar (trái) + Video + AssignmentForm (phải)
- Mobile: Tab bar (Danh sách / Nội dung / Ghi nhận)
- VideoPlayer: YouTube player với tracking thời gian xem
- AssignmentForm: Form nộp bài 5 phần
- ChatSection: Bình luận bài học
- StartDateModal: Chọn ngày bắt đầu (nếu chưa có)
- Tính năng reset lộ trình học
- Auto-save video progress khi chuyển tab/bài
- Lưu lastLessonId để quay lại đúng bài

================================================================================
FILE: components/course/AssignmentForm.tsx (FORM NỘP BÀI)
================================================================================

5 PHẦN CHẤM ĐIỂM (Thang 10 điểm):

1. Mở TRÍ = Học theo Video (Max 2đ)
   - Xem >50% → +1đ, Xem hết → +2đ
   - Không có video YouTube → +2đ mặc định

2. Bồi NHÂN = Bài học Tâm đắc Ngộ (Max 2đ)
   - Có chia sẻ → +1đ
   - Dài hơn 50 ký tự → +1đ

3. Hành LỄ = Link thực hành (Max 3đ)
   - Mỗi link video → +1đ (max 3đ)

4. Trọng NGHĨA = Hỗ trợ đồng đội (Max 2đ)
   - Giúp người → +1đ
   - Giúp người giúp người → +1đ

5. Giữ TÍN = Làm đúng hạn (1đ)
   - Nộp trước 23:59 → +1đ
   - Nộp muộn → -1đ

TÍNH NĂNG:
- Auto-save draft khi chuyển tab/rời trang
- Realtime tính điểm
- Modal hiển thị quy tắc chấm điểm
- Deadline tính theo: startedAt + (lesson.order - 1) ngày

================================================================================
FILE: components/course/LessonSidebar.tsx
================================================================================

- Danh sách bài học với trạng thái (đã hoàn/đang học/khóa)
- Hiển thị điểm số mỗi bài
- Ngày bắt đầu lộ trình + nút đặt lại
- Chỉ hiển thị progress chưa bị RESET
- Desktop: Fixed sidebar 288px

================================================================================
FILE: components/course/VideoPlayer.tsx
================================================================================

- YouTube Player tích hợp
- Tracking thời gian xem (current time, duration)
- Tự động save progress khi:
  - Rời khỏi trang (beforeunload, pagehide)
  - Chuyển bài học
- Resume từ vị trí đã xem dở (initialMaxTime)
- Support cả Google Docs embed

================================================================================
FILE: components/course/ChatSection.tsx
================================================================================

- Hiển thị danh sách bình luận theo bài học
- Cache comments theo lessonId (tránh reload)
- Form gửi bình luận mới
- Hiển thị avatar, tên, thời gian

================================================================================
FILE: components/course/PaymentModal.tsx
================================================================================

- Modal thanh toán QR cho khóa học có phí
- Hiển thị thông tin chuyển khoản (STK, ngân hàng, nội dung)
- Link ảnh QR code

================================================================================
FILE: components/course/StartDateModal.tsx
================================================================================

- Modal chọn ngày bắt đầu lộ trình học
- Sử dụng DayPicker từ react-day-picker
- Giới hạn chọn ngày: hôm nay đến +90 ngày
- Hiển thị deadline dự kiến (startedAt + 60 ngày)

================================================================================
HẾT PHIÊN BẢN 1
================================================================================
