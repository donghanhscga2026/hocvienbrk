import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id: idStr } = await params;
  
  // LOG để debug (Bạn sẽ thấy trong Terminal)
  console.log(`🔍 [GET Campaign] Đang truy vấn ID: ${idStr}`);

  if (!idStr || idStr === "undefined" || isNaN(parseInt(idStr))) {
    return new NextResponse("ID chiến dịch không hợp lệ", { status: 400 });
  }

  const id = parseInt(idStr);

  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "TEACHER") {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const userId = parseInt(session.user.id || "0");

  try {
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id },
      include: {
        creator: { select: { name: true } },
        senders: { include: { sender: true } },
      }
    });

    if (!campaign) {
      console.log(`❌ [GET Campaign] Không tìm thấy ID: ${id} trong Database`);
      return new NextResponse("Chiến dịch không tồn tại", { status: 404 });
    }

    // TEACHER chỉ xem được campaign của mình
    if (role === "TEACHER" && campaign.createdBy !== userId) {
      return new NextResponse("Không có quyền xem chiến dịch này", { status: 403 });
    }

    return NextResponse.json(campaign);
  } catch (error: any) {
    console.error("❌ [GET Campaign] Lỗi Prisma:", error.message);
    return new NextResponse(error.message, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id: idStr } = await params;
  const id = parseInt(idStr);

  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const role2 = session.user.role;
  if (role2 !== "ADMIN" && role2 !== "TEACHER") {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const userId2 = parseInt(session.user.id || "0");

  try {
    // TEACHER chỉ sửa được campaign của mình
    if (role2 === "TEACHER") {
      const own = await prisma.emailCampaign.findUnique({ where: { id }, select: { createdBy: true } });
      if (!own || own.createdBy !== userId2) {
        return new NextResponse("Không có quyền sửa chiến dịch này", { status: 403 });
      }
    }

    const data = await req.json();
    const updated = await prisma.emailCampaign.update({
      where: { id },
      data: {
        title: data.title,
        notificationType: data.notificationType,
        recipientSource: data.recipientSource,
        recipientFilter: data.recipientFilter,
        recipientCsvData: data.recipientCsvData,
        subject: data.subject,
        htmlContent: data.htmlContent,
        status: data.status || "DRAFT", // Mặc định về Draft nếu sửa nội dung quan trọng
        totalRecipients: data.totalRecipients || 0,
      }
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id: idStr } = await params;
  const id = parseInt(idStr);

  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "TEACHER") {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const userId = parseInt(session.user.id || "0");

  try {
    // TEACHER chỉ xóa được campaign của mình
    if (role === "TEACHER") {
      const own = await prisma.emailCampaign.findUnique({ where: { id }, select: { createdBy: true } });
      if (!own || own.createdBy !== userId) {
        return new NextResponse("Không có quyền xóa chiến dịch này", { status: 403 });
      }
    }

    await prisma.emailCampaign.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}
