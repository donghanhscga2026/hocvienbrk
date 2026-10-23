/* eslint-disable @next/next/no-html-link-for-pages -- trang có liên kết tới route OAuth /api/social/youtube/connect (chuyển hướng sang Google), không phải điều hướng trang nội bộ */
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import AccountRow from "@/components/social/AccountRow"

/**
 * Trang thành viên: liên kết tài khoản mạng xã hội 1 lần để hệ thống tự
 * đồng bộ số liệu (tầng Bạc của kiến trúc đo lường tự động). Đợt đầu hỗ
 * trợ YouTube. GĐ2A (23/10/2026).
 */
export default async function KetNoiTaiKhoanPage({
  searchParams
}: {
  searchParams: Promise<{ linked?: string; error?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const userId = Number(session.user.id)
  const params = await searchParams

  const accounts = await prisma.connectedAccount.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    include: {
      snapshots: { orderBy: { capturedAt: 'desc' }, take: 1 },
      _count: { select: { contentItems: true } },
    },
  })
  const youtube = accounts.find((a) => a.provider === 'YOUTUBE' && a.status !== 'REVOKED')
  const fmtNum = (n: number) => n.toLocaleString('vi-VN')

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Kết nối tài khoản của bạn</h1>
      <p className="text-sm text-gray-500 mt-1">
        Liên kết một lần — sau đó hệ thống tự cập nhật số liệu kênh của bạn mỗi ngày để ghi nhận nội dung,
        lượt xem và tăng trưởng mà không cần bạn khai tay.
      </p>

      {params.linked === 'youtube' && <p className="mt-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm p-3">Đã liên kết kênh YouTube và đồng bộ số liệu lần đầu.</p>}
      {params.error && <p role="alert" className="mt-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm p-3">Liên kết chưa thành công ({params.error}). Hãy thử lại; nếu vẫn lỗi, kiểm tra rằng bạn đăng nhập đúng tài khoản Google sở hữu kênh.</p>}

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-bold text-gray-900">YouTube</h2>
            {youtube ? (
              <div className="text-sm text-gray-600 mt-1 space-y-0.5">
                <p>Kênh: <span className="font-medium text-gray-900">{youtube.displayName ?? youtube.externalId}</span>{youtube.handle ? ` · ${youtube.handle}` : ''}</p>
                <p>Trạng thái: {youtube.status === 'ACTIVE' ? 'Đang đồng bộ' : 'Có lỗi đồng bộ'}{youtube.lastSyncAt ? ` · Lần gần nhất ${youtube.lastSyncAt.toISOString().slice(0, 16).replace('T', ' ')}` : ''}</p>
                {youtube.snapshots[0] && (
                  <p>Người đăng ký: <b>{fmtNum(youtube.snapshots[0].followers)}</b> · Tổng lượt xem: <b>{fmtNum(Math.round(youtube.snapshots[0].totalViews))}</b> · Video đã ghi nhận: <b>{youtube._count.contentItems}</b></p>
                )}
                {youtube.lastError && <p className="text-red-600">Lỗi gần nhất: {youtube.lastError}</p>}
              </div>
            ) : (
              <p className="text-sm text-gray-500 mt-1">Chưa liên kết. Hệ thống sẽ xin quyền chỉ-đọc kênh của bạn qua Google.</p>
            )}
          </div>
          {youtube ? (
            <AccountRow accountId={youtube.id} canSync={youtube.status !== 'REVOKED'} />
          ) : (
            <a href="/api/social/youtube/connect" className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white">Liên kết kênh YouTube</a>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-dashed border-gray-300 p-5 text-sm text-gray-500">
        TikTok và Facebook sẽ mở ở giai đoạn tiếp theo qua hình thức dán liên kết bài đăng để hệ thống tự kiểm chứng
        (API chính thức của hai nền tảng này giới hạn quyền đọc số liệu kênh cá nhân).
      </div>
    </div>
  )
}
