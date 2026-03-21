import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const senders = await prisma.emailSender.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(senders);
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}
