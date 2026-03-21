import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id: idStr } = await params;
  const id = parseInt(idStr);

  if (session?.user?.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const logs = await prisma.emailCampaignLog.findMany({
      where: { campaignId: id },
      orderBy: { sentAt: "desc" },
      take: 100, // Lấy 100 log mới nhất
    });

    return NextResponse.json(logs);
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}
