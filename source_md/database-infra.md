This file is a merged representation of a subset of the codebase, containing specifically included files, combined into a single document by Repomix.
The content has been processed where comments have been removed, empty lines have been removed.

# File Summary

## Purpose
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: prisma/schema.prisma, prisma/seed.ts, types/**/*
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Code comments have been removed from supported file types
- Empty lines have been removed from all files
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
prisma/schema.prisma
prisma/seed.ts
types/next-auth.d.ts
```

# Files

## File: prisma/seed.ts
```typescript
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
```

## File: types/next-auth.d.ts
```typescript
import NextAuth, { DefaultSession } from "next-auth"
import { Role } from "@prisma/client"
import { AdapterUser } from "next-auth/adapters"
declare module "next-auth" {
    interface Session {
        user: {
            id: string
            role: Role
        } & DefaultSession["user"]
    }
    interface User {
        id?: string
        role: Role
    }
}
declare module "next-auth/adapters" {
    interface AdapterUser {
        role: Role
    }
}
declare module "next-auth/jwt" {
    interface JWT {
        id: string
        role: Role
    }
}
```

## File: prisma/schema.prisma
```prisma
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
  lessonComments LessonComment[] @relation("UserToLessonComment")
  posts         Post[]          @relation("UserToPost")
  postComments  PostComment[]   @relation("UserToPostComment")
  referrer      User?        @relation("ReferrerToReferee", fields: [referrerId], references: [id])
  referrals     User[]       @relation("ReferrerToReferee")
  
  // Zero 2 Hero Data
  goal          String?      // Mục tiêu học tập
  surveyResults Json?        // Kết quả khảo sát đầu vào
  customPath    Json?        // Lộ trình cá nhân hóa (danh sách ID khóa học)

  @@index([email])
  @@index([phone])
  @@index([referrerId])
}

model Post {
  id        String        @id @default(cuid())
  title     String
  content   String        @db.Text
  image     String?
  published Boolean       @default(true)
  pin       Boolean       @default(false)
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt
  authorId  Int
  author    User          @relation("UserToPost", fields: [authorId], references: [id], onDelete: Cascade)
  comments  PostComment[]

  @@index([authorId])
}

model PostComment {
  id        Int      @id @default(autoincrement())
  postId    String
  userId    Int
  content   String   @db.Text
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  user      User     @relation("UserToPostComment", fields: [userId], references: [id], onDelete: Cascade)

  @@index([postId])
  @@index([userId])
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

model Survey {
  id          Int      @id @default(autoincrement())
  name        String
  description String?
  flow        Json     // Lưu trữ nodes và edges của React Flow
  isActive    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
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
  payment      Payment?

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
  user      User     @relation("UserToLessonComment", fields: [userId], references: [id], onDelete: Cascade)
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

enum PaymentStatus {
  PENDING
  VERIFIED
  REJECTED
  CANCELLED
}

model Payment {
  id              Int            @id @default(autoincrement())
  enrollmentId    Int            @unique
  amount          Int
  bankName        String?
  accountNumber   String?
  transferTime    DateTime?
  content         String?
  phone           String?
  courseCode      String?
  proofImage      String?
  status          PaymentStatus  @default(PENDING)
  verifiedAt      DateTime?
  verifyMethod    String?
  note            String?
  transferContent String?
  qrCodeUrl       String?
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  enrollment      Enrollment     @relation(fields: [enrollmentId], references: [id], onDelete: Cascade)
}
```
