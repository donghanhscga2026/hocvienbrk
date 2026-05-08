import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id: idStr } = await params;
  
  if (!idStr || idStr === "undefined" || isNaN(parseInt(idStr))) {
    return new NextResponse("ID chiến dịch không hợp lệ", { status: 400 });
  }

  const id = parseInt(idStr);

  if (session?.user?.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        totalRecipients: true,
        sentCount: true,
        failedCount: true,
      }
    });

    if (!campaign) {
      return new NextResponse("Chiến dịch không tồn tại", { status: 404 });
    }

    return NextResponse.json(campaign);
  } catch (error: any) {
    console.error("❌ [GET Progress] Lỗi Prisma:", error.message);
    return new NextResponse(error.message, { status: 500 });
  }
}
