import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const campaigns = await prisma.emailCampaign.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        totalRecipients: true,
        sentCount: true,
        failedCount: true,
        createdAt: true,
        notificationType: true, // Thêm trường này vì UI đang sử dụng
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(campaigns);
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}
