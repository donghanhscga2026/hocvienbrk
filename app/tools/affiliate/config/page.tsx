'use client'

/**
 * Cấu hình hoa hồng affiliate theo từng khóa học (Affiliate v2).
 * - ADMIN: tất cả khóa học. - TEACHER: chỉ khóa học của mình.
 * - Hoa hồng trực tiếp tối thiểu 10%.
 * - Khóa học đã khai giảng bị khóa chỉnh sửa với TEACHER (ADMIN vẫn sửa được).
 */
import { useEffect, useState } from 'react'

interface CourseConfig {
  id: number
  id_khoa: string
  name: string
  listedPrice: number
  startDate: string | null
  locked: boolean
  config: { directRate: number; isActive: boolean } | null
}

interface RerunChange {
  orderId: number
  kind: string
  affiliateId: number
  action: 'CREATE' | 'ADJUST' | 'REMOVE' | 'SKIP_SETTLED' | 'SKIP_CANCELLED'
  oldAmount?: number
  newAmount?: number
  percentage?: number
}

interface RerunReport {
  courseId: number
  dryRun: boolean
  ordersScanned: number
  ordersSkippedMultiCourse: number
  created: number
  createdAmount: number
  adjusted: number
  adjustedDelta: number
  removed: number
  removedAmount: number
  skippedSettled: number
  skippedCancelled: number
  netDelta: number
  changes: RerunChange[]
}

function formatDateVN(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export default function AffiliateConfigPage() {
  const [courses, setCourses] = useState<CourseConfig[]>([])
  const [role, setRole] = useState('')
  const [minRate, setMinRate] = useState(10)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<number | null>(null)
  const [msg, setMsg] = useState('')
  const [rerunFor, setRerunFor] = useState<CourseConfig | null>(null)
  const [rerunReport, setRerunReport] = useState<RerunReport | null>(null)
  const [rerunBusy, setRerunBusy] = useState<'preview' | 'apply' | null>(null)
  const [rerunError, setRerunError] = useState('')
  const [rerunApplied, setRerunApplied] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/affiliate/product-config')
      const data = await res.json()
      if (res.ok) {
        setCourses(data.courses || [])
        setRole(data.role || '')
        if (data.minDirectRate) setMinRate(data.minDirectRate)
      } else {
        setMsg(data.error || 'Không tải được dữ liệu')
      }
    } catch {
      setMsg('Lỗi kết nối')
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const save = async (courseId: number, directRate: number, isActive: boolean) => {
    if (!Number.isFinite(directRate) || directRate < minRate || directRate > 100) {
      setMsg(`Tỷ lệ hoa hồng trực tiếp phải từ ${minRate}% đến 100%`)
      return
    }
    setSaving(courseId)
    setMsg('')
    try {
      const res = await fetch('/api/affiliate/product-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productType: 'COURSE', productId: courseId, directRate, isActive })
      })
      const data = await res.json()
      if (data.success) {
        setMsg(`Đã lưu cấu hình khóa #${courseId}`)
        setCourses(cs => cs.map(c => c.id === courseId ? { ...c, config: data.config } : c))
      } else {
        setMsg(data.error || 'Lưu thất bại')
      }
    } catch {
      setMsg('Lỗi kết nối')
    }
    setSaving(null)
  }

  const callRerun = async (courseId: number, dryRun: boolean): Promise<RerunReport> => {
    const res = await fetch('/api/affiliate/rerun-commissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, dryRun })
    })
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.error || 'Thao tác thất bại')
    return data.report as RerunReport
  }

  const openRerun = async (course: CourseConfig) => {
    setRerunFor(course)
    setRerunReport(null)
    setRerunError('')
    setRerunApplied(false)
    setRerunBusy('preview')
    try {
      setRerunReport(await callRerun(course.id, true))
    } catch (e: any) {
      setRerunError(e?.message || 'Không tính được chênh lệch')
    }
    setRerunBusy(null)
  }

  const applyRerun = async () => {
    if (!rerunFor) return
    setRerunBusy('apply')
    setRerunError('')
    try {
      const report = await callRerun(rerunFor.id, false)
      setRerunReport(report)
      setRerunApplied(true)
    } catch (e: any) {
      setRerunError(e?.message || 'Áp dụng thất bại')
    }
    setRerunBusy(null)
  }

  const fmtMoney = (n: number) => `${n >= 0 ? '' : '−'}${Math.abs(n).toLocaleString('vi-VN')}đ`
  const missingConfig = courses.filter((c) => (c.listedPrice ?? 0) > 0 && !c.config)
  const hasChanges = !!rerunReport && (rerunReport.created + rerunReport.adjusted + rerunReport.removed > 0)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">Cấu hình hoa hồng theo khóa học</h1>
      <p className="text-sm text-gray-500 mb-6">
        Tỷ lệ hoa hồng <b>trực tiếp</b> (% trên giá niêm yết) cho từng khóa học, tối thiểu <b>{minRate}%</b>.
        {role === 'TEACHER' ? ' Bạn chỉ thấy các khóa học của mình.' : ' Áp dụng cho mọi đơn mua mới sau khi lưu.'}
      </p>

      {msg && <div className="mb-4 px-4 py-2 text-sm bg-blue-50 text-blue-700 rounded-xl">{msg}</div>}

      {!loading && missingConfig.length > 0 && (
        <div className="mb-4 px-4 py-3 text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-xl">
          ⚠️ <b>{missingConfig.length} khóa thu phí chưa có cấu hình hoa hồng</b> — CTV quảng bá các khóa này sẽ <b>không có hoa hồng trực tiếp</b>: {missingConfig.map((c) => c.name).join(', ')}. Hãy đặt tỷ lệ cho từng khóa ngay trong bảng bên dưới.
        </div>
      )}

      {loading ? (
        <p className="text-gray-400 italic">Đang tải...</p>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50/75 border-b border-gray-100">
                  <th className="px-3 py-2 text-left font-semibold text-gray-500">Khóa học</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-500">Giá niêm yết</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-500">Hoa hồng trực tiếp (%)</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-500">Bật</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-500"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {courses.map((c) => (
                  <ConfigRow key={c.id} course={c} minRate={minRate} saving={saving === c.id} onSave={save} onRerun={openRerun} />
                ))}
                {courses.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-10 text-center text-gray-400 italic">Chưa có khóa học nào</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {rerunFor && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => rerunBusy !== 'apply' && setRerunFor(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Chạy lại hoa hồng — {rerunFor.name}</h2>
              <p className="text-xs text-gray-500 mt-1">
                Tính lại toàn bộ giao dịch cũ của khóa này theo cấu hình hiện tại
                (trực tiếp {rerunFor.config ? `${rerunFor.config.directRate}%` : 'chưa cấu hình'}, tri ân theo hệ thống).
                Chỉ ảnh hưởng các dòng hoa hồng đang chờ đối soát; dòng đã chốt hoặc đã thu hồi được giữ nguyên.
              </p>
            </div>
            <div className="p-5">
              {rerunBusy === 'preview' && <p className="text-gray-400 italic text-sm">Đang tính chênh lệch...</p>}
              {rerunError && <div className="px-4 py-2 text-sm bg-red-50 text-red-700 rounded-xl mb-3">{rerunError}</div>}
              {rerunReport && (
                <>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="text-[11px] text-gray-400 font-semibold uppercase">Đơn đã quét</div>
                      <div className="font-bold text-gray-900">{rerunReport.ordersScanned}</div>
                      {rerunReport.ordersSkippedMultiCourse > 0 && (
                        <div className="text-[11px] text-gray-400">Bỏ qua {rerunReport.ordersSkippedMultiCourse} đơn chứa nhiều khóa</div>
                      )}
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="text-[11px] text-gray-400 font-semibold uppercase">Tổng thay đổi sổ ghi nhận</div>
                      <div className={`font-bold ${rerunReport.netDelta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtMoney(rerunReport.netDelta)}</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="text-[11px] text-gray-400 font-semibold uppercase">Tạo mới</div>
                      <div className="font-bold text-gray-900">{rerunReport.created} dòng · {fmtMoney(rerunReport.createdAmount)}</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="text-[11px] text-gray-400 font-semibold uppercase">Điều chỉnh</div>
                      <div className="font-bold text-gray-900">{rerunReport.adjusted} dòng · {fmtMoney(rerunReport.adjustedDelta)}</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="text-[11px] text-gray-400 font-semibold uppercase">Hủy (không còn đúng cấu hình)</div>
                      <div className="font-bold text-gray-900">{rerunReport.removed} dòng · {fmtMoney(-rerunReport.removedAmount)}</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="text-[11px] text-gray-400 font-semibold uppercase">Bỏ qua</div>
                      <div className="font-bold text-gray-900">{rerunReport.skippedSettled} đã chốt · {rerunReport.skippedCancelled} đã thu hồi</div>
                    </div>
                  </div>

                  {rerunReport.changes.length > 0 && (
                    <div className="mt-4 max-h-56 overflow-y-auto border border-gray-100 rounded-xl">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="bg-gray-50 text-gray-400">
                            <th className="px-2 py-1 text-left font-medium">Đơn</th>
                            <th className="px-2 py-1 text-left font-medium">Loại</th>
                            <th className="px-2 py-1 text-left font-medium">Người nhận</th>
                            <th className="px-2 py-1 text-left font-medium">Thay đổi</th>
                            <th className="px-2 py-1 text-right font-medium">Cũ</th>
                            <th className="px-2 py-1 text-right font-medium">Mới</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rerunReport.changes.slice(0, 100).map((ch, i) => (
                            <tr key={i} className="border-t border-gray-50">
                              <td className="px-2 py-1 text-gray-500">#{ch.orderId}</td>
                              <td className="px-2 py-1 text-gray-500">{ch.kind === 'DIRECT' ? 'Trực tiếp' : 'Tri ân'}</td>
                              <td className="px-2 py-1 text-gray-500">#{ch.affiliateId}</td>
                              <td className="px-2 py-1 font-semibold">
                                {ch.action === 'CREATE' && <span className="text-emerald-600">Tạo mới</span>}
                                {ch.action === 'ADJUST' && <span className="text-blue-600">Điều chỉnh</span>}
                                {ch.action === 'REMOVE' && <span className="text-red-600">Hủy</span>}
                                {ch.action === 'SKIP_SETTLED' && <span className="text-gray-400">Đã chốt — bỏ qua</span>}
                                {ch.action === 'SKIP_CANCELLED' && <span className="text-gray-400">Đã thu hồi — bỏ qua</span>}
                              </td>
                              <td className="px-2 py-1 text-right text-gray-500">{ch.oldAmount != null ? fmtMoney(ch.oldAmount) : '—'}</td>
                              <td className="px-2 py-1 text-right font-semibold text-gray-700">{ch.newAmount != null ? fmtMoney(ch.newAmount) : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {rerunReport.changes.length > 100 && (
                    <p className="text-[11px] text-gray-400 mt-2">Chỉ hiện 100 thay đổi đầu; tổng số nằm ở các ô thống kê phía trên.</p>
                  )}

                  {rerunApplied ? (
                    <div className="mt-4 px-4 py-2 text-sm bg-emerald-50 text-emerald-700 rounded-xl">
                      Đã áp dụng xong. Chạy lại lần nữa với cùng cấu hình sẽ cho chênh lệch 0.
                    </div>
                  ) : (
                    !hasChanges && rerunBusy !== 'preview' && (
                      <div className="mt-4 px-4 py-2 text-sm bg-gray-50 text-gray-500 rounded-xl">
                        Không có chênh lệch nào — số liệu hiện tại đã khớp cấu hình.
                      </div>
                    )
                  )}
                </>
              )}
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => setRerunFor(null)}
                disabled={rerunBusy === 'apply'}
                className="px-4 py-2 text-sm font-semibold bg-white border border-gray-300 text-gray-700 rounded-xl disabled:opacity-50"
              >
                Đóng
              </button>
              {!rerunApplied && (
                <button
                  onClick={applyRerun}
                  disabled={!hasChanges || rerunBusy !== null}
                  className="px-4 py-2 text-sm font-semibold bg-gray-900 text-white rounded-xl disabled:opacity-50"
                >
                  {rerunBusy === 'apply' ? 'Đang áp dụng...' : 'Áp dụng chạy lại'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <p className="text-[11px] text-gray-400 mt-4">
        * Hoa hồng trực tiếp tối thiểu {minRate}%. Hoa hồng gián tiếp (tri ân) cố định 2% toàn hệ thống
        cho người giới thiệu đầu tiên — không cấu hình theo từng khóa học.
        Khóa học đã khai giảng sẽ bị khóa cấu hình đối với giảng viên (quản trị viên vẫn chỉnh được khi cần xử lý ngoại lệ).
        Khóa chưa có cấu hình riêng sẽ không sinh hoa hồng trực tiếp.
        Nút "Chạy lại HH" tính lại toàn bộ giao dịch cũ của khóa theo cấu hình hiện tại (có xem trước chênh lệch rồi mới áp dụng) —
        phục vụ giai đoạn test; sau giai đoạn test chỉ quản trị viên dùng được.
      </p>
    </div>
  )
}

function ConfigRow({ course, minRate, saving, onSave, onRerun }: {
  course: CourseConfig
  minRate: number
  saving: boolean
  onSave: (id: number, rate: number, active: boolean) => void
  onRerun: (course: CourseConfig) => void
}) {
  const [rate, setRate] = useState<string>(course.config ? String(course.config.directRate) : String(minRate))
  const [active, setActive] = useState<boolean>(course.config ? course.config.isActive : true)
  const locked = course.locked

  return (
    <tr className="hover:bg-gray-50/50">
      <td className="px-3 py-2">
        <div className="font-semibold text-gray-800">{course.name}</div>
        <div className="text-[10px] text-gray-400 font-mono">{course.id_khoa} · #{course.id}</div>
        {course.startDate && (
          <div className="text-[10px] text-gray-400">Khai giảng: {formatDateVN(course.startDate)}</div>
        )}
        {locked && (
          <div className="text-[10px] font-semibold text-amber-600">🔒 Đã khai giảng — đã khóa cấu hình</div>
        )}
      </td>
      <td className="px-3 py-2 text-right text-gray-600">{course.listedPrice.toLocaleString('vi-VN')}đ</td>
      <td className="px-3 py-2 text-right">
        <input type="number" min={minRate} max={100} step={0.5} value={rate} disabled={locked}
          onChange={e => setRate(e.target.value)}
          className="w-20 px-2 py-1 text-right border border-gray-200 rounded-lg disabled:bg-gray-100 disabled:text-gray-400" />
      </td>
      <td className="px-3 py-2 text-center">
        <input type="checkbox" checked={active} disabled={locked} onChange={e => setActive(e.target.checked)} className="w-4 h-4" />
      </td>
      <td className="px-3 py-2 text-center whitespace-nowrap">
        <button disabled={saving || locked}
          onClick={() => onSave(course.id, Number(rate), active)}
          className="px-3 py-1 text-xs bg-gray-900 text-white rounded-lg disabled:opacity-50">
          {locked ? 'Đã khóa' : saving ? 'Đang lưu...' : 'Lưu'}
        </button>
        <button
          onClick={() => onRerun(course)}
          title="Tính lại hoa hồng cho toàn bộ giao dịch cũ của khóa này theo cấu hình hiện tại"
          className="ml-2 px-3 py-1 text-xs bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
          Chạy lại HH
        </button>
      </td>
    </tr>
  )
}
