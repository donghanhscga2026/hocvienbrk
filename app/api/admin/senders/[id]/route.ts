import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(
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
    const { senderName } = await req.json();
    const name = String(senderName ?? "").trim();
    if (!name) {
      return new NextResponse("Tên người gửi không được để trống", { status: 400 });
    }

    const updated = await prisma.emailSender.update({
      where: { id },
      data: { senderName: name },
    });

    return NextResponse.json({ success: true, sender: updated });
  } catch (error: any) {
    console.error("❌ Lỗi khi cập nhật Sender:", error.message);
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

  if (session?.user?.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    // 1. Cập nhật các Logs liên quan: Chuyển senderId về null thay vì xóa log 
    // (để bạn vẫn giữ được lịch sử gửi của Campaign)
    await prisma.emailCampaignLog.updateMany({
      where: { senderId: id },
      data: { senderId: null }
    });

    // 2. Xóa sender logs (EmailSenderLog có FK constraint)
    await prisma.emailSenderLog.deleteMany({
      where: { senderId: id }
    });

    // 3. Xóa các bản ghi trong bảng trung gian EmailCampaignSender
    await prisma.emailCampaignSender.deleteMany({
      where: { senderId: id }
    });

    // 4. Cuối cùng mới xóa Sender
    await prisma.emailSender.delete({
      where: { id }
    });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("❌ Lỗi khi xóa Sender:", error.message);
    return new NextResponse(error.message, { status: 500 });
  }
}
