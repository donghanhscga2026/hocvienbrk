'use client'
import Link from 'next/link'
import {
  workspaceLayouts,
  workspaceModules,
  type OfferingDetails,
  type ProductGroup,
} from '@/lib/offerings/shared'
export default function OfferingWorkspaceFields({
  value,
  group,
  onChange,
  courseId,
  section = 'all',
}: {
  value: OfferingDetails
  group: ProductGroup
  onChange: (value: OfferingDetails) => void
  courseId?: string
  section?: 'all' | 'sales' | 'workspace'
}) {
  const layouts =
    group === 'DIGITAL'
      ? (['AUTO', 'LIBRARY', 'APP'] as const)
      : (['AUTO', 'SESSIONS', 'DELIVERY', 'LIBRARY', 'APP'] as const)
  const field = 'mt-2 min-h-12 w-full rounded-xl border bg-white px-3 text-base'
  return (
    <section className="mb-6 space-y-4 rounded-2xl border border-green-200 bg-green-50 p-4">
      <h3 className="text-lg font-bold text-green-950">
        {section === 'sales'
          ? 'Mẫu trang giới thiệu'
          : section === 'workspace'
            ? 'Bố cục & Các mục bên trong'
            : 'Trang giới thiệu & Không gian sử dụng'}
      </h3>
      <div hidden={section === 'workspace'} className="space-y-4">
        <label className="block text-sm font-semibold">
          Trang giới thiệu / bán hàng
          <select
            className={field}
            value={value.salesLayout}
            onChange={(e) =>
              onChange({ ...value, salesLayout: e.target.value as OfferingDetails['salesLayout'] })
            }
          >
            <option value="DEFAULT">Bố cục mặc định</option>
            <option value="TEMPLATE">Dùng mẫu trang bán đã xuất bản</option>
          </select>
        </label>
        <p className="text-sm leading-6 text-brk-muted">
          Chọn và xuất bản mẫu trong mục Trang bán hiện có. Khi bật dùng mẫu, trang giới thiệu sẽ mở tại đường
          dẫn trang bán đã xuất bản; không gian sử dụng vẫn tách riêng.
        </p>
        {courseId && (
          <Link
            href={`/tools/courses/new?id=${encodeURIComponent(courseId)}&group=${group}&tab=sales`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center font-semibold text-brk-primary"
          >
            Chọn / chỉnh mẫu trang bán →
          </Link>
        )}
      </div>
      <div hidden={section === 'sales'} className="space-y-4">
        <label className="block text-sm font-semibold">
          Kiểu không gian sử dụng
          <select
            className={field}
            value={value.workspaceLayout}
            onChange={(e) =>
              onChange({ ...value, workspaceLayout: e.target.value as OfferingDetails['workspaceLayout'] })
            }
          >
            {layouts.map((layout) => (
              <option key={layout} value={layout}>
                {workspaceLayouts[layout]}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold">Các mục được bật bên trong</legend>
          {Object.entries(workspaceModules)
            .filter(([key]) => group === 'SERVICE' || !['bookings', 'delivery'].includes(key))
            .map(([key, label]) => (
              <label key={key} className="flex min-h-11 items-center gap-3 rounded-xl bg-white px-3 text-sm">
                <input
                  type="checkbox"
                  checked={value.modules.includes(key as OfferingDetails['modules'][number])}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      modules: e.target.checked
                        ? [...value.modules, key as OfferingDetails['modules'][number]]
                        : value.modules.filter((module) => module !== key),
                    })
                  }
                />
                {label}
              </label>
            ))}
        </fieldset>
        <p className="text-sm leading-6 text-brk-muted">
          Khách chỉ vào không gian riêng sau khi đăng nhập và kích hoạt. Chọn một kiểu chính rồi bật thêm mục
          cần dùng, ví dụ App kèm tài liệu hoặc coaching kèm thư viện.
        </p>
        {group === 'SERVICE' && courseId && (
          <Link
            href={`/tools/services/${encodeURIComponent(courseId)}/delivery`}
            className="inline-flex min-h-11 items-center font-semibold text-brk-primary"
          >
            Cập nhật tiến độ & Bàn giao theo khách →
          </Link>
        )}
      </div>
    </section>
  )
}
