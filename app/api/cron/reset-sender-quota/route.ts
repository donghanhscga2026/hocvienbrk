import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  // Kiểm tra Header bảo mật của Vercel Cron (tùy chọn)
  // const authHeader = req.headers.get('authorization');
  // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) { ... }

  try {
    await prisma.emailSender.updateMany({
      data: {
        sentToday: 0,
        lastResetAt: new Date(),
      }
    });

    return NextResponse.json({ success: true, message: "Đã reset quota gửi email." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
