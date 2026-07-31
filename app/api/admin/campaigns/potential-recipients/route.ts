import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  const { searchParams } = new URL(req.url);
  const source = searchParams.get("source");
  const courseId = searchParams.get("courseId");

  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "TEACHER") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const userId = parseInt(session.user.id || "0");

  try {
    // TEACHER không được preview DB_ALL hoặc DB_ALL_INCLUDING_UNVERIFIED
    if (role === "TEACHER" && (source === "DB_ALL" || source === "DB_ALL_INCLUDING_UNVERIFIED")) {
      return new NextResponse("Không có quyền", { status: 403 });
    }

    let users: any[] = [];

    if (source === "DB_ALL") {
      users = await prisma.user.findMany({
        where: {
          emailVerified: { not: null },
          email: { contains: "@" }
        },
        select: { id: true, email: true, name: true, role: true, emailVerified: true },
        orderBy: { createdAt: "desc" }
      });
    } else if (source === "DB_ALL_INCLUDING_UNVERIFIED") {
      users = await prisma.user.findMany({
        where: {
          email: { contains: "@" }
        },
        select: { id: true, email: true, name: true, role: true, emailVerified: true },
        orderBy: { createdAt: "desc" }
      });
    } else if (source === "DB_ACTIVE" && courseId) {
      // TEACHER chỉ preview được course của mình
      if (role === "TEACHER") {
        const course = await prisma.course.findFirst({
          where: { id: parseInt(courseId), teacherId: userId }
        });
        if (!course) {
          return new NextResponse("Không có quyền xem khóa học này", { status: 403 });
        }
      }

      const enrollments = await prisma.enrollment.findMany({
        where: { 
          courseId: parseInt(courseId),
          status: "ACTIVE",
          user: { email: { contains: "@" } }
        },
        include: {
          user: { 
            select: { id: true, email: true, name: true, role: true, emailVerified: true }
          }
        }
      });
      users = enrollments.map(e => e.user);
    }

    return NextResponse.json(users);
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "TEACHER") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { source, recipientCsvData } = await req.json();

    if (source === "CSV") {
      const { parseEmailsFromRawText } = await import("@/lib/email-campaign-parser");
      const parsed = parseEmailsFromRawText(recipientCsvData || "");
      return NextResponse.json(parsed);
    }

    if (source === "GOOGLE_SHEET") {
      const { parseEmailsFromGoogleSheet } = await import("@/lib/email-campaign-parser");
      try {
        const parsed = await parseEmailsFromGoogleSheet(recipientCsvData || "");
        return NextResponse.json(parsed);
      } catch (err: any) {
        return new NextResponse(err.message || "Lỗi tải Google Sheet", { status: 400 });
      }
    }

    return NextResponse.json([]);
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}
