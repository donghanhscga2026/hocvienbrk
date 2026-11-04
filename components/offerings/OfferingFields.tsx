'use client'

import OfferingWorkspaceFields from './OfferingWorkspaceFields'
import { offeringKinds, type OfferingDetails, type ProductGroup } from '@/lib/offerings/shared'

export default function OfferingFields({
  group,
  value,
  onChange,
  courseId,
}: {
  courseId?: string
  group: ProductGroup
  value: OfferingDetails
  onChange: (value: OfferingDetails) => void
}) {
  if (group === 'COURSE') return null
  const update = <K extends keyof OfferingDetails>(key: K, next: OfferingDetails[K]) =>
    onChange({ ...value, [key]: next })
  const field = 'mt-2 min-h-12 w-full rounded-xl border border-brk-outline bg-white px-3 text-base'
  const kinds =
    group === 'DIGITAL'
      ? (['APP', 'EBOOK', 'TEMPLATE', 'RESOURCE', 'OTHER'] as const)
      : (['COACHING', 'CONSULTING', 'IMPLEMENTATION', 'OTHER'] as const)
  return (
    <section className="mt-6 space-y-4 rounded-2xl border border-brk-outline bg-brk-background p-4">
      <OfferingWorkspaceFields group={group} value={value} onChange={onChange} courseId={courseId} />
      <h3 className="text-lg font-bold">
        {group === 'DIGITAL' ? 'Nội dung & quyền sử dụng' : 'Thông tin đồng hành'}
      </h3>
      <label className="block text-sm font-semibold">
        Loại
        <select
          className={field}
          value={value.kind}
          onChange={(e) => update('kind', e.target.value as OfferingDetails['kind'])}
        >
          {kinds.map((kind) => (
            <option key={kind} value={kind}>
              {offeringKinds[kind]}
            </option>
          ))}
        </select>
      </label>
      {group === 'DIGITAL' ? (
        <>
          <label className="block text-sm font-semibold">
            Nguồn App / tài liệu xem trực tiếp
            <input
              type="text"
              maxLength={2000}
              className={field}
              value={value.accessUrl}
              onChange={(e) => update('accessUrl', e.target.value)}
              placeholder="https://… hoặc đường dẫn nội bộ"
            />
          </label>
          <p className="text-sm text-brk-muted">
            Chỉ hiển thị cho khách đã được kích hoạt. App bên ngoài cần có cơ chế cấp quyền riêng; một đường
            dẫn không tự tạo tài khoản App.
          </p>
          <label className="block text-sm font-semibold">
            Thời hạn sử dụng (ngày)
            <input
              type="number"
              min={0}
              max={36500}
              className={field}
              value={value.accessDays}
              onChange={(e) => update('accessDays', Number(e.target.value))}
            />
          </label>
          <p className="text-sm text-brk-muted">
            0 = không giới hạn. Thời hạn được tính từ khi kích hoạt quyền sử dụng trên website.
          </p>
        </>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold">
              Số buổi
              <input
                type="number"
                min={1}
                max={1000}
                className={field}
                value={value.sessions}
                onChange={(e) => update('sessions', Number(e.target.value))}
              />
            </label>
            <label className="block text-sm font-semibold">
              Phút mỗi buổi
              <input
                type="number"
                min={5}
                max={1440}
                className={field}
                value={value.durationMin}
                onChange={(e) => update('durationMin', Number(e.target.value))}
              />
            </label>
          </div>
          <label className="block text-sm font-semibold">
            Hình thức
            <select
              className={field}
              value={value.mode}
              onChange={(e) => update('mode', e.target.value as OfferingDetails['mode'])}
            >
              <option value="ONLINE">Online</option>
              <option value="OFFLINE">Trực tiếp</option>
              <option value="HYBRID">Kết hợp</option>
            </select>
          </label>
          <label className="block text-sm font-semibold">
            Mã lịch hẹn đã tạo
            <input
              className={field}
              maxLength={100}
              pattern="[a-zA-Z0-9_-]*"
              value={value.bookingCode}
              onChange={(e) => update('bookingCode', e.target.value)}
              placeholder="VD: COACHING-1-1"
            />
          </label>
          <p className="text-sm text-brk-muted">
            Chọn mã lịch của đúng chuyên gia và gắn lịch đó với dịch vụ này. Để trống nếu tiếp nhận qua mục
            Yêu cầu của tôi.
          </p>
        </>
      )}
      <div className="border-t border-brk-outline pt-4">
        <h4 className="mb-3 font-bold">Thông tin hiển thị trên danh mục & trang chi tiết</h4>
        {group === 'DIGITAL' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              Bao gồm / định dạng
              <input
                maxLength={160}
                className={field}
                value={value.format}
                onChange={(e) => update('format', e.target.value)}
                placeholder="VD: PDF · Template · Công cụ AI"
              />
            </label>
            <label className="text-sm font-semibold">
              Nền tảng tương thích
              <input
                maxLength={160}
                className={field}
                value={value.platform}
                onChange={(e) => update('platform', e.target.value)}
                placeholder="VD: Web, Canva, Notion"
              />
            </label>
            <label className="text-sm font-semibold">
              Ngôn ngữ
              <input
                maxLength={80}
                className={field}
                value={value.language}
                onChange={(e) => update('language', e.target.value)}
              />
            </label>
            <label className="text-sm font-semibold">
              Cách sử dụng
              <select
                className={field}
                value={value.delivery}
                onChange={(e) => update('delivery', e.target.value as OfferingDetails['delivery'])}
              >
                <option value="ONLINE">Trực tuyến</option>
                <option value="DOWNLOAD">Tải về</option>
                <option value="BOTH">Trực tuyến / tải về</option>
              </select>
            </label>
          </div>
        ) : (
          <label className="block text-sm font-semibold">
            Kiểu đồng hành
            <select
              className={field}
              value={value.audience}
              onChange={(e) => update('audience', e.target.value as OfferingDetails['audience'])}
            >
              <option value="INDIVIDUAL">1:1</option>
              <option value="GROUP">Theo nhóm</option>
            </select>
          </label>
        )}
        <label className="mt-4 block text-sm font-semibold">
          {group === 'DIGITAL' ? 'Bạn nhận được gì?' : 'Kết quả hướng đến'}
          <textarea
            rows={3}
            className={field + ' py-3'}
            value={value.benefits.join('\n')}
            onChange={(e) => update('benefits', e.target.value.split('\n').slice(0, 6))}
            placeholder="Mỗi dòng một quyền lợi, tối đa 6 dòng, 240 ký tự/dòng."
          />
        </label>
      </div>
      {group === 'DIGITAL' ? (
        <section className="space-y-3 border-t border-brk-outline pt-4">
          <h4 className="font-bold">Danh sách tài nguyên sau kích hoạt</h4>
          <p className="text-sm text-brk-muted">
            Tài nguyên chỉ được gửi tới khách có quyền truy cập. Các bài học cũ cũng tự xuất hiện trong mục
            Nội dung sản phẩm.
          </p>
          {value.resources.map((resource, index) => (
            <div key={index} className="space-y-3 rounded-xl border bg-white p-3">
              <div className="flex items-center justify-between gap-3">
                <strong className="text-sm">Tài nguyên {index + 1}</strong>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={index === 0}
                    className="min-h-11 px-3 text-sm disabled:opacity-40"
                    onClick={() => {
                      const list = [...value.resources]
                      ;[list[index - 1], list[index]] = [list[index], list[index - 1]]
                      update('resources', list)
                    }}
                  >
                    Đưa lên
                  </button>
                  <button
                    type="button"
                    className="min-h-11 px-3 text-sm text-red-700"
                    onClick={() =>
                      update(
                        'resources',
                        value.resources.filter((_, i) => i !== index),
                      )
                    }
                  >
                    Xóa
                  </button>
                </div>
              </div>
              <label className="block text-sm">
                Tên tài nguyên
                <input
                  maxLength={200}
                  className={field}
                  value={resource.title}
                  onChange={(e) =>
                    update(
                      'resources',
                      value.resources.map((item, i) =>
                        i === index
                          ? {
                              ...item,
                              title: e.target.value,
                            }
                          : item,
                      ),
                    )
                  }
                />
              </label>
              <label className="block text-sm">
                Loại
                <select
                  className={field}
                  value={resource.kind}
                  onChange={(e) =>
                    update(
                      'resources',
                      value.resources.map((item, i) =>
                        i === index
                          ? {
                              ...item,
                              kind: e.target.value as typeof resource.kind,
                            }
                          : item,
                      ),
                    )
                  }
                >
                  {[
                    ['EBOOK', 'Ebook'],
                    ['APP', 'Công cụ / App'],
                    ['TEMPLATE', 'Template'],
                    ['GUIDE', 'Hướng dẫn'],
                    ['PROMPT', 'Prompt'],
                    ['VIDEO', 'Video'],
                    ['RESOURCE', 'Tài nguyên'],
                  ].map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                Liên kết
                <input
                  maxLength={2000}
                  className={field}
                  value={resource.url}
                  placeholder="https://… hoặc đường dẫn nội bộ"
                  onChange={(e) =>
                    update(
                      'resources',
                      value.resources.map((item, i) =>
                        i === index
                          ? {
                              ...item,
                              url: e.target.value,
                            }
                          : item,
                      ),
                    )
                  }
                />
              </label>
              <label className="block text-sm">
                Trình xem bên trong website
                <select
                  className={field}
                  value={resource.viewer}
                  onChange={(e) =>
                    update(
                      'resources',
                      value.resources.map((item, i) =>
                        i === index
                          ? {
                              ...item,
                              viewer: e.target.value as 'LINK' | 'PDF',
                            }
                          : item,
                      ),
                    )
                  }
                >
                  <option value="LINK">Tự nhận diện video / tài liệu / App</option>
                  <option value="PDF">Xem PDF bên trong trang (nếu nơi lưu hỗ trợ)</option>
                </select>
              </label>
            </div>
          ))}
          <button
            type="button"
            disabled={value.resources.length >= 100}
            onClick={() =>
              update('resources', [
                ...value.resources,
                {
                  title: '',
                  kind: 'RESOURCE',
                  viewer: 'LINK',
                  url: '',
                },
              ])
            }
            className="min-h-12 rounded-xl border border-brk-primary px-4 font-semibold text-brk-primary disabled:opacity-40"
          >
            + Thêm tài nguyên
          </button>
        </section>
      ) : null}
      <section className="space-y-3 border-t border-brk-outline pt-4">
        <h4 className="font-bold">
          {group === 'DIGITAL' ? 'Nội dung sản phẩm công khai' : 'Nội dung đồng hành công khai'}
        </h4>
        <p className="text-sm text-brk-muted">
          Giới thiệu các nội dung và quyền lợi để khách xem trước khi mua. Không nhập đường dẫn tài nguyên trả
          phí ở đây.
        </p>
        {value.agenda.map((item, index) => (
          <div key={index} className="rounded-xl border bg-white p-3">
            <label className="block text-sm">
              Tiêu đề mục
              <input
                maxLength={160}
                className={field}
                value={item.title}
                onChange={(e) =>
                  update(
                    'agenda',
                    value.agenda.map((entry, i) =>
                      i === index
                        ? {
                            ...entry,
                            title: e.target.value,
                          }
                        : entry,
                    ),
                  )
                }
              />
            </label>
            <label className="mt-3 block text-sm">
              Nội dung
              <textarea
                maxLength={2000}
                rows={3}
                className={field + ' py-3'}
                value={item.description}
                onChange={(e) =>
                  update(
                    'agenda',
                    value.agenda.map((entry, i) =>
                      i === index
                        ? {
                            ...entry,
                            description: e.target.value,
                          }
                        : entry,
                    ),
                  )
                }
              />
            </label>
            <button
              type="button"
              className="min-h-11 px-3 text-sm text-red-700"
              onClick={() =>
                update(
                  'agenda',
                  value.agenda.filter((_, i) => i !== index),
                )
              }
            >
              Xóa mục
            </button>
          </div>
        ))}
        <button
          type="button"
          disabled={value.agenda.length >= 30}
          className="min-h-12 rounded-xl border border-brk-primary px-4 font-semibold text-brk-primary disabled:opacity-40"
          onClick={() => update('agenda', [...value.agenda, { title: '', description: '' }])}
        >
          + Thêm mục giới thiệu
        </button>
      </section>
      <label className="block text-sm font-semibold">
        {group === 'DIGITAL' ? 'Hướng dẫn sau mua' : 'Chuẩn bị trước buổi hẹn'}
        <textarea
          rows={4}
          maxLength={5000}
          className={field + ' py-3'}
          value={value.instructions}
          onChange={(e) => update('instructions', e.target.value)}
        />
      </label>
      <p className="text-sm text-brk-muted">Hướng dẫn chỉ hiển thị sau khi quyền sử dụng được kích hoạt.</p>
    </section>
  )
}
