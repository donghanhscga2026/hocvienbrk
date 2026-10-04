import Link from 'next/link'
import { ArrowLeft, LayoutTemplate, ExternalLink } from 'lucide-react'
import MainHeader from '@/components/layout/MainHeader'
import { COURSE_TEMPLATE_LIBRARY } from '@/lib/course-page/templates'

export default function CourseTemplateLibraryPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <MainHeader title="THƯ VIỆN MẪU SALESPAGE" toolSlug="courses" />
      <main className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Link href="/tools/courses" className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-purple-700">
              <ArrowLeft className="w-4 h-4" /> Quản lý khóa học
            </Link>
            <h1 className="mt-3 text-2xl font-black text-gray-900">Thư viện mẫu Salespage</h1>
            <p className="mt-1 text-sm text-gray-500">Mẫu là bản gốc. Khi áp dụng cho một khóa học, hệ thống tạo một bản dữ liệu riêng để chỉnh sửa độc lập.</p>
          </div>
          <LayoutTemplate className="w-10 h-10 text-purple-700 shrink-0" />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {COURSE_TEMPLATE_LIBRARY.map((template) => (
            <article key={template.key} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-widest text-purple-600">Salespage template</div>
              <h2 className="mt-2 text-xl font-black text-gray-900">{template.name}</h2>
              <p className="mt-2 min-h-12 text-sm leading-6 text-gray-500">{template.description}</p>
              <div className="mt-5 rounded-xl bg-purple-50 p-3 text-xs font-semibold text-purple-800">
                Áp dụng từ màn hình Khóa học → Mẫu. Sau khi áp dụng, nội dung trang được lưu riêng theo slug khóa học.
              </div>
            </article>
          ))}
        </div>

        <section className="rounded-3xl border border-dashed border-gray-300 bg-white p-6">
          <h2 className="font-black text-gray-900">Kiến trúc mở rộng Builder</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">Mỗi salespage có Theme, SEO, Checkout và danh sách Section riêng. Trình chỉnh sửa hiện tại cho phép thêm/xóa, bật/tắt, đổi thứ tự và sửa dữ liệu từng section; các bước tiếp theo có thể thay JSON editor bằng form trực quan và kéo-thả mà không phải đổi mô hình dữ liệu.</p>
          <Link href="/tools/courses" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-xs font-black text-yellow-400">
            Chọn khóa học để áp dụng mẫu <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </section>
      </main>
    </div>
  )
}
