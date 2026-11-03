import Link from 'next/link'

// Trang 404 thật cho mọi đường dẫn không tồn tại (trang [slug] và các route
// không khớp). Trước đây dự án chưa có file này và nhiều đường lạ bị trả
// HTTP 200 (soft-404) do vỏ trang phát trực tiếp — lớp chặn chính nằm ở
// proxy.ts, file này lo phần hiển thị khi notFound() được gọi.
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-6xl font-black tracking-tight">404</p>
      <h1 className="mt-4 text-2xl font-bold">Không tìm thấy trang</h1>
      <p className="mt-2 max-w-md text-sm opacity-70">
        Đường dẫn này không tồn tại hoặc đã được di chuyển. Vui lòng kiểm tra
        lại địa chỉ hoặc quay về trang chủ.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-full border px-5 py-2.5 font-semibold transition hover:opacity-80"
      >
        Về trang chủ
      </Link>
    </main>
  )
}
