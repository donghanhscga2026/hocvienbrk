import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const { userId, idKhoa } = await request.json()

    if (!userId || !idKhoa) {
      return NextResponse.json({ error: "Missing userId or idKhoa" }, { status: 400 })
    }

    const userIdNum = Number(userId)
    if (isNaN(userIdNum) || userIdNum <= 0) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 })
    }

    const course = await prisma.course.findUnique({
      where: { id_khoa: idKhoa },
      select: {
        id: true,
        phi_coc: true,
        id_khoa: true,
        name_lop: true,
        type: true,
        teacherId: true,
        noidung_email: true,
      }
    })

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    const existing = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: userIdNum, courseId: course.id } }
    })

    if (existing) {
      return NextResponse.json({ success: true, status: existing.status, message: "Already enrolled" })
    }

    const user = await prisma.user.findUnique({
      where: { id: userIdNum },
      select: { id: true, name: true, phone: true, email: true, referrerId: true }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    let effectivePhiCoc = course.phi_coc

    if (course.type !== 'LIB') {
      const vipEnrollment = await prisma.enrollment.findFirst({
        where: { userId: userIdNum, courseId: 1, status: 'ACTIVE' }
      })
      if (vipEnrollment) effectivePhiCoc = 0
    }

    const isAutoActive = effectivePhiCoc === 0

    const newEnrollment = await prisma.enrollment.create({
      data: {
        userId: userIdNum,
        courseId: course.id,
        status: isAutoActive ? "ACTIVE" : "PENDING",
        referrerId: user?.referrerId || null,
      }
    })

    if (course.teacherId === 327) {
      const { syncUserToYtbSystem } = await import("@/lib/system-closure-helpers")
      await syncUserToYtbSystem(userIdNum, course.teacherId)
    }

    if (isAutoActive) {
      const { sendTelegram, sendActivationEmail } = await import("@/lib/notifications")

      const msgAdmin = `🎁 <b>KÍCH HOẠT MIỄN PHÍ (từ ĐK)</b>\n\n` +
        `👤 Học viên: <b>${user?.name}</b> (#${user?.id})\n` +
        `🎓 Khóa học: <b>${course.name_lop} (${course.id_khoa})</b>\n` +
        `📅 Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`
      await sendTelegram(msgAdmin, 'ACTIVATE')

      if (user?.email) {
        await sendActivationEmail(user.email, user.name || '', user.id, course.name_lop || course.id_khoa, course.noidung_email)
      }

      // Xử lý commission cho enrollment miễn phí
      try {
        const { processEnrollmentCommission } = await import("@/lib/affiliate/commission-calculator")
        await processEnrollmentCommission(userIdNum, newEnrollment.id, course.phi_coc)
      } catch (e) {
        console.error("[EnrollAfterRegister] Commission error:", e)
      }
    }

    return NextResponse.json({
      success: true,
      status: isAutoActive ? "ACTIVE" : "PENDING",
      message: isAutoActive ? "Kích hoạt thành công" : "Đã đăng ký, vui lòng thanh toán"
    })

  } catch (error) {
    console.error("[EnrollAfterRegister] Error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
