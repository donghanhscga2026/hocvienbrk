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
- Only files matching these patterns are included: app/actions/**/*, app/api/**/*
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Code comments have been removed from supported file types
- Empty lines have been removed from all files
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
app/actions/account-actions.ts
app/actions/admin-actions.ts
app/actions/auth-actions.ts
app/actions/comment-actions.ts
app/actions/course-actions.ts
app/actions/message-actions.ts
app/actions/payment-actions.ts
app/actions/post-actions.ts
app/actions/roadmap-actions.ts
app/actions/survey-actions.ts
app/api/auth/[...nextauth]/route.ts
app/api/courses/[id]/route.ts
app/api/cron/gmail-watch/route.ts
app/api/docs/route.ts
app/api/upload/payment/route.ts
app/api/webhooks/gmail/route.ts
```

# Files

## File: app/actions/account-actions.ts
```typescript
'use server'
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
export async function getUserWithAccounts() {
    const session = await auth()
    if (!session?.user?.id) return null
    const userId = parseInt(session.user.id as string)
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            accounts: {
                select: {
                    provider: true,
                    providerAccountId: true,
                }
            }
        }
    })
    return user
}
export async function updateUserProfile(data: {
    name?: string
    phone?: string
    image?: string
}) {
    const session = await auth()
    if (!session?.user?.id) return { success: false, message: "Unauthorized" }
    const userId = parseInt(session.user.id as string)
    try {
        await prisma.user.update({
            where: { id: userId },
            data: {
                name: data.name,
                phone: data.phone,
                image: data.image,
            }
        })
        revalidatePath('/account-settings')
        return { success: true, message: "Cập nhật thành công" }
    } catch (error) {
        console.error("Update profile error:", error)
        return { success: false, message: "Cập nhật thất bại" }
    }
}
export async function changePassword(currentPassword: string, newPassword: string) {
    const session = await auth()
    if (!session?.user?.id) return { success: false, message: "Unauthorized" }
    const userId = parseInt(session.user.id as string)
    const bcrypt = await import('bcryptjs')
    const user = await prisma.user.findUnique({
        where: { id: userId }
    })
    if (!user?.password) {
        return { success: false, message: "Tài khoản này không sử dụng mật khẩu" }
    }
    const passwordsMatch = await bcrypt.compare(currentPassword, user.password)
    if (!passwordsMatch) {
        return { success: false, message: "Mật khẩu hiện tại không đúng" }
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword }
    })
    return { success: true, message: "Đổi mật khẩu thành công" }
}
```

## File: app/api/auth/[...nextauth]/route.ts
```typescript
import { handlers } from "@/auth"
export const { GET, POST } = handlers
```

## File: app/actions/comment-actions.ts
```typescript
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
    return comments.map((comment: any) => {
        let avatar = comment.user.image
        if (!avatar) {
            const googleAccount = comment.user.accounts.find((a: any) => a.provider === 'google')
            if (googleAccount) {
                avatar = `https://www.googleapis.com/plus/v1/people/${googleAccount.providerAccountId}?picture`
            }
        }
        if (!avatar) {
            const facebookAccount = comment.user.accounts.find((a: any) => a.provider === 'facebook')
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
            const googleAccount = comment.user.accounts.find((a: any) => a.provider === 'google')
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
```

## File: app/actions/payment-actions.ts
```typescript
'use server'
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
export async function getPaymentByEnrollmentId(enrollmentId: number) {
  try {
    const payment = await prisma.payment.findUnique({
      where: { enrollmentId }
    })
    return { success: true, payment }
  } catch (error: any) {
    console.error("Get Payment Error:", error)
    return { success: false, error: error.message }
  }
}
export async function createPaymentForEnrollment(enrollmentId: number, courseFee: number) {
  try {
    const existingPayment = await prisma.payment.findUnique({
      where: { enrollmentId }
    })
    if (existingPayment) {
      return { success: true, payment: existingPayment }
    }
    const payment = await prisma.payment.create({
      data: {
        enrollmentId,
        amount: courseFee,
        status: 'PENDING'
      }
    })
    return { success: true, payment }
  } catch (error: any) {
    console.error("Create Payment Error:", error)
    return { success: false, error: error.message }
  }
}
export async function updatePaymentProof(enrollmentId: number, proofImageUrl: string) {
  try {
    const payment = await prisma.payment.update({
      where: { enrollmentId },
      data: {
        proofImage: proofImageUrl,
        verifyMethod: 'MANUAL_UPLOAD'
      }
    })
    revalidatePath('/')
    revalidatePath('/courses')
    return { success: true, payment }
  } catch (error: any) {
    console.error("Update Payment Proof Error:", error)
    return { success: false, error: error.message }
  }
}
export async function verifyPaymentAction(
  enrollmentId: number,
  method: 'AUTO_EMAIL' | 'MANUAL_UPLOAD' | 'MANUAL_ADMIN',
  note?: string
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { course: true, payment: true }
    })
    if (!enrollment) {
      return { success: false, error: "Enrollment not found" }
    }
    if (enrollment.status === 'ACTIVE') {
      return { success: false, error: "Enrollment already active" }
    }
    const [payment, updatedEnrollment] = await prisma.$transaction([
      prisma.payment.update({
        where: { enrollmentId },
        data: {
          status: 'VERIFIED',
          verifiedAt: new Date(),
          verifyMethod: method,
          note: note || null
        }
      }),
      prisma.enrollment.update({
        where: { id: enrollmentId },
        data: { status: 'ACTIVE' }
      })
    ])
    revalidatePath('/')
    revalidatePath('/courses')
    revalidatePath(`/courses/${enrollment.course.id_khoa}/learn`)
    return {
      success: true,
      payment,
      enrollment: updatedEnrollment,
      message: `Đã kích hoạt khóa học "${enrollment.course.name_lop}" thành công!`
    }
  } catch (error: any) {
    console.error("Verify Payment Error:", error)
    return { success: false, error: error.message }
  }
}
export async function rejectPaymentAction(enrollmentId: number, reason: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { course: true }
    })
    if (!enrollment) {
      return { success: false, error: "Enrollment not found" }
    }
    const payment = await prisma.payment.update({
      where: { enrollmentId },
      data: {
        status: 'REJECTED',
        note: reason,
        verifyMethod: 'MANUAL_ADMIN'
      }
    })
    revalidatePath('/')
    revalidatePath('/courses')
    return { success: true, payment }
  } catch (error: any) {
    console.error("Reject Payment Error:", error)
    return { success: false, error: error.message }
  }
}
export async function getPendingPayments() {
  try {
    const payments = await prisma.payment.findMany({
      where: { status: 'PENDING' },
      include: {
        enrollment: {
          include: {
            user: {
              select: { id: true, name: true, email: true, phone: true }
            },
            course: {
              select: { id: true, id_khoa: true, name_lop: true, phi_coc: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    return { success: true, payments }
  } catch (error: any) {
    console.error("Get Pending Payments Error:", error)
    return { success: false, error: error.message }
  }
}
export async function getAllPayments() {
  try {
    const payments = await prisma.payment.findMany({
      include: {
        enrollment: {
          include: {
            user: {
              select: { id: true, name: true, email: true, phone: true }
            },
            course: {
              select: { id: true, id_khoa: true, name_lop: true, phi_coc: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    return { success: true, payments }
  } catch (error: any) {
    console.error("Get All Payments Error:", error)
    return { success: false, error: error.message }
  }
}
export async function autoVerifyPayment(enrollmentId: number, transferData: {
  amount: number;
  phone: string | null;
  courseCode: string | null;
  bankName: string | null;
  accountNumber: string | null;
  transferTime: Date | null;
  content: string;
}) {
  try {
    const payment = await prisma.payment.update({
      where: { enrollmentId },
      data: {
        amount: transferData.amount,
        phone: transferData.phone,
        courseCode: transferData.courseCode,
        bankName: transferData.bankName,
        accountNumber: transferData.accountNumber,
        transferTime: transferData.transferTime,
        content: transferData.content,
        status: 'VERIFIED',
        verifiedAt: new Date(),
        verifyMethod: 'AUTO_EMAIL'
      }
    })
    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { status: 'ACTIVE' }
    })
    return { success: true, payment }
  } catch (error: any) {
    console.error("Auto Verify Payment Error:", error)
    return { success: false, error: error.message }
  }
}
```

## File: app/actions/post-actions.ts
```typescript
'use server'
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { Role } from "@prisma/client"
export async function getPostsAction() {
    try {
        const posts = await prisma.post.findMany({
            where: { published: true },
            include: {
                author: { select: { name: true, image: true } },
                _count: { select: { comments: true } }
            },
            orderBy: [{ pin: 'desc' }, { createdAt: 'desc' }]
        })
        return { success: true, posts }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
export async function createPostAction(data: { title: string, content: string, image?: string }) {
    const session = await auth()
    if (session?.user?.role !== Role.ADMIN) {
        return { success: false, error: "Chỉ quản trị viên mới có quyền đăng bài." }
    }
    try {
        const post = await prisma.post.create({
            data: {
                title: data.title,
                content: data.content,
                image: data.image,
                authorId: parseInt(session.user.id!)
            }
        })
        revalidatePath('/')
        return { success: true, post }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
export async function getPostDetailAction(postId: string) {
    try {
        const post = await prisma.post.findUnique({
            where: { id: postId },
            include: {
                author: { select: { name: true, image: true } },
                comments: {
                    include: {
                        user: { select: { name: true, image: true } }
                    },
                    orderBy: { createdAt: 'asc' }
                }
            }
        })
        return { success: true, post }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
export async function commentOnPostAction(postId: string, content: string) {
    const session = await auth()
    if (!session?.user?.id) {
        return { success: false, error: "Vui lòng đăng nhập để bình luận." }
    }
    try {
        const comment = await prisma.postComment.create({
            data: {
                postId,
                userId: parseInt(session.user.id),
                content
            }
        })
        revalidatePath('/')
        return { success: true, comment }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
```

## File: app/api/courses/[id]/route.ts
```typescript
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { Role } from '@prisma/client';
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user?.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const course = await prisma.course.findUnique({
      where: { id: parseInt(id) },
      include: {
        lessons: {
          orderBy: { order: 'asc' }
        }
      }
    });
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }
    return NextResponse.json(course);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

## File: app/api/docs/route.ts
```typescript
import { NextRequest } from 'next/server'
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) {
    return new Response('Missing URL', { status: 400 })
  }
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
      cache: 'no-store',
    })
    if (!res.ok) {
      return new Response('Failed to fetch document', { status: 500 })
    }
    const html = await res.text()
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  } catch (err) {
    return new Response('Server error', { status: 500 })
  }
}
```

## File: app/api/upload/payment/route.ts
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      )
    }
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(7)}`
    const ext = file.name.split('.').pop() || 'jpg'
    const filename = `payment-${uniqueSuffix}.${ext}`
    const filepath = path.join(uploadDir, filename)
    await writeFile(filepath, buffer)
    const url = `/uploads/${filename}`
    return NextResponse.json({ url, filename })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    )
  }
}
```

## File: app/actions/admin-actions.ts
```typescript
'use server'
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { Role } from "@prisma/client"
import { revalidatePath } from "next/cache"
async function checkAdmin() {
    const session = await auth()
    if (session?.user?.role !== Role.ADMIN) {
        throw new Error("Unauthorized: You must be an Admin.")
    }
}
export async function addReservedIdAction(prevState: any, formData: FormData) {
    await checkAdmin()
    const id = parseInt(formData.get("id") as string)
    const note = formData.get("note") as string || "Admin Added"
    if (isNaN(id)) return { message: "Error: ID phải là số." }
    try {
        const existing = await prisma.reservedId.findUnique({ where: { id } })
        if (existing) return { message: `Error: ID ${id} đã có trong danh sách.` }
        await prisma.reservedId.create({
            data: { id, note }
        })
        revalidatePath("/admin/reserved-ids")
        return { message: `Success: Đã thêm ID ${id} vào danh sách dự trữ.` }
    } catch (_e) {
        console.error(_e)
        return { message: "Error: Lỗi Server khi thêm ID." }
    }
}
export async function deleteReservedIdAction(id: number) {
    await checkAdmin()
    try {
        await prisma.reservedId.delete({ where: { id } })
        revalidatePath("/admin/reserved-ids")
        return { message: `Success: Đã xóa ID ${id}.` }
    } catch (_e) {
        return { message: "Error: Lỗi khi xóa ID." }
    }
}
export async function changeUserIdAction(prevState: any, formData: FormData) {
    await checkAdmin()
    const currentId = parseInt(formData.get("currentId") as string)
    const newId = parseInt(formData.get("newId") as string)
    if (isNaN(currentId) || isNaN(newId)) {
        return { message: "Error: Vui lòng nhập đúng định dạng số ID." }
    }
    try {
        const user = await prisma.user.findUnique({ where: { id: currentId } })
        if (!user) return { message: `Error: Không tìm thấy User với ID ${currentId}` }
        const targetUser = await prisma.user.findUnique({ where: { id: newId } })
        if (targetUser) return { message: `Error: ID ${newId} đã có người sử dụng: ${targetUser.email}` }
        await prisma.$executeRawUnsafe(`UPDATE "User" SET id = ${newId} WHERE id = ${currentId}`)
        await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"User"', 'id'), coalesce(max(id)+1, 1), false) FROM "User";`)
        revalidatePath("/admin/reserved-ids")
        return { message: `Success: Thành công! Đã đổi ${user.email} (ID: ${currentId}) -> ID Mới: ${newId}` }
    } catch (e) {
        console.error(e)
        return { message: "Error: Lỗi hệ thống khi đổi ID." }
    }
}
export async function getReservedIds() {
    await checkAdmin()
    return await prisma.reservedId.findMany({
        orderBy: { id: 'asc' }
    })
}
export async function getStudentsAction(query?: string, role?: Role | 'ALL' | 'COURSE_86_DAYS') {
    await checkAdmin()
    try {
        let where: any = {};
        if (role === 'COURSE_86_DAYS') {
            where.enrollments = {
                some: { courseId: 1 }
            };
        } else if (role && role !== 'ALL') {
            where.role = role;
        }
        if (query) {
            const trimmedQuery = query.trim();
            if (trimmedQuery.startsWith('#')) {
                const id = parseInt(trimmedQuery.substring(1));
                if (!isNaN(id)) {
                    where.id = id;
                } else {
                    return { success: true, students: [] };
                }
            }
            else if (/^\d+$/.test(trimmedQuery)) {
                const id = parseInt(trimmedQuery);
                const searchFields = [
                    { id: id },
                    { name: { contains: trimmedQuery, mode: 'insensitive' } },
                    { email: { contains: trimmedQuery, mode: 'insensitive' } },
                ];
                if (trimmedQuery.length >= 6) {
                    searchFields.push({ phone: { contains: trimmedQuery, mode: 'insensitive' } } as any);
                }
                if (where.role) {
                    where = {
                        AND: [
                            { role: where.role },
                            { OR: searchFields }
                        ]
                    };
                } else {
                    where.OR = searchFields;
                }
            }
            else {
                const searchFields = [
                    { name: { contains: trimmedQuery, mode: 'insensitive' } },
                    { email: { contains: trimmedQuery, mode: 'insensitive' } },
                    { phone: { contains: trimmedQuery, mode: 'insensitive' } },
                ];
                if (where.role) {
                    where = {
                        AND: [
                            { role: where.role },
                            { OR: searchFields }
                        ]
                    };
                } else {
                    where.OR = searchFields;
                }
            }
        }
        const students = await prisma.user.findMany({
            where,
            include: {
                enrollments: {
                    include: {
                        course: { select: { name_lop: true } },
                        _count: {
                            select: { lessonProgress: { where: { status: 'COMPLETED' } } }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })
        return { success: true, students }
    } catch (error: any) {
        console.error("Get Students Error:", error)
        return { success: false, error: error.message }
    }
}
export async function getStudentDetailsAction(userId: number) {
    await checkAdmin()
    try {
        const student = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                enrollments: {
                    include: {
                        course: {
                            include: {
                                lessons: {
                                    orderBy: { order: 'asc' }
                                }
                            }
                        },
                        lessonProgress: {
                            include: {
                                lesson: { select: { title: true, order: true } }
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                }
            }
        })
        if (!student) return { success: false, error: "Không tìm thấy học viên." }
        return { success: true, student }
    } catch (error: any) {
        console.error("Get Student Details Error:", error)
        return { success: false, error: error.message }
    }
}
export async function getAdminCoursesAction() {
    await checkAdmin()
    try {
        const courses = await prisma.course.findMany({
            include: {
                _count: {
                    select: {
                        lessons: true,
                        enrollments: true
                    }
                }
            },
            orderBy: { id: 'asc' }
        })
        return { success: true, courses }
    } catch (error: any) {
        console.error("Get Admin Courses Error:", error)
        return { success: false, error: error.message }
    }
}
export async function updateCourseAction(courseId: number, data: {
    name_lop?: string,
    phi_coc?: number,
    id_khoa?: string,
    noidung_email?: string | null,
    stk?: string | null,
    name_stk?: string | null,
    bank_stk?: string | null
}) {
    await checkAdmin()
    try {
        const updatedCourse = await prisma.course.update({
            where: { id: courseId },
            data
        })
        revalidatePath('/admin/courses')
        revalidatePath('/')
        return { success: true, course: updatedCourse }
    } catch (error: any) {
        console.error("Update Course Error:", error)
        return { success: false, error: error.message }
    }
}
export async function updateLessonAction(lessonId: string, data: {
    title?: string,
    content?: string | null,
    videoUrl?: string | null,
    order?: number
}) {
    await checkAdmin()
    try {
        const updatedLesson = await prisma.lesson.update({
            where: { id: lessonId },
            data
        })
        const lesson = await prisma.lesson.findUnique({
            where: { id: lessonId },
            select: { course: { select: { id_khoa: true } } }
        })
        if (lesson?.course?.id_khoa) {
            revalidatePath(`/courses/${lesson.course.id_khoa}/learn`)
        }
        return { success: true, lesson: updatedLesson }
    } catch (error: any) {
        console.error("Update Lesson Error:", error)
        return { success: false, error: error.message }
    }
}
```

## File: app/actions/auth-actions.ts
```typescript
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
        const { sendTelegram, sendWelcomeEmail } = await import("@/lib/notifications")
        const newId = await getNextAvailableId()
        const user = await prisma.user.create({
            data: {
                id: newId,
                name,
                email,
                phone,
                password: hashedPassword,
                role: Role.STUDENT,
            },
        })
        await sendWelcomeEmail(email, name, user.id)
        const msgAdmin = `🆕 <b>HỌC VIÊN MỚI ĐĂNG KÝ</b>\n\n` +
                         `🆔 Mã số: <b>#${user.id}</b>\n` +
                         `👤 Họ tên: <b>${user.name}</b>\n` +
                         `📧 Email: ${user.email}\n` +
                         `📞 SĐT: ${user.phone}\n` +
                         `📅 Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`;
        await sendTelegram(msgAdmin, 'REGISTER');
    } catch (error) {
        console.error("Failed to create user:", error)
        return {
            message: "Database Error: Failed to create user. Please try again.",
        }
    }
    redirect('/login')
}
```

## File: app/actions/message-actions.ts
```typescript
'use server'
import prisma from "@/lib/prisma"
export async function getRandomMessage() {
    const count = await prisma.message.count({
        where: { isActive: true }
    })
    if (count === 0) return null
    const random = Math.floor(Math.random() * count)
    return await prisma.message.findFirst({
        where: { isActive: true },
        skip: random
    })
}
export async function getAllMessages() {
    return await prisma.message.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' }
    })
}
```

## File: app/actions/roadmap-actions.ts
```typescript
'use server'
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
export async function getAllSurveys() {
    try {
        return await prisma.survey.findMany({
            orderBy: { createdAt: 'desc' }
        })
    } catch (error) {
        console.error('Error fetching surveys:', error)
        return []
    }
}
export async function getActiveSurvey() {
    try {
        const active = await prisma.survey.findFirst({
            where: { isActive: true }
        })
        return active ? active.flow : null
    } catch (error) {
        console.error('Error fetching active survey:', error)
        return null
    }
}
export async function getSurveyById(id: number) {
    try {
        return await prisma.survey.findUnique({
            where: { id }
        })
    } catch (error) {
        return null
    }
}
export async function createSurvey(name: string, description: string = '') {
    try {
        const newSurvey = await prisma.survey.create({
            data: {
                name,
                description,
                flow: { nodes: [], edges: [] }
            }
        })
        revalidatePath('/admin/roadmap')
        return { success: true, survey: newSurvey }
    } catch (error) {
        return { success: false, error: 'Lỗi khi tạo mới.' }
    }
}
export async function saveSurveyFlow(id: number, flow: any) {
    try {
        await prisma.survey.update({
            where: { id },
            data: { flow }
        })
        revalidatePath('/admin/roadmap')
        return { success: true }
    } catch (error) {
        return { success: false, error: 'Lỗi khi lưu sơ đồ.' }
    }
}
export async function activateSurvey(id: number) {
    try {
        await prisma.$transaction([
            prisma.survey.updateMany({
                where: { isActive: true },
                data: { isActive: false }
            }),
            prisma.survey.update({
                where: { id },
                data: { isActive: true }
            })
        ])
        revalidatePath('/admin/roadmap')
        revalidatePath('/')
        return { success: true }
    } catch (error) {
        return { success: false, error: 'Lỗi khi kích hoạt.' }
    }
}
export async function deleteSurvey(id: number) {
    try {
        await prisma.survey.delete({ where: { id } })
        revalidatePath('/admin/roadmap')
        return { success: true }
    } catch (error) {
        return { success: false, error: 'Không thể xóa bài này.' }
    }
}
export async function getCoursesForBuilder() {
    try {
        return await prisma.course.findMany({
            where: { status: true },
            select: { id: true, id_khoa: true, name_lop: true },
            orderBy: { id: 'asc' }
        })
    } catch (error) {
        return []
    }
}
```

## File: app/api/webhooks/gmail/route.ts
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { processPaymentEmails } from '@/lib/auto-verify';
export async function POST(req: NextRequest) {
  try {
    console.log('📩 Nhận được thông báo Push từ Gmail!');
    const result = await processPaymentEmails();
    console.log(`✅ Kết quả Webhook: Đã quét ${result?.processed} email, khớp ${result?.matched} giao dịch.`);
    return NextResponse.json({ status: 'ok', ...result }, { status: 200 });
  } catch (error: any) {
    console.error('⚠️ Webhook Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

## File: app/api/cron/gmail-watch/route.ts
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { processPaymentEmails } from '@/lib/auto-verify';
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  console.log('🚀 Bắt đầu chạy Cron Job quét email...');
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error('❌ Lỗi: Unauthorized - Sai CRON_SECRET');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const requiredEnv = [
    'GMAIL_CLIENT_ID',
    'GMAIL_CLIENT_SECRET',
    'GMAIL_REFRESH_TOKEN',
    'GCP_PROJECT_ID'
  ];
  const missingEnv = requiredEnv.filter(key => !process.env[key]);
  if (missingEnv.length > 0) {
    const errorMsg = `Thiếu biến môi trường: ${missingEnv.join(', ')}`;
    console.error(`❌ ${errorMsg}`);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
  try {
    const oAuth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      'http://localhost'
    );
    oAuth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
    console.log(`📡 Đang gọi Gmail Watch cho dự án: ${process.env.GCP_PROJECT_ID}`);
    const watchResponse = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        topicName: `projects/${process.env.GCP_PROJECT_ID}/topics/gmail-notifications`,
        labelIds: ['INBOX'],
      },
    });
    console.log('📧 Đang tiến hành quét email giao dịch...');
    const scanResult = await processPaymentEmails();
    console.log('✅ Cron Job hoàn thành thành công!');
    return NextResponse.json({
      success: true,
      watch: watchResponse.data,
      scan: scanResult
    });
  } catch (error: any) {
    console.error('❌ LỖI CRON JOB CHI TIẾT:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data || 'No response data'
    });
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.response?.data || undefined
    }, { status: 500 });
  }
}
```

## File: app/actions/survey-actions.ts
```typescript
'use server'
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { generatePathFromAnswers, surveyQuestions } from "@/lib/survey-data"
import { getActiveSurvey } from "./roadmap-actions"
function resolvePathFromFlow(flow: any, answers: Record<string, string>): { customPath: number[], goalName: string } {
    const { nodes, edges } = flow
    const collectedCourseIds = new Set<number>()
    let lastPointName = ''
    if (!Array.isArray(nodes) || !Array.isArray(edges)) return { customPath: [], goalName: '' }
    const targetIds = new Set(edges.map((e: any) => e.target))
    let startNode = nodes.find((n: any) => n.type === 'questionNode' && !targetIds.has(n.id))
    if (!startNode) startNode = nodes.find((n: any) => n.type === 'questionNode')
    if (!startNode) return { customPath: [], goalName: '' }
    const traverse = (currentNodeId: string) => {
        const node = nodes.find((n: any) => n.id === currentNodeId)
        if (!node) return
        if (node.type === 'questionNode' || node.type === 'finishNode') {
            lastPointName = node.data?.label || lastPointName
        }
        const outEdges = edges.filter((e: any) => e.source === currentNodeId)
        for (const edge of outEdges) {
            const targetNode = nodes.find((n: any) => n.id === edge.target)
            if (!targetNode) continue
            if (targetNode.type === 'finishNode') {
                lastPointName = targetNode.data?.label || lastPointName
                continue
            }
            if (targetNode.type === 'optionNode') {
                const optionLabel = targetNode.data?.label
                const optionId = targetNode.id
                const userAnswer = answers[currentNodeId]
                if (userAnswer === optionLabel || userAnswer === optionId || userAnswer === 'Xác nhận' || userAnswer === 'Tiếp tục') {
                    traverse(targetNode.id)
                }
            }
            else if (targetNode.type === 'courseNode') {
                if (targetNode.data?.courseId) collectedCourseIds.add(Number(targetNode.data.courseId))
                traverse(targetNode.id)
            }
            else if (targetNode.type === 'adviceNode' || targetNode.type === 'questionNode') {
                traverse(targetNode.id)
            }
        }
    }
    traverse(startNode.id)
    return {
        customPath: Array.from(collectedCourseIds),
        goalName: lastPointName
    }
}
export async function saveSurveyResultAction(answers: Record<string, string>) {
    const session = await auth()
    if (!session?.user?.id) {
        return { success: false, error: "Vui lòng đăng nhập để lưu lộ trình." }
    }
    try {
        const userId = parseInt(session.user.id)
        const flowData = await getActiveSurvey()
        const flow = flowData as any
        let customPath: number[] = []
        let goalTitle = ''
        if (flow && flow.nodes && Array.isArray(flow.nodes) && flow.nodes.length > 0) {
            const result = resolvePathFromFlow(flow, answers)
            customPath = result.customPath
            goalTitle = result.goalName
        } else {
            customPath = generatePathFromAnswers(answers)
            goalTitle = 'Hoàn thiện kỹ năng TikTok'
        }
        const config = answers['goal_config'] as any
        let finalGoal = goalTitle
        if (config && config.videoPerDay) {
            finalGoal = `${goalTitle} (Cam kết: ${config.videoPerDay} video/ngày trong ${config.days} ngày để đạt ${config.targetVal} follow)`
        }
        const surveyData = {
            current: {
                answers,
                customPath: customPath,
                goal: finalGoal,
                completedAt: new Date().toISOString()
            }
        };
        await prisma.user.update({
            where: { id: userId },
            data: {
                surveyResults: surveyData as any,
                customPath: customPath as any,
                goal: finalGoal
            }
        })
        revalidatePath('/')
        return { success: true, customPath, goal: finalGoal }
    } catch (error: any) {
        console.error("Lỗi Server Action:", error.message)
        return { success: false, error: "Hệ thống đang bận. Vui lòng thử lại sau." }
    }
}
export async function resetSurveyAction() {
    const session = await auth()
    if (!session?.user?.id) return { success: false }
    try {
        await prisma.user.update({
            where: { id: parseInt(session.user.id) },
            data: { customPath: null as any }
        })
        revalidatePath('/')
        return { success: true }
    } catch (error) {
        return { success: false }
    }
}
```

## File: app/actions/course-actions.ts
```typescript
'use server'
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { createPaymentQR } from "@/lib/vietqr"
export async function enrollInCourseAction(courseId: number) {
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Vui lòng đăng nhập để tiếp tục.")
        const userId = Number(session.user.id)
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            select: {
                phi_coc: true,
                id_khoa: true,
                name_lop: true,
                stk: true,
                name_stk: true,
                bank_stk: true,
                noidung_email: true
            }
        })
        if (!course) throw new Error("Khóa học không tồn tại.")
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, phone: true, email: true }
        })
        const vipEnrollment = await prisma.enrollment.findFirst({
            where: {
                userId,
                courseId: 1,
                status: 'ACTIVE'
            }
        })
        const effectivePhiCoc = vipEnrollment ? 0 : course.phi_coc
        const existing = await prisma.enrollment.findUnique({
            where: { userId_courseId: { userId, courseId } }
        })
        if (existing) return { success: true, status: existing.status }
        const isAutoActive = effectivePhiCoc === 0
        const newEnrollment = await prisma.enrollment.create({
            data: {
                userId,
                courseId,
                status: isAutoActive ? "ACTIVE" : "PENDING"
            }
        })
        const { sendTelegram, sendActivationEmail } = await import("@/lib/notifications")
        if (isAutoActive) {
            const msgAdmin = `🎁 <b>KÍCH HOẠT MIỄN PHÍ</b>\n\n` +
                             `👤 Học viên: <b>${user?.name}</b> (#${user?.id})\n` +
                             `🎓 Khóa học: <b>${course.name_lop} (${course.id_khoa})</b>\n` +
                             `📅 Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`;
            await sendTelegram(msgAdmin, 'ACTIVATE');
            if (user?.email) {
                await sendActivationEmail(user.email, user.name || '', user.id, course.name_lop || course.id_khoa, course.noidung_email);
            }
        }
        if (effectivePhiCoc > 0 && course.stk && course.name_stk) {
            let qrCodeUrl = null
            let transferContent = null
            // Tạo QR code nếu có đủ thông tin
            if (user?.phone && course.stk) {
                try {
                    const qrResult = await createPaymentQR({
                        phone: user.phone,
                        userId: userId,
                        courseId: courseId,
                        courseCode: course.id_khoa,
                        accountNo: course.stk,
                        accountName: course.name_stk,
                        acqId: course.bank_stk || 'SACOMBANK',
                        amount: effectivePhiCoc
                    })
                    qrCodeUrl = qrResult.qrCodeUrl
                    transferContent = qrResult.transferContent
                } catch (qrError) {
                    console.error("Failed to generate QR:", qrError)
                }
            }
            if (!transferContent) {
                const cleanPhone = user?.phone ? user.phone.replace(/\D/g, '').slice(-6) : ''
                transferContent = `SDT ${cleanPhone} HV ${userId} COC ${course.id_khoa}`.toUpperCase()
            }
            await prisma.payment.create({
                data: {
                    enrollmentId: newEnrollment.id,
                    amount: effectivePhiCoc,
                    status: 'PENDING',
                    transferContent: transferContent,
                    qrCodeUrl: qrCodeUrl,
                    bankName: course.bank_stk || 'Sacombank',
                    accountNumber: course.stk,
                    phone: user?.phone
                }
            })
        }
        revalidatePath('/')
        revalidatePath('/courses')
        return { success: true, status: newEnrollment.status }
    } catch (error: any) {
        console.error("Enroll Course Error:", error)
        throw new Error(error.message || "Không thể đăng ký khóa học.")
    }
}
export async function confirmStartDateAction(courseId: number, date: any) {
    const logId = `[RESET-COURSE-${courseId}-${Date.now()}]`
    try {
        const session = await auth()
        if (!session?.user?.id) return { success: false, message: "Unauthorized" }
        const startDate = new Date(date)
        if (isNaN(startDate.getTime())) return { success: false, message: "Ngày bắt đầu không hợp lệ." }
        const userId = Number(session.user.id)
        const now = new Date()
        const enrollment = await prisma.enrollment.findUnique({
            where: { userId_courseId: { userId, courseId } },
            select: { id: true }
        })
        if (!enrollment) throw new Error("Không tìm thấy thông tin đăng ký khóa học.")
        await prisma.$transaction([
            prisma.enrollment.update({
                where: { id: enrollment.id },
                data: { startedAt: startDate, resetAt: now, lastLessonId: null }
            }),
            prisma.lessonProgress.updateMany({
                where: { enrollmentId: enrollment.id, status: { not: 'RESET' } },
                data: { status: 'RESET' }
            })
        ])
        try {
            revalidatePath(`/courses`)
            revalidatePath(`/courses/${courseId}/learn`)
        } catch (e) {}
        return { success: true }
    } catch (error: any) {
        console.error(`${logId} LỖI KHI RESET LỘ TRÌNH:`, error)
        return { success: false, message: "Lỗi hệ thống khi đặt lại ngày bắt đầu." }
    }
}
export async function saveVideoProgressAction({
    enrollmentId, lessonId, maxTime, duration, lastIndex, playlistScores
}: {
    enrollmentId: number, lessonId: string, maxTime: number, duration: number,
    lastIndex?: number, playlistScores?: any
}) {
    try {
        const session = await auth()
        if (!session?.user?.id) return { success: false }
        let vidScore = 0
        if (playlistScores) {
            let totalMax = 0
            let totalDur = 0
            Object.values(playlistScores).forEach((p: any) => {
                totalMax += p.maxTime || 0
                totalDur += p.duration || 0
            })
            const percent = totalDur > 0 ? totalMax / totalDur : 0
            vidScore = percent >= 0.95 ? 2 : percent >= 0.5 ? 1 : 0
        } else {
            const percent = duration > 0 ? maxTime / duration : 0
            vidScore = percent >= 0.95 ? 2 : percent >= 0.5 ? 1 : 0
        }
        const existing = await prisma.lessonProgress.findUnique({
            where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
            select: { scores: true, status: true }
        })
        const existingScores = existing?.status === 'RESET' ? {} : (existing?.scores as any ?? {})
        const updatedScores = {
            ...existingScores,
            video: vidScore,
            lastVideoIndex: lastIndex ?? existingScores.lastVideoIndex ?? 0,
            playlist: playlistScores ?? existingScores.playlist ?? null
        }
        await prisma.lessonProgress.upsert({
            where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
            create: {
                enrollmentId, lessonId, maxTime, duration,
                scores: updatedScores as any,
                status: "IN_PROGRESS"
            },
            update: {
                maxTime, duration,
                scores: updatedScores as any,
                ...(existing?.status === 'RESET' ? { status: 'IN_PROGRESS' } : {})
            }
        })
        return { success: true, vidScore }
    } catch (error) {
        console.error("Save Video Progress Error:", error)
        return { success: false }
    }
}
export async function submitAssignmentAction({
    enrollmentId, lessonId, reflection, links, supports,
    isUpdate = false, lessonOrder, startedAt,
    existingVideoScore, existingTimingScore,
    clientTimeZone = 'Asia/Ho_Chi_Minh'
}: {
    enrollmentId: number, lessonId: string, reflection: string, links: string[], supports: boolean[],
    isUpdate?: boolean, lessonOrder?: number, startedAt?: any,
    existingVideoScore?: number, existingTimingScore?: number,
    clientTimeZone?: string
}) {
    const logId = `[SUBMIT-${lessonId}]`
    try {
        const session = await auth()
        if (!session?.user?.id) return { success: false, message: "Phiên đăng nhập hết hạn." }
        const now = new Date()
        let timingScore = 0
        if (startedAt && lessonOrder) {
            const startDate = new Date(startedAt)
            if (!isNaN(startDate.getTime())) {
                const nowStr = new Date().toLocaleString('en-US', { timeZone: clientTimeZone });
                const nowLocal = new Date(nowStr);
                const deadlineStr = new Date(startDate).toLocaleString('en-US', { timeZone: clientTimeZone });
                const deadlineLocal = new Date(deadlineStr);
                deadlineLocal.setDate(deadlineLocal.getDate() + (lessonOrder - 1));
                deadlineLocal.setHours(23, 59, 59, 999);
                const isCurrentlyOnTime = nowLocal.getTime() <= deadlineLocal.getTime();
                if (isUpdate) {
                    timingScore = isCurrentlyOnTime ? 1 : (existingTimingScore ?? -1);
                } else {
                    timingScore = isCurrentlyOnTime ? 1 : -1;
                }
                if (isUpdate && !isCurrentlyOnTime) {
                    const existingStatus = await prisma.lessonProgress.findUnique({
                        where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
                        select: { status: true }
                    })
                    if (existingStatus?.status === 'COMPLETED') {
                        return { success: false, message: "Bài học đã hết hạn cập nhật." }
                    }
                }
            }
        }
        const lesson = await prisma.lesson.findUnique({
            where: { id: lessonId },
            select: { videoUrl: true }
        })
        if (!lesson) return { success: false, message: "Không tìm thấy bài học." }
        const rawUrl = lesson.videoUrl ? String(lesson.videoUrl).trim() : ""
        const isYouTube = /youtu\.be\/|youtube\.com\/|v=/.test(rawUrl)
        let videoScore = 0
        if (rawUrl === "" || rawUrl.toLowerCase() === "null" || !isYouTube) {
            videoScore = 2
        } else {
            const currentProg = await prisma.lessonProgress.findUnique({
                where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
                select: { scores: true, maxTime: true, duration: true }
            })
            const scoresJson = (currentProg?.scores as any) || {}
            if (scoresJson.playlist) {
                let totalMax = 0
                let totalDur = 0
                Object.values(scoresJson.playlist).forEach((p: any) => {
                    totalMax += p.maxTime || 0
                    totalDur += p.duration || 0
                })
                const percent = totalDur > 0 ? totalMax / totalDur : 0
                videoScore = percent >= 0.95 ? 2 : percent >= 0.5 ? 1 : 0
            }
            else if (currentProg?.duration && currentProg.duration > 0) {
                const percent = currentProg.maxTime / currentProg.duration
                videoScore = percent >= 0.95 ? 2 : percent >= 0.5 ? 1 : 0
            }
            else {
                videoScore = existingVideoScore ?? 0
            }
        }
        const reflectionScore = reflection.trim().length >= 50 ? 2 : reflection.trim().length > 0 ? 1 : 0
        const linkScore = Math.min(links.filter(l => l && l.trim() !== "").length, 3)
        const supportScore = supports.filter(s => s === true).length
        const totalScore = Math.max(0, videoScore + reflectionScore + linkScore + supportScore + timingScore)
        console.log(`${logId} POINT: V:${videoScore} R:${reflectionScore} L:${linkScore} S:${supportScore} T:${timingScore} => TOTAL:${totalScore}`)
        // 4. Lưu Database
        const updatedProgress = await prisma.lessonProgress.upsert({
            where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
            create: {
                enrollmentId, lessonId,
                assignment: { reflection, links, supports } as any,
                scores: { video: videoScore, reflection: reflectionScore, link: linkScore, support: supportScore, timing: timingScore } as any,
                totalScore, status: totalScore >= 5 ? "COMPLETED" : "IN_PROGRESS", submittedAt: now
            },
            update: {
                assignment: { reflection, links, supports } as any,
                scores: { video: videoScore, reflection: reflectionScore, link: linkScore, support: supportScore, timing: timingScore } as any,
                totalScore, status: totalScore >= 5 ? "COMPLETED" : "IN_PROGRESS", submittedAt: now
            }
        })
        console.log(`🔍 Kiểm tra trạng thái bài học: ${updatedProgress.status}, Điểm: ${totalScore}`);
        if (updatedProgress.status === 'COMPLETED') {
            try {
                const { sendTelegram } = await import("@/lib/notifications")
                const enrollment = await prisma.enrollment.findUnique({
                    where: { id: enrollmentId },
                    include: {
                        user: { select: { name: true, id: true } },
                        course: { select: { name_lop: true } }
                    }
                })
                const lesson = await prisma.lesson.findUnique({
                    where: { id: lessonId },
                    select: { title: true }
                })
                const msgAdmin = `📚 <b>HOÀN THÀNH BÀI HỌC</b>\n\n` +
                                 `👤 Học viên: <b>${enrollment?.user?.name}</b> (#${enrollment?.user?.id})\n` +
                                 `🎓 Khóa học: ${enrollment?.course?.name_lop}\n` +
                                 `📖 Bài học: <b>${lesson?.title}</b>\n` +
                                 `🏆 Điểm số: <b>${totalScore}đ</b>\n` +
                                 `📅 Thời gian: ${now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`;
                console.log(`📡 Đang gửi thông báo Telegram LESSON đến ChatID: ${process.env.TELEGRAM_CHAT_ID_LESSON}`);
                await sendTelegram(msgAdmin, 'LESSON');
                console.log(`✅ Đã gửi thông báo Telegram LESSON thành công!`);
            } catch (teleError: any) {
                console.error(`❌ Lỗi khi gửi thông báo Telegram LESSON:`, teleError.message);
            }
        }
        try {
            const enrollment = await prisma.enrollment.findUnique({
                where: { id: enrollmentId },
                select: { course: { select: { id_khoa: true } } }
            })
            if (enrollment?.course?.id_khoa) {
                revalidatePath(`/courses/${enrollment.course.id_khoa}/learn`, 'page')
            }
        } catch (e) {}
        return { success: true, totalScore }
    } catch (error: any) {
        console.error(`${logId} ERROR:`, error)
        return { success: false, message: "Lỗi hệ thống khi lưu kết quả." }
    }
}
export async function saveAssignmentDraftAction({
    enrollmentId, lessonId, reflection, links, supports
}: {
    enrollmentId: number, lessonId: string, reflection: string, links: string[], supports: boolean[]
}) {
    try {
        const session = await auth()
        if (!session?.user?.id) return { success: false }
        const validLinks = links.filter((l: string) => l && l.trim().length > 0)
        await prisma.lessonProgress.upsert({
            where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
            create: {
                enrollmentId, lessonId,
                assignment: { reflection, links: validLinks, supports } as any,
                status: "IN_PROGRESS"
            },
            update: {
                assignment: { reflection, links: validLinks, supports } as any
            }
        })
        return { success: true }
    } catch (error) {
        return { success: false }
    }
}
export async function updateLastLessonAction(enrollmentId: number, lessonId: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) return
        await prisma.enrollment.update({
            where: { id: enrollmentId },
            data: { lastLessonId: lessonId }
        })
    } catch (error) {}
}
```
