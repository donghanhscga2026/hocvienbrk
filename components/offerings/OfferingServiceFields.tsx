'use client'
import { useState } from 'react'
import { effectiveService, serviceModels, serviceFacts, type ServiceConfig } from '@/lib/offerings/service'
import type { OfferingDetails } from '@/lib/offerings/shared'

export default function OfferingServiceFields({
  value,
  onChange,
  children,
}: {
  value: OfferingDetails
  onChange: (value: OfferingDetails) => void
  children: React.ReactNode
}) {
  const config = effectiveService(value)
  const [templateName, setTemplateName] = useState('')
  const [templates, setTemplates] = useState<{ id: string; name: string; config: ServiceConfig }[]>([])
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const field = 'mt-2 min-h-12 w-full rounded-xl border bg-white px-3 text-base'
  const button = 'min-h-11 rounded-xl border px-3 font-semibold text-brk-primary disabled:opacity-40'
  function update(patch: Partial<ServiceConfig>) {
    onChange({ ...value, service: { ...config, ...patch } })
  }
  const has = (model: keyof typeof serviceModels) =>
    config.model === model || (config.model === 'HYBRID' && config.blocks.includes(model as 'PROJECT'))
  async function template(action: 'load' | 'save') {
    if (busy) return
    setBusy(true)
    setNotice('')
    try {
      const response = await fetch(
        '/api/offerings/service-templates',
        action === 'load'
          ? { cache: 'no-store' }
          : {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: templateName, config }),
            },
      )
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Không xử lý được mẫu.')
      setTemplates(data.templates)
      setNotice(
        action === 'load' ? 'Đã tải mẫu của tài khoản phụ trách.' : 'Đã lưu mẫu để dùng cho dịch vụ khác.',
      )
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Mất kết nối.')
    } finally {
      setBusy(false)
    }
  }
  const questionsEditor = (
    <details className="space-y-3 border-t pt-4">
      <summary className="min-h-12 cursor-pointer text-lg font-bold">
        Câu hỏi khách cần trả lời · Không bắt buộc ({config.questions.length})
      </summary>
      <p className="text-sm text-brk-muted">
        {config.saleMode === 'QUOTE'
          ? 'Câu trả lời được gửi cùng yêu cầu tư vấn vào CRM để người phụ trách trao đổi và báo giá.'
          : 'Câu trả lời được lưu riêng theo khách trong Vận hành.'}{' '}
        Tài liệu dùng link HTTPS có cấp quyền phù hợp, chưa tải tệp trực tiếp lên đây.
      </p>
      {config.questions.map((q, index) => (
        <fieldset key={q.id} className="space-y-3 rounded-xl border p-4">
          <legend> Câu hỏi {index + 1}</legend>
          <label className="block">
            Câu hỏi
            <input
              aria-label={`Câu hỏi ${index + 1}`}
              maxLength={200}
              value={q.label}
              onChange={(event) =>
                update({
                  questions: config.questions.map((item) =>
                    item.id === q.id ? { ...item, label: event.target.value } : item,
                  ),
                })
              }
              className={field}
            />
          </label>
          <label className="block">
            Loại trả lời
            <select
              value={q.type}
              onChange={(event) =>
                update({
                  questions: config.questions.map((item) =>
                    item.id === q.id ? { ...item, type: event.target.value as typeof q.type } : item,
                  ),
                })
              }
              className={field}
            >
              <option value="TEXT">Văn bản</option>
              <option value="SELECT">Lựa chọn</option>
              <option value="LINK">Liên kết tài liệu</option>
            </select>
          </label>
          {q.type === 'SELECT' && (
            <label className="block">
              Các lựa chọn, mỗi dòng một mục
              <textarea
                value={q.options.join('\n')}
                onChange={(event) =>
                  update({
                    questions: config.questions.map((item) =>
                      item.id === q.id
                        ? { ...item, options: event.target.value.split('\n').slice(0, 20) }
                        : item,
                    ),
                  })
                }
                className={field + ' py-3'}
              />
            </label>
          )}
          <label className="flex min-h-11 items-center gap-2">
            <input
              type="checkbox"
              checked={q.required}
              onChange={(event) =>
                update({
                  questions: config.questions.map((item) =>
                    item.id === q.id ? { ...item, required: event.target.checked } : item,
                  ),
                })
              }
            />
            Bắt buộc
          </label>
          <button
            type="button"
            className={button}
            onClick={() => update({ questions: config.questions.filter((item) => item.id !== q.id) })}
          >
            Xóa câu hỏi
          </button>
        </fieldset>
      ))}
      <button
        type="button"
        className={button}
        disabled={config.questions.length >= 20}
        onClick={() =>
          update({
            questions: [
              ...config.questions,
              {
                id: crypto.randomUUID(),
                label: 'Nhu cầu cần hỗ trợ',
                type: 'TEXT',
                required: false,
                options: [],
              },
            ],
          })
        }
      >
        + Thêm câu hỏi
      </button>
    </details>
  )
  const modePicker = (
    <fieldset className="grid gap-3 sm:grid-cols-2">
      <legend className="mb-3 font-bold">Bạn cung cấp dịch vụ theo cách nào?</legend>
      {(
        [
          ['QUOTE', 'Theo nhu cầu · Báo giá riêng', 'Tư vấn từng khách rồi thống nhất công việc và chi phí.'],
          ['PACKAGE', 'Gói dịch vụ có sẵn', 'Có phạm vi và giá xác định trước.'],
        ] as const
      ).map(([mode, label, help]) => (
        <label
          key={mode}
          className={
            'flex cursor-pointer items-start gap-3 rounded-xl border p-4 ' +
            (config.saleMode === mode ? 'border-green-600 bg-green-50' : 'bg-white')
          }
        >
          <input
            type="radio"
            name="service-sale-mode"
            value={mode}
            checked={config.saleMode === mode}
            onChange={() => update({ saleMode: mode })}
          />
          <span>
            <strong className="block">{label}</strong>
            <span className="mt-2 block text-sm text-brk-muted">{help}</span>
          </span>
        </label>
      ))}
    </fieldset>
  )
  if (config.saleMode === 'QUOTE')
    return (
      <section className="space-y-5">
        {modePicker}
        <h3 className="text-xl font-bold">Dịch vụ theo nhu cầu</h3>
        <p className="rounded-xl bg-green-50 p-4">
          Giá hiển thị: <strong>Liên hệ báo giá</strong>. Khách gửi nhu cầu trước; chưa cần mua hoặc kích
          hoạt. Phạm vi, chi phí và điều khoản sẽ thống nhất riêng sau tư vấn.
        </p>
        <label className="block font-semibold">
          Loại dịch vụ
          <input
            aria-label="Ngành dịch vụ"
            value={config.category}
            maxLength={120}
            placeholder="Thiết kế website, Kế toán, Marketing…"
            onChange={(event) => update({ category: event.target.value })}
            className={field}
          />
        </label>
        <p className="text-sm text-brk-muted">
          Tên dịch vụ đặt tại Thông tin; mô tả và ảnh tại Trang giới thiệu. Không cần nhập số buổi, thời hạn
          hay điều khoản lúc này.
        </p>
        <h4 className="font-bold">Bạn muốn hỏi khách điều gì?</h4>
        <div className="space-y-2">
          {[
            ['purpose', 'Bạn cần dịch vụ để làm gì?'],
            ['features', 'Những yêu cầu hoặc chức năng bạn mong muốn?'],
            ['budget', 'Ngân sách dự kiến (không bắt buộc)'],
          ].map(([id, label]) => (
            <label key={id} className="flex min-h-12 items-center gap-3 rounded-xl border p-3">
              <input
                type="checkbox"
                checked={config.questions.some((q) => q.id === id)}
                onChange={(event) =>
                  update({
                    questions: event.target.checked
                      ? [...config.questions, { id, label, type: 'TEXT', required: false, options: [] }]
                      : config.questions.filter((q) => q.id !== id),
                  })
                }
              />
              {label}
            </label>
          ))}
        </div>
        {questionsEditor}
        <p className="text-sm text-brk-muted">
          Yêu cầu gửi vào CRM của người phụ trách dịch vụ. Khách đăng nhập để gửi và theo dõi; không cần đăng
          ký mua.
        </p>
      </section>
    )
  return (
    <section className="space-y-5">
      {modePicker}
      <h3 className="text-xl font-bold text-green-950">Phạm vi & cách cung cấp dịch vụ</h3>
      <div className="space-y-3 rounded-xl bg-green-50 p-4">
        <h4 className="font-bold">Chưa biết bắt đầu từ đâu?</h4>
        <p className="text-sm leading-6">
          Với dịch vụ làm website, chọn mẫu dưới đây rồi sửa nội dung theo gói của bạn. Mọi con số trong mẫu
          đều là minh họa, cần kiểm tra trước khi công khai.
        </p>
        <button
          type="button"
          className={button}
          onClick={() => {
            if (
              window.confirm(
                'Điền mẫu minh họa sẽ thay phạm vi, thời gian, số vòng sửa và bảo hành đang nhập. Giữ nguyên thông tin riêng và câu hỏi. Tiếp tục?',
              )
            ) {
              onChange({
                ...value,
                service: {
                  ...config,
                  model: 'PROJECT',
                  category: 'Thiết kế website',
                  scope: 'Thiết kế giao diện, xây dựng website và cài đặt các chức năng đã thống nhất.',
                  deliverables: '01 website hoàn chỉnh và tài khoản quản trị.',
                  inputs: 'Logo, nội dung giới thiệu, hình ảnh và thông tin liên hệ.',
                  startCondition: 'Sau khi nhận đủ nội dung và xác nhận thanh toán theo thỏa thuận.',
                  turnaround: '14 ngày làm việc từ khi nhận đủ thông tin.',
                  revisions: 2,
                  warranty: '30 ngày sau bàn giao.',
                  extraSessions: false,
                },
                workspaceLayout: 'DELIVERY',
                modules: [
                  ...new Set<OfferingDetails['modules'][number]>([
                    ...value.modules.filter((module) => module !== 'bookings'),
                    'delivery',
                    'conversation',
                  ]),
                ],
              })
              setNotice('Đã điền mẫu minh họa. Kiểm tra, sửa thông tin và bấm Lưu thay đổi của dịch vụ.')
            }
          }}
        >
          Điền mẫu thiết kế website
        </button>
      </div>
      {notice && (
        <p role="status" className="text-green-800">
          {notice}
        </p>
      )}
      <label className="block font-semibold">
        Ngành / loại dịch vụ
        <input
          aria-label="Ngành dịch vụ"
          list="service-categories"
          maxLength={120}
          value={config.category}
          onChange={(event) => update({ category: event.target.value })}
          className={field}
          placeholder="Kế toán, Thiết kế website, Coaching…"
        />
        <datalist id="service-categories">
          {[
            'Kế toán',
            'Thiết kế',
            'Công nghệ & AI',
            'Coaching',
            'Tư vấn',
            'Bảo trì',
            'Đào tạo',
            'Marketing',
          ].map((label) => (
            <option key={label} value={label} />
          ))}
        </datalist>
      </label>
      <label className="block font-semibold">
        Cách cung cấp
        <select
          aria-label="Cách cung cấp dịch vụ"
          value={config.model}
          onChange={(event) => update({ model: event.target.value as ServiceConfig['model'] })}
          className={field}
        >
          {Object.entries(serviceModels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <p className="text-sm leading-6 text-brk-muted">
        Ngành dùng để mô tả dịch vụ; cách cung cấp quyết định các trường cần điền. Đổi mẫu không xóa thông tin
        đã nhập. Khối lượng, chu kỳ và thời gian phản hồi là phạm vi cam kết, chưa tự tính phí hay trừ lượt.
      </p>
      {config.model === 'HYBRID' && (
        <fieldset className="flex flex-wrap gap-3">
          <legend className="mb-2 font-semibold">Chọn các phần trong gói</legend>
          {(['SESSIONS', 'PROJECT', 'QUANTITY', 'RECURRING'] as const).map((key) => (
            <label key={key} className="flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                checked={config.blocks.includes(key)}
                onChange={(event) =>
                  update({
                    blocks: event.target.checked
                      ? [...config.blocks, key]
                      : config.blocks.filter((item) => item !== key),
                  })
                }
              />
              {serviceModels[key]}
            </label>
          ))}
        </fieldset>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {(
          [
            ['scope', 'Phạm vi công việc'],
            ['deliverables', 'Kết quả / sản phẩm bàn giao'],
            ['inputs', 'Khách cần cung cấp'],
            ['startCondition', 'Điều kiện bắt đầu'],
            ['exclusions', 'Ngoài phạm vi / phát sinh'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block font-semibold">
            {label}
            <textarea
              aria-label={label}
              rows={3}
              maxLength={key === 'scope' ? 3000 : key === 'startCondition' ? 1000 : 2000}
              value={config[key]}
              onChange={(event) => update({ [key]: event.target.value })}
              className={field + ' py-3'}
            />
          </label>
        ))}
        {(has('PROJECT') || has('QUANTITY')) && (
          <>
            <label className="block font-semibold">
              Thời gian thực hiện
              <input
                aria-label="Thời gian thực hiện"
                value={config.turnaround}
                maxLength={200}
                onChange={(event) => update({ turnaround: event.target.value })}
                placeholder="14 ngày làm việc, tính từ khi nhận đủ đầu vào"
                className={field}
              />
            </label>
            <label className="block font-semibold">
              Số vòng chỉnh sửa
              <input
                type="number"
                min={0}
                max={1000}
                value={config.revisions}
                onChange={(event) => update({ revisions: Number(event.target.value) })}
                className={field}
              />
            </label>
            <label className="block font-semibold">
              Bảo hành
              <input
                value={config.warranty}
                maxLength={200}
                onChange={(event) => update({ warranty: event.target.value })}
                placeholder="30 ngày sau bàn giao"
                className={field}
              />
            </label>
          </>
        )}
        {(has('QUANTITY') || has('RECURRING')) && (
          <>
            <label className="block font-semibold">
              Khối lượng bao gồm
              <input
                aria-label="Khối lượng bao gồm"
                type="number"
                min={1}
                max={1000000}
                value={config.quantity}
                onChange={(event) => update({ quantity: Number(event.target.value) })}
                className={field}
              />
            </label>
            <label className="block font-semibold">
              Đơn vị tính
              <input
                aria-label="Đơn vị tính"
                value={config.unit}
                maxLength={120}
                onChange={(event) => update({ unit: event.target.value })}
                placeholder="Chứng từ / tháng, ảnh, giờ hỗ trợ…"
                className={field}
              />
            </label>
          </>
        )}
        {has('RECURRING') && (
          <>
            {(
              [
                ['cycle', 'Chu kỳ cung cấp'],
                ['term', 'Thời hạn gói'],
                ['responseTime', 'Thời gian phản hồi'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block font-semibold">
                {label}
                <input
                  aria-label={label}
                  value={config[key]}
                  maxLength={key === 'cycle' ? 120 : 200}
                  onChange={(event) => update({ [key]: event.target.value })}
                  className={field}
                />
              </label>
            ))}
          </>
        )}
      </div>
      {!has('SESSIONS') && (
        <label className="flex min-h-12 items-center gap-3">
          <input
            type="checkbox"
            checked={config.extraSessions}
            onChange={(event) => update({ extraSessions: event.target.checked })}
          />
          Bổ sung buổi tư vấn / hướng dẫn bàn giao
        </label>
      )}
      <div hidden={!has('SESSIONS') && !config.extraSessions}>{children}</div>
      <details className="space-y-3 border-t pt-4">
        <summary className="min-h-12 cursor-pointer text-lg font-bold">
          Thông tin bổ sung · Không bắt buộc ({config.fields.length})
        </summary>
        {config.fields.map((item, index) => (
          <div key={index} className="grid gap-3 rounded-xl border p-3 sm:grid-cols-2">
            <label>
              Tên thông tin
              <input
                aria-label={`Tên thông tin ${index + 1}`}
                value={item.label}
                maxLength={120}
                onChange={(event) =>
                  update({
                    fields: config.fields.map((entry, i) =>
                      i === index ? { ...entry, label: event.target.value } : entry,
                    ),
                  })
                }
                className={field}
              />
            </label>
            <label>
              Nội dung
              <input
                value={item.value}
                maxLength={1000}
                onChange={(event) =>
                  update({
                    fields: config.fields.map((entry, i) =>
                      i === index ? { ...entry, value: event.target.value } : entry,
                    ),
                  })
                }
                className={field}
              />
            </label>
            <label className="flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                checked={item.public}
                onChange={(event) =>
                  update({
                    fields: config.fields.map((entry, i) =>
                      i === index ? { ...entry, public: event.target.checked } : entry,
                    ),
                  })
                }
              />
              Hiển thị cho khách
            </label>
            <button
              type="button"
              className={button}
              onClick={() => update({ fields: config.fields.filter((_, i) => i !== index) })}
            >
              Xóa thông tin
            </button>
          </div>
        ))}
        <button
          type="button"
          className={button}
          disabled={config.fields.length >= 20}
          onClick={() =>
            update({ fields: [...config.fields, { label: 'Thông tin bổ sung', value: '', public: true }] })
          }
        >
          + Thêm thông tin
        </button>
      </details>
      {questionsEditor}
      <details className="space-y-4 rounded-xl border p-4">
        <summary className="min-h-11 cursor-pointer font-semibold">
          Tùy chỉnh thêm · Bố cục & mẫu dùng lại
        </summary>
        <button
          type="button"
          className={button}
          onClick={() =>
            onChange({
              ...value,
              service: config,
              workspaceLayout: has('SESSIONS') ? 'SESSIONS' : 'DELIVERY',
              modules: [
                ...new Set<OfferingDetails['modules'][number]>([
                  'resources',
                  'instructions',
                  'conversation',
                  ...(has('SESSIONS') || config.extraSessions ? ['bookings' as const] : []),
                  ...(!has('SESSIONS') ? ['delivery' as const] : []),
                ]),
              ],
            })
          }
        >
          Áp dụng bố cục gợi ý
        </button>
        <p className="text-sm text-brk-muted">
          Chỉ đổi bố cục khi bấm nút này. Bạn vẫn chỉnh từng mục tại Nội dung sử dụng.
        </p>
        <label className="block">
          Tên mẫu
          <input
            maxLength={120}
            value={templateName}
            onChange={(event) => setTemplateName(event.target.value)}
            className={field}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={button}
            disabled={busy || !templateName.trim()}
            onClick={() => template('save')}
          >
            Lưu thành mẫu của tôi
          </button>
          <button type="button" className={button} disabled={busy} onClick={() => template('load')}>
            Tải mẫu của tôi
          </button>
        </div>
        {notice && <p role="status">{notice}</p>}
        {templates.map((item) => (
          <button
            key={item.id}
            type="button"
            className={button}
            onClick={() => {
              if (window.confirm('Áp dụng mẫu sẽ thay cấu hình phạm vi và câu hỏi đang nhập. Tiếp tục?'))
                update(item.config)
            }}
          >
            {item.name}
          </button>
        ))}
      </details>
      <aside className="rounded-xl bg-green-50 p-4">
        <h4 className="font-bold">Khách sẽ thấy · Xem thử</h4>
        <dl>
          {serviceFacts(config).map(([label, text], index) => (
            <div key={index} className="border-b py-2">
              <dt className="text-sm text-brk-muted">{label}</dt>
              <dd className="whitespace-pre-wrap">{text}</dd>
            </div>
          ))}
        </dl>
      </aside>
    </section>
  )
}
