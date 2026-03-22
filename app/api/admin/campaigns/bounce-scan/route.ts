import { auth } from "@/auth";
import { processBounceEmails } from "@/lib/email-campaign-runner";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const stats = await processBounceEmails();
    
    return NextResponse.json({
      success: true,
      ...stats
    });
  } catch (error: any) {
    console.error("Bounce scan error:", error);
    return new NextResponse(error.message, { status: 500 });
  }
}
