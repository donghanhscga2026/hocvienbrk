'use client'
import OfferingWorkspaceFields from './OfferingWorkspaceFields'
import OfferingComboFields from './OfferingComboFields'
import OfferingResourceEditor, { type ExistingOfferingContent } from './OfferingResourceEditor'
import { offeringKinds, type OfferingDetails, type ProductGroup } from '@/lib/offerings/shared'

export type OfferingAdminSection = 'all' | 'info' | 'sales' | 'resources' | 'pricing'
export default function OfferingFields({
  group,
  value,
  onChange,
  courseId,
  teacherId,
  section = 'all',
  existing,
  onEditExisting,
}: {
  group: ProductGroup
  value: OfferingDetails
  onChange: (value: OfferingDetails) => void
  courseId?: string
  teacherId?: string
  section?: OfferingAdminSection
  existing?: ExistingOfferingContent[]
  onEditExisting?: (item: ExistingOfferingContent) => void
}) {
  if (group === 'COURSE') return null
  const update = <K extends keyof OfferingDetails>(key: K, next: OfferingDetails[K]) =>
    onChange({ ...value, [key]: next })
  const show = (part: OfferingAdminSection) => section === 'all' || section === part
  const field = 'mt-2 min-h-12 w-full rounded-xl border border-brk-outline bg-white px-3 text-base'
  const kinds =
    group === 'DIGITAL'
      ? (['COMBO', 'APP', 'EBOOK', 'TEMPLATE', 'RESOURCE', 'OTHER'] as const)
      : (['COACHING', 'CONSULTING', 'IMPLEMENTATION', 'OTHER'] as const)
  return (
    <div className="space-y-6">
      <section
        hidden={!show('info')}
        data-offering-section="info"
        className="space-y-4 rounded-2xl border bg-white p-5"
      >
        <h3 className="text-xl font-bold text-green-950">
          {group === 'DIGITAL' ? 'Loại sản phẩm' : 'Loại dịch vụ'}
        </h3>
        <label className="block font-semibold">
          Loại
          <select
            aria-label="Loại sản phẩm hoặc dịch vụ"
            value={value.kind}
            onChange={(event) =>
              onChange({
                ...value,
                kind: event.target.value as OfferingDetails['kind'],
                ...(event.target.value === 'COMBO'
                  ? { accessDays: 0, workspaceLayout: 'AUTO' as const }
                  : {}),
              })
            }
            className={field}
          >
            {kinds.map((kind) => (
              <option key={kind} value={kind}>
                {offeringKinds[kind]}
              </option>
            ))}
          </select>
        </label>
        <p className="text-sm leading-7 text-brk-muted">
          {group === 'DIGITAL'
            ? 'Bộ tài nguyên chứa nhiều video, PDF và App trong cùng một bộ. Combo ghép các khóa học, sản phẩm hoặc dịch vụ đã tạo riêng.'
            : 'Coaching / Tư vấn phù hợp dịch vụ theo buổi. Hỗ trợ triển khai phù hợp công việc có tiến độ và bàn giao.'}
        </p>
      </section>
      <section
        hidden={!show('sales')}
        data-offering-section="sales"
        className="space-y-5 rounded-2xl border border-green-200 bg-green-50 p-5"
      >
        <h3 className="text-xl font-bold text-green-950">Trang giới thiệu · Khách chưa mua xem được</h3>
        <OfferingWorkspaceFields
          value={value}
          onChange={onChange}
          group={group}
          courseId={courseId}
          section="sales"
        />
        {group === 'DIGITAL' && (
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ['format', 'Bao gồm / định dạng'],
                ['platform', 'Nền tảng tương thích'],
                ['language', 'Ngôn ngữ'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block text-sm font-semibold">
                {label}
                <input
                  maxLength={key === 'language' ? 80 : 160}
                  value={value[key]}
                  onChange={(event) => update(key, event.target.value)}
                  className={field}
                />
              </label>
            ))}
          </div>
        )}
        <label className="block font-semibold">
          {group === 'DIGITAL' ? 'Bạn nhận được gì?' : 'Kết quả hướng đến'}
          <textarea
            rows={4}
            value={value.benefits.join('\n')}
            onChange={(event) => update('benefits', event.target.value.split('\n').slice(0, 6))}
            placeholder="Mỗi dòng một quyền lợi, tối đa 6 dòng."
            className={field + ' py-3'}
          />
        </label>
        <h4 className="font-bold">
          {group === 'DIGITAL' ? 'Nội dung sản phẩm công khai' : 'Nội dung đồng hành công khai'}
        </h4>
        <p className="text-sm leading-7 text-brk-muted">
          Giới thiệu khách sẽ nhận được những gì. Link tài nguyên trả phí và hướng dẫn riêng đặt tại Nội dung
          sử dụng.
        </p>
        {value.agenda.map((item, index) => (
          <div key={index} className="space-y-3 rounded-xl border bg-white p-4">
            <label className="block text-sm font-semibold">
              Tiêu đề mục
              <input
                maxLength={160}
                value={item.title}
                onChange={(event) =>
                  update(
                    'agenda',
                    value.agenda.map((entry, i) =>
                      i === index ? { ...entry, title: event.target.value } : entry,
                    ),
                  )
                }
                className={field}
              />
            </label>
            <label className="block text-sm font-semibold">
              Nội dung giới thiệu
              <textarea
                rows={3}
                maxLength={2000}
                value={item.description}
                onChange={(event) =>
                  update(
                    'agenda',
                    value.agenda.map((entry, i) =>
                      i === index ? { ...entry, description: event.target.value } : entry,
                    ),
                  )
                }
                className={field + ' py-3'}
              />
            </label>
            <button
              type="button"
              onClick={() =>
                update(
                  'agenda',
                  value.agenda.filter((_, i) => i !== index),
                )
              }
              className="min-h-11 px-3 text-red-700"
            >
              Xóa mục
            </button>
          </div>
        ))}
        <button
          type="button"
          disabled={value.agenda.length >= 30}
          onClick={() => update('agenda', [...value.agenda, { title: '', description: '' }])}
          className="min-h-12 rounded-xl border border-brk-primary px-4 font-semibold text-brk-primary disabled:opacity-40"
        >
          + Thêm mục giới thiệu
        </button>
      </section>
      <section hidden={!show('resources')} data-offering-section="resources" className="space-y-6">
        <OfferingWorkspaceFields
          value={value}
          onChange={onChange}
          group={group}
          courseId={courseId}
          section="workspace"
        />
        {value.kind === 'COMBO' && (
          <OfferingComboFields value={value} onChange={onChange} courseId={courseId} teacherId={teacherId} />
        )}
        <div className="space-y-4 rounded-2xl border bg-white p-5">
          <h3 className="text-lg font-bold">
            {group === 'DIGITAL' ? 'Nguồn chính & Hướng dẫn chung' : 'Hướng dẫn chuẩn bị chung'}
          </h3>
          {group === 'DIGITAL' && (
            <label className="block font-semibold">
              Nguồn App / tài liệu xem trực tiếp
              <input
                maxLength={2000}
                value={value.accessUrl}
                onChange={(event) => update('accessUrl', event.target.value)}
                placeholder="Để trống nếu nhập nguồn theo từng tài nguyên"
                className={field}
              />
            </label>
          )}
          <label className="block font-semibold">
            {group === 'DIGITAL' ? 'Hướng dẫn sau mua' : 'Chuẩn bị trước buổi hẹn'}
            <textarea
              maxLength={5000}
              rows={5}
              value={value.instructions}
              onChange={(event) => update('instructions', event.target.value)}
              className={field + ' py-3'}
            />
          </label>
          <p className="text-sm leading-7 text-brk-muted">
            Chỉ hiện khi khách đã kích hoạt. Hướng dẫn của từng món được nhập riêng trong thư viện bên dưới.
          </p>
        </div>
        <OfferingResourceEditor
          resources={value.resources}
          onChange={(resources) => update('resources', resources)}
          existing={existing}
          onEditExisting={onEditExisting}
        />
      </section>
      <section
        hidden={!show('pricing')}
        data-offering-section="pricing"
        className="space-y-4 rounded-2xl border bg-white p-5"
      >
        <h3 className="text-xl font-bold text-green-950">Quyền lợi sử dụng</h3>
        {group === 'DIGITAL' ? (
          <>
            <label className="block font-semibold">
              Thời hạn sử dụng (ngày)
              <input
                type="number"
                min={0}
                max={36500}
                disabled={value.kind === 'COMBO'}
                value={value.accessDays}
                onChange={(event) => update('accessDays', Number(event.target.value))}
                className={field}
              />
            </label>
            <p className="text-sm leading-7 text-brk-muted">
              {value.kind === 'COMBO'
                ? 'Combo kế thừa thời hạn và số buổi từng món, không đặt hạn chung.'
                : '0 = không giới hạn. Thời hạn bắt đầu từ khi quyền sử dụng được kích hoạt.'}
            </p>
            <label className="block font-semibold">
              Cách sử dụng
              <select
                value={value.delivery}
                onChange={(event) => update('delivery', event.target.value as OfferingDetails['delivery'])}
                className={field}
              >
                <option value="ONLINE">Trực tuyến</option>
                <option value="DOWNLOAD">Tải về</option>
                <option value="BOTH">Trực tuyến / tải về</option>
              </select>
            </label>
          </>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="font-semibold">
                Số buổi
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={value.sessions}
                  onChange={(event) => update('sessions', Number(event.target.value))}
                  className={field}
                />
              </label>
              <label className="font-semibold">
                Phút mỗi buổi
                <input
                  type="number"
                  min={5}
                  max={1440}
                  value={value.durationMin}
                  onChange={(event) => update('durationMin', Number(event.target.value))}
                  className={field}
                />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="font-semibold">
                Hình thức
                <select
                  value={value.mode}
                  onChange={(event) => update('mode', event.target.value as OfferingDetails['mode'])}
                  className={field}
                >
                  <option value="ONLINE">Online</option>
                  <option value="OFFLINE">Trực tiếp</option>
                  <option value="HYBRID">Kết hợp</option>
                </select>
              </label>
              <label className="font-semibold">
                Kiểu đồng hành
                <select
                  value={value.audience}
                  onChange={(event) => update('audience', event.target.value as OfferingDetails['audience'])}
                  className={field}
                >
                  <option value="INDIVIDUAL">1:1</option>
                  <option value="GROUP">Theo nhóm</option>
                </select>
              </label>
            </div>
            <label className="block font-semibold">
              Mã lịch hẹn đã tạo
              <input
                maxLength={100}
                pattern="[a-zA-Z0-9_-]*"
                value={value.bookingCode}
                onChange={(event) => update('bookingCode', event.target.value)}
                placeholder="Mã lịch của đúng chuyên gia, không phải link Zoom"
                className={field}
              />
            </label>
            <p className="text-sm leading-7 text-brk-muted">
              Để trống nếu tiếp nhận qua Yêu cầu của tôi. Chỉ gắn lịch đang hoạt động của người phụ trách dịch
              vụ.
            </p>
          </>
        )}
      </section>
    </div>
  )
}
