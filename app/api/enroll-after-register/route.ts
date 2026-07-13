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

    // Tài khoản test hệ thống không được phép tham gia khóa học
    if (userIdNum === 2689) {
      return NextResponse.json({ error: "Tài khoản test này không được phép tham gia khóa học." }, { status: 403 })
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
    let appliedUserVoucherId: number | null = null

    if (course.type !== 'LIB' && course.type !== 'SYS') {
      const { checkVoucherForCourse } = await import('@/lib/voucher/voucher-service')
      const voucherCheck = await checkVoucherForCourse(userIdNum, course.id)
      if (voucherCheck.applicable) {
        if (voucherCheck.voucherType === 'CASH') {
          effectivePhiCoc = Math.max(0, course.phi_coc - (voucherCheck.discount || 0))
        } else {
          effectivePhiCoc = 0
        }
        appliedUserVoucherId = voucherCheck.userVoucherId || null
      }
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

    // Đánh dấu voucher đã dùng (nếu có)
    if (appliedUserVoucherId) {
      const { markVoucherUsed } = await import('@/lib/voucher/voucher-service')
      await markVoucherUsed(appliedUserVoucherId, newEnrollment.id)
    }

    // Award voucher từ course
    const { awardVoucher } = await import('@/lib/voucher/voucher-service')
    const awards = await prisma.courseVoucherAward.findMany({
      where: { courseId: course.id },
      include: { voucher: true }
    })
    for (const award of awards) {
      await awardVoucher(userIdNum, award.voucherId, course.id)
    }

    // Track affiliate conversion for purchase
    if (user?.referrerId) {
      try {
        const { trackAffiliateConversion } = await import("@/lib/affiliate/tracking")
        const { cookies } = await import("next/headers")
        const cookieStore = await cookies()
        const refCookie = cookieStore.get('aff_ref')
        
        let finalRefCode = ""
        if (refCookie?.value) {
          try {
            const decoded = decodeURIComponent(refCookie.value)
            const affData = JSON.parse(decoded)
            if (affData?.r) finalRefCode = affData.r
          } catch {
            finalRefCode = refCookie.value
          }
        }

        if (!finalRefCode) {
          const defaultLink = await prisma.affiliateLink.findFirst({
            where: { userId: user.referrerId, name: "Default" }
          })
          finalRefCode = defaultLink?.code || `default-${user.referrerId}`
        }

        await trackAffiliateConversion({
          refCode: finalRefCode,
          userId: userIdNum,
          type: 'PURCHASE',
          enrollmentId: newEnrollment.id,
          orderAmount: effectivePhiCoc
        })
        console.log(`[EnrollAfterRegister-Track] Tracked conversion for user #${userIdNum} under refCode ${finalRefCode}`)
      } catch (trackErr) {
        console.error("[EnrollAfterRegister-Track] Failed to track conversion:", trackErr)
      }
    }

    // Tạo Payment record cho enrollment cần thu phí (auto-verify cần Payment để update)
    if (effectivePhiCoc > 0) {
      await prisma.payment.create({
        data: {
          enrollmentId: newEnrollment.id,
          amount: effectivePhiCoc,
          status: 'PENDING',
          phone: user?.phone,
        }
      })
    }

    if (course.teacherId === 327) {
      const { syncUserToYtbSystem } = await import("@/lib/system-closure-helpers")
      await syncUserToYtbSystem(userIdNum, course.teacherId)
    }

    if (isAutoActive) {
      const { sendTelegram, sendActivationEmail } = await import("@/lib/notifications")

      let rawRefCode = ''
      try {
        const { cookies } = await import("next/headers")
        const cookieStore = await cookies()
        const refCookie = cookieStore.get('aff_ref')
        if (refCookie?.value) {
          const decoded = decodeURIComponent(refCookie.value)
          const affData = JSON.parse(decoded)
          if (affData?.r) rawRefCode = affData.r
        }
      } catch {}

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://giautoandien.io.vn'
      const refLink = rawRefCode ? `\n🔗 Link ref: ${appUrl}/khoa-hoc/${course.id_khoa}?ref=${rawRefCode}` : ''
      let referrerInfo = ''
      if (user?.referrerId) {
        const referrerUser = await prisma.user.findUnique({ where: { id: user.referrerId }, select: { name: true } })
        const refName = referrerUser?.name || ''
        referrerInfo = `\n📢 Người giới thiệu: #${user.referrerId}${refName ? ' (' + refName + ')' : ''}${refLink}`
      } else {
        referrerInfo = refLink
      }
      const msgAdmin = `🎁 <b>KÍCH HOẠT MIỄN PHÍ (từ ĐK)</b>\n\n` +
        `👤 Học viên: <b>${user?.name}</b> (#${user?.id})\n` +
        `🎓 Khóa học: <b>${course.name_lop} (${course.id_khoa})</b>${referrerInfo}\n` +
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
