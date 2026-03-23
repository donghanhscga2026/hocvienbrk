import { auth } from "@/auth"
import { redirect } from "next/navigation"
import EmailSettingsClient from "./EmailSettingsClient"

export default async function EmailSettingsPage() {
  const session = await auth()

  if (!session?.user) redirect("/login")
  if ((session.user as any).role !== "ADMIN") {
    return <div className="p-10 text-center text-red-600 font-bold">403 - KHÔNG CÓ QUYỀN TRUY CẬP</div>
  }

  return <EmailSettingsClient />
}
