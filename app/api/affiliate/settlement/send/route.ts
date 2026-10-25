import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { getSettlementData, type SettlementLine } from "@/lib/affiliate/settlement"
import { sendTransactionalEmail } from "@/lib/brevo"
import { logActivity } from "@/lib/activity-logger"

/**
 * Gửi báo cáo quyết toán hoa hồng 1 kỳ cho 1 giảng viên qua email
 * (Gói 2 affiliate, 25/10/2026).
 *
 * Mô hình vận hành đã chốt: nền tảng không giữ tiền — email này là bản
 * đối chiếu để giảng viên tự thanh toán cho CTV. Đính kèm CSV chi tiết
 * từng dòng (cùng định dạng nút Xuất CSV trên trang Quyết Toán GV).
 * Mỗi lần gửi ghi 1 dòng ActivityLog SETTLEMENT_SENT để trang báo cáo
 * hiển thị kỳ nào đã gửi cho giảng viên nào.
 *
 * Chỉ ADMIN được gửi.
 */

function fmtMoney(n: number): string {
  return `${Math.round(n).toLocaleString("vi-VN")}đ`
}

function fmtDateVN(iso: string | null): string {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString("vi-VN", { timeZone: "Asia/Saigon" })
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function buildCsv(lines: SettlementLine[]): string {
  const header = [
    "Giảng viên", "Khóa học", "Người giới thiệu", "Email người giới thiệu",
    "Loại hoa hồng", "Đơn hàng", "Học viên mua", "Giá niêm yết (đ)",
    "Tỷ lệ (%)", "Số tiền phải trả (đ)", "Trạng thái", "Ngày mua", "Ngày chốt đối soát",
  ]
  const rows = lines.map((l) => [
    l.teacherName,
    l.courseName,
    l.affiliateName,
    l.affiliateEmail,
    l.kind === "DIRECT" ? "Trực tiếp" : "Tri ân",
    l.orderId ? `#${l.orderId}` : "",
    l.buyerName,
    String(l.listedPrice),
    String(l.percentage),
    String(l.amount),
    l.ready ? "Đã chốt" : "Chờ đối soát",
    fmtDateVN(l.orderDate),
    fmtDateVN(l.availableAt),
  ])
  const escCsv = (v: string) => `"${v.replace(/"/g, '""')}"`
  return "\uFEFF" + [header, ...rows].map((r) => r.map(escCsv).join(",")).join("\r\n")
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Chỉ admin được gửi báo cáo quyết toán" }, { status: 403 })
  }
  const adminId = Number(session.user.id)

  let body: { teacherId?: number; period?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ" }, { status: 400 })
  }
  const teacherId = Number(body.teacherId)
  const period = String(body.period || "")
  if (!teacherId || !/^\d{4}-\d{2}$/.test(period)) {
    return NextResponse.json(
      { error: "Thiếu giảng viên hoặc kỳ quyết toán (YYYY-MM) không hợp lệ" },
      { status: 400 }
    )
  }

  const data = await getSettlementData({ period, viewerId: adminId, viewerRole: "ADMIN" })
  const group = data.teachers.find((t) => t.teacherId === teacherId)
  if (!group || group.totalAmount <= 0) {
    return NextResponse.json(
      { error: "Giảng viên này không có hoa hồng phải trả trong kỳ đã chọn" },
      { status: 400 }
    )
  }

  const teacher = await prisma.user.findUnique({
    where: { id: teacherId },
    select: { email: true, name: true },
  })
  if (!teacher?.email) {
    return NextResponse.json(
      { error: "Giảng viên chưa có email trong hệ thống nên chưa gửi được" },
      { status: 400 }
    )
  }

  const lines = data.lines.filter((l) => l.teacherId === teacherId)
  const csv = buildCsv(lines)
  const courseRows = group.courses
    .map(
      (cs) =>
        `<tr><td style="padding:6px 10px;border:1px solid #e5e7eb">${esc(cs.courseName)}</td>` +
        `<td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:right">${fmtMoney(cs.totalAmount)}</td></tr>`
    )
    .join("")
  const htmlContent = `
    <div style="font-family:Arial,sans-serif;color:#1f2430;line-height:1.6">
      <h2 style="margin:0 0 8px">Báo cáo quyết toán hoa hồng — kỳ ${period}</h2>
      <p>Chào ${esc(teacher.name || group.teacherName)},</p>
      <p>Hệ thống gửi báo cáo hoa hồng affiliate phát sinh từ các khóa học của bạn trong kỳ <b>${period}</b> để bạn đối chiếu và thanh toán trực tiếp cho người giới thiệu:</p>
      <table style="border-collapse:collapse;margin:12px 0">
        <tr><td style="padding:6px 10px;border:1px solid #e5e7eb">Tổng phải trả</td><td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:right"><b>${fmtMoney(group.totalAmount)}</b></td></tr>
        <tr><td style="padding:6px 10px;border:1px solid #e5e7eb">Đã chốt đối soát</td><td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:right">${fmtMoney(group.readyAmount)}</td></tr>
        <tr><td style="padding:6px 10px;border:1px solid #e5e7eb">Chờ đối soát (30 ngày)</td><td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:right">${fmtMoney(group.waitingAmount)}</td></tr>
      </table>
      <p style="margin:8px 0 4px"><b>Theo khóa học:</b></p>
      <table style="border-collapse:collapse">${courseRows}</table>
      <p>Chi tiết từng dòng hoa hồng (người giới thiệu, đơn hàng, số tiền) nằm trong file CSV đính kèm — khớp với sao kê ngân hàng của bạn theo tháng đơn được thanh toán.</p>
      <p style="color:#6b7280;font-size:13px">Đây là email tự động từ hệ thống Học viện BRK. Nền tảng chỉ ghi nhận số liệu; việc thanh toán cho người giới thiệu do giảng viên thực hiện trực tiếp.</p>
    </div>`

  try {
    await sendTransactionalEmail({
      to: [{ email: teacher.email, name: teacher.name || undefined }],
      subject: `Báo cáo quyết toán hoa hồng kỳ ${period} — ${fmtMoney(group.totalAmount)}`,
      htmlContent,
      attachment: [
        {
          name: `quyet-toan-hoa-hong-${period}-gv-${teacherId}.csv`,
          content: Buffer.from(csv, "utf8").toString("base64"),
        },
      ],
      tags: ["affiliate-settlement"],
    })
  } catch (err) {
    console.error("[SettlementSend] Brevo error:", err)
    return NextResponse.json({ error: "Gửi email thất bại, thử lại sau" }, { status: 502 })
  }

  await logActivity({
    userId: adminId,
    action: "SETTLEMENT_SENT",
    detail: `Gửi báo cáo quyết toán kỳ ${period} cho giảng viên ${group.teacherName} (${teacher.email}): ${fmtMoney(group.totalAmount)}, ${lines.length} dòng`,
    metadata: { teacherId, period, amount: group.totalAmount, lines: lines.length, email: teacher.email },
  })

  return NextResponse.json({
    success: true,
    sentTo: teacher.email,
    amount: group.totalAmount,
    lines: lines.length,
    sentAt: new Date().toISOString(),
  })
}
