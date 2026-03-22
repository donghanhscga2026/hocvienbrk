import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  const { searchParams } = new URL(req.url);
  const source = searchParams.get("source");
  const courseId = searchParams.get("courseId");

  if (session?.user?.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    let users: any[] = [];

    if (source === "DB_ALL") {
      users = await prisma.user.findMany({
        select: { id: true, email: true, name: true, role: true },
        orderBy: { createdAt: "desc" }
      });
    } else if (source === "DB_ACTIVE" && courseId) {
      const enrollments = await prisma.enrollment.findMany({
        where: { 
          courseId: parseInt(courseId),
          status: "ACTIVE"
        },
        include: {
          user: { select: { id: true, email: true, name: true, role: true } }
        }
      });
      users = enrollments.map(e => e.user);
    }

    return NextResponse.json(users);
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}
