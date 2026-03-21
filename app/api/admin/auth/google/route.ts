import { auth } from "@/auth";
import { getAuthUrl } from "@/lib/google-auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();

  // Kiểm tra quyền Admin
  if (session?.user?.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const url = getAuthUrl();
  return NextResponse.redirect(url);
}
