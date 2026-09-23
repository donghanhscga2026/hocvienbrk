import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { resolveRecipients, clearCampaignCache } from "@/lib/email-campaign-runner";
import type { Recipient } from "@/lib/email-campaign-runner";
import { parseEmailsFromRawText, parseEmailsFromGoogleSheet } from "@/lib/email-campaign-parser";
import { NextResponse } from "next/server";

/**
 * Bổ sung email mới cho chiến dịch (kể cả đã COMPLETED).
 * Chọn nguồn giống lúc tạo chiến dịch: DB_ALL / DB_ALL_INCLUDING_UNVERIFIED /
 * DB_ACTIVE / CSV / GOOGLE_SHEET. Email lưu vào recipientFilter.extraEmails,
 * email đã có trong chiến dịch (kể cả đã gửi thành công) sẽ bị bỏ qua
 * nên không bao giờ gửi trùng.
 */
export async function POST(
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
    const campaign = await prisma.emailCampaign.findUnique({ where: { id } });
    if (!campaign) return new NextResponse("Chiến dịch không tồn tại", { status: 404 });

    if (role === "TEACHER" && campaign.createdBy !== userId) {
      return new NextResponse("Không có quyền", { status: 403 });
    }

    const { source = "CSV", rawText, recipientCsvData, courseId } = await req.json();

    // TEACHER không được dùng DB_ALL (giống lúc tạo chiến dịch)
    if (role === "TEACHER" && (source === "DB_ALL" || source === "DB_ALL_INCLUDING_UNVERIFIED")) {
      return new NextResponse("Không có quyền gửi đến tất cả thành viên", { status: 403 });
    }

    let parsed: Recipient[] = [];

    if (source === "CSV") {
      const text = String(rawText ?? recipientCsvData ?? "");
      if (!text.trim()) return new NextResponse("Chưa nhập danh sách email", { status: 400 });
      parsed = parseEmailsFromRawText(text);
    } else if (source === "GOOGLE_SHEET") {
      const url = String(rawText ?? recipientCsvData ?? "");
      if (!url.trim()) return new NextResponse("Chưa nhập link Google Sheet", { status: 400 });
      try {
        parsed = await parseEmailsFromGoogleSheet(url);
      } catch (err: any) {
        return new NextResponse(err.message || "Lỗi tải Google Sheet", { status: 400 });
      }
    } else if (source === "DB_ALL") {
      const users = await prisma.user.findMany({
        where: { emailVerified: { not: null }, email: { contains: "@" } },
        select: { email: true, name: true, id: true },
      });
      parsed = users.map(u => ({ email: u.email, name: u.name || "", userId: u.id }));
    } else if (source === "DB_ALL_INCLUDING_UNVERIFIED") {
      const users = await prisma.user.findMany({
        where: { email: { contains: "@" } },
        select: { email: true, name: true, id: true },
      });
      parsed = users.map(u => ({ email: u.email, name: u.name || "", userId: u.id }));
    } else if (source === "DB_ACTIVE") {
      const cid = parseInt(courseId);
      if (!cid) return new NextResponse("Chưa chọn khóa học", { status: 400 });
      if (role === "TEACHER") {
        const course = await prisma.course.findFirst({ where: { id: cid, teacherId: userId } });
        if (!course) return new NextResponse("Không có quyền xem khóa học này", { status: 403 });
      }
      const enrollments = await prisma.enrollment.findMany({
        where: { courseId: cid, status: "ACTIVE", user: { email: { contains: "@" } } },
        include: { user: { select: { email: true, name: true, id: true } } },
      });
      parsed = enrollments.map(e => ({ email: e.user.email, name: e.user.name || "", userId: e.user.id }));
    } else {
      return new NextResponse("Nguồn không hợp lệ", { status: 400 });
    }

    if (parsed.length === 0) {
      return new NextResponse("Không tìm thấy email hợp lệ từ nguồn đã chọn", { status: 400 });
    }

    const existing = await resolveRecipients(id);
    const existingSet = new Set(existing.map(r => r.email.toLowerCase().trim()));

    const oldFilter = (campaign.recipientFilter as any) || {};
    const oldExtra = Array.isArray(oldFilter.extraEmails) ? oldFilter.extraEmails : [];
    const extraSet = new Set(
      oldExtra.map((e: any) => String(typeof e === 'string' ? e : e?.email || '').toLowerCase().trim())
    );

    let added = 0;
    let skipped = 0;
    for (const r of parsed) {
      const lower = r.email.toLowerCase().trim();
      if (existingSet.has(lower) || extraSet.has(lower)) {
        skipped++;
        continue;
      }
      extraSet.add(lower);
      existingSet.add(lower);
      oldExtra.push({ email: lower, name: r.name || '', userId: r.userId });
      added++;
    }

    if (added === 0) {
      return NextResponse.json({
        success: true,
        added: 0,
        skipped,
        totalRecipients: existing.length,
        message: `Tất cả ${skipped} email đã có trong chiến dịch, không thêm mới`,
      });
    }

    const totalRecipients = existing.length + added;
    clearCampaignCache(id);
    const updated = await prisma.emailCampaign.update({
      where: { id },
      data: {
        recipientFilter: { ...oldFilter, extraEmails: oldExtra } as any,
        totalRecipients,
        status: "RUNNING",
        completedAt: null,
      },
    });

    return NextResponse.json({
      success: true,
      added,
      skipped,
      totalRecipients,
      status: updated.status,
    });
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}
