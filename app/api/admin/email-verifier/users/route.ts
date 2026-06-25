import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();

  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  if (session.user.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 403 });
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
      },
      orderBy: { id: "asc" },
    });

    const total = users.length;
    const verified = users.filter((u) => u.emailVerified !== null).length;
    const unverified = total - verified;

    return NextResponse.json({
      success: true,
      users,
      stats: {
        total,
        verified,
        unverified,
      },
    });
  } catch (error: any) {
    console.error("[EmailVerifier API] Get users error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
