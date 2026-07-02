import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { requestPayout } from "@/app/actions/affiliate-actions"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = Number(session.user.id)
    const body = await request.json()
    const { amount, bankName, bankAccount, accountHolder } = body

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Số tiền không hợp lệ" }, { status: 400 })
    }

    if (!bankName || !bankAccount || !accountHolder) {
      return NextResponse.json({ error: "Thiếu thông tin tài khoản ngân hàng" }, { status: 400 })
    }

    const result = await requestPayout(userId, {
      bankName,
      bankAccount,
      accountHolder,
    }, amount)

    if (result.success) {
      return NextResponse.json({ success: true, payout: result.payout })
    } else {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

  } catch (error) {
    console.error("[Withdraw] Error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
