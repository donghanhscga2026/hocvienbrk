'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { getAutoVerifyConfigs, getCoursesWithoutAutoVerify, upsertAutoVerifyConfig, deleteAutoVerifyConfig, AutoVerifyConfigInput } from '@/app/actions/auto-verify-actions'
import { ArrowLeft, CheckCircle, AlertCircle, Plus, Pencil, Trash2, X } from 'lucide-react'
import MainHeader from '@/components/layout/MainHeader'

interface ConfigRow {
  id: number
  courseId: number
  emailFrom: string
  emailQuery: string
  bankName: string
  enabled: boolean
  alternativeCodes: string | null
  course: {
    id: number
    id_khoa: string
    name_lop: string
    phi_coc: number
    teacher: { id: number; name: string | null } | null
    teacherBankAccount: { id: number; accountHolder: string; accountNumber: string; bankName: string | null } | null
  }
}

interface CourseOption {
  id: number
  id_khoa: string
  name_lop: string
  phi_coc: number
  teacher: { id: number; name: string | null } | null
  teacherBankAccount: { id: number; accountHolder: string; accountNumber: string; bankName: string | null } | null
}

const emptyForm = { courseId: 0, emailFrom: '', emailQuery: '', bankName: '', enabled: false, alternativeCodes: '' }

export default function AutoVerifyAdminPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'

  const [configs, setConfigs] = useState<ConfigRow[]>([])
  const [courses, setCourses] = useState<CourseOption[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<ConfigRow | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err', text: string } | null>(null)

  async function loadData() {
    setLoading(true)
    const [r1, r2] = await Promise.all([getAutoVerifyConfigs(), getCoursesWithoutAutoVerify()])
    if (r1.success) setConfigs(r1.configs as unknown as ConfigRow[])
    else setMessage({ type: 'err', text: r1.error || 'Không tải được cấu hình' })
    if (r2.success) setCourses(r2.courses as unknown as CourseOption[])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  function openAdd() {
    setEditing(null)
    setForm({ ...emptyForm })
    setShowModal(true)
  }

  function openEdit(cfg: ConfigRow) {
    setEditing(cfg)
    setForm({
      courseId: cfg.courseId,
      emailFrom: cfg.emailFrom,
      emailQuery: cfg.emailQuery,
      bankName: cfg.bankName,
      enabled: cfg.enabled,
      alternativeCodes: cfg.alternativeCodes || '',
    })
    setShowModal(true)
  }

  function onSelectCourse(courseId: number) {
    const c = courses.find(x => x.id === courseId)
    setForm(f => ({
      ...f,
      courseId,
      bankName: c?.teacherBankAccount?.bankName || f.bankName,
    }))
  }

  async function handleSave() {
    if (!form.courseId) { setMessage({ type: 'err', text: 'Vui lòng chọn khóa học.' }); return }
    setSaving(true)
    const input: AutoVerifyConfigInput = {
      courseId: form.courseId,
      emailFrom: form.emailFrom,
      emailQuery: form.emailQuery,
      bankName: form.bankName,
      enabled: form.enabled,
      alternativeCodes: form.alternativeCodes || null,
    }
    const result = await upsertAutoVerifyConfig(input)
    setSaving(false)
    if (result.success) {
      setShowModal(false)
      setMessage({ type: 'ok', text: 'Đã lưu cấu hình.' })
      loadData()
    } else {
      setMessage({ type: 'err', text: result.error || 'Lưu thất bại.' })
    }
  }

  async function handleDelete(courseId: number) {
    if (!confirm('Xóa cấu hình tự động xác minh của khóa học này?')) return
    const result = await deleteAutoVerifyConfig(courseId)
    if (result.success) { setMessage({ type: 'ok', text: 'Đã xóa.' }); loadData() }
    else setMessage({ type: 'err', text: result.error || 'Xóa thất bại.' })
  }

  async function handleToggle(cfg: ConfigRow) {
    const result = await upsertAutoVerifyConfig({
      courseId: cfg.courseId,
      emailFrom: cfg.emailFrom,
      emailQuery: cfg.emailQuery,
      bankName: cfg.bankName,
      enabled: !cfg.enabled,
      alternativeCodes: cfg.alternativeCodes,
    })
    if (result.success) loadData()
    else setMessage({ type: 'err', text: result.error || 'Thất bại.' })
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <MainHeader title="TỰ ĐỘNG XÁC MINH" toolSlug="payments" />
        <div className="p-6 text-center text-gray-500">Chỉ Admin mới có quyền xem trang này.</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <MainHeader title="TỰ ĐỘNG XÁC MINH" toolSlug="payments" />

      <div className="px-3 py-2.5 flex items-center justify-between">
        <div>
          <Link href="/tools/payments" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
            <ArrowLeft className="w-4 h-4" /> Quay lại quản lý thanh toán
          </Link>
          <p className="text-xs text-gray-500 mt-1">
            Mỗi khóa học có phí cần 1 cấu hình: email người gửi + từ khóa để Gmail quét email biến động số dư của đúng TK ngân hàng giảng viên.
          </p>
        </div>
        <button data-help-id="btn-add-autoverify" onClick={openAdd} className="inline-flex items-center gap-1 text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 shrink-0">
          <Plus className="w-4 h-4" /> Thêm cấu hình
        </button>
      </div>

      {message && (
        <div className={`mx-3 mb-2 p-2.5 rounded text-sm flex items-center gap-2 ${message.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.type === 'ok' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      <div className="px-3 pb-6">
        {loading ? (
          <div className="text-center text-gray-500 py-8">Đang tải...</div>
        ) : configs.length === 0 ? (
          <div className="text-center text-gray-500 py-8">Chưa có cấu hình nào. Bấm "Thêm cấu hình" để bắt đầu.</div>
        ) : (
          <div className="space-y-3">
            {configs.map(cfg => (
              <div key={cfg.id} className="bg-white rounded-lg border shadow-sm p-3">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${cfg.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                    {cfg.enabled ? 'ĐANG BẬT' : 'ĐANG TẮT'}
                  </span>
                  <span className="text-sm font-bold text-gray-900">{cfg.course.name_lop} ({cfg.course.id_khoa})</span>
                  {cfg.course.teacher && <span className="text-xs text-gray-500">GV: {cfg.course.teacher.name}</span>}
                </div>
                <div className="text-xs text-gray-600 space-y-1 mb-2">
                  <div><span className="font-semibold">Ngân hàng:</span> {cfg.bankName}
                    {cfg.course.teacherBankAccount && <span className="text-gray-500"> • TK ...{cfg.course.teacherBankAccount.accountNumber.slice(-4)} ({cfg.course.teacherBankAccount.accountHolder})</span>}
                  </div>
                  <div><span className="font-semibold">Email người gửi:</span> <span className="font-mono">{cfg.emailFrom}</span></div>
                  <div><span className="font-semibold">Từ khóa:</span> <span className="font-mono">{cfg.emailQuery || '(trống)'}</span></div>
                  {cfg.alternativeCodes && <div><span className="font-semibold">Mã phụ:</span> <span className="font-mono">{cfg.alternativeCodes}</span></div>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleToggle(cfg)} className={`text-xs px-2.5 py-1.5 rounded ${cfg.enabled ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-green-600 text-white hover:bg-green-700'}`}>
                    {cfg.enabled ? 'Tắt' : 'Bật'}
                  </button>
                  <button onClick={() => openEdit(cfg)} className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1.5 rounded hover:bg-blue-200 inline-flex items-center gap-1">
                    <Pencil className="w-3.5 h-3.5" /> Sửa
                  </button>
                  <button onClick={() => handleDelete(cfg.courseId)} className="text-xs bg-red-100 text-red-700 px-2.5 py-1.5 rounded hover:bg-red-200 inline-flex items-center gap-1">
                    <Trash2 className="w-3.5 h-3.5" /> Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-lg w-full max-w-md p-4 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold">{editing ? 'Sửa cấu hình' : 'Thêm cấu hình'}</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>

            {!editing && (
              <div>
                <label className="text-xs font-semibold text-gray-600">Khóa học có phí (chưa có cấu hình)</label>
                <select data-help-id="select-course" value={form.courseId} onChange={e => onSelectCourse(parseInt(e.target.value))} className="w-full text-sm border rounded px-2 py-2 mt-1">
                  <option value={0}>— Chọn khóa học —</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name_lop} ({c.id_khoa}) — {c.teacher?.name || 'chưa có GV'}{c.teacherBankAccount ? ` — TK ...${c.teacherBankAccount.accountNumber.slice(-4)}` : ' — chưa có TK'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-gray-600">Email người gửi <span className="text-red-500">*</span></label>
              <input value={form.emailFrom} onChange={e => setForm(f => ({ ...f, emailFrom: e.target.value }))} placeholder="vd: info@sacombank.com.vn" className="w-full text-sm border rounded px-2 py-2 mt-1 font-mono" />
              <p className="text-[11px] text-gray-400 mt-0.5">Địa chỉ email gửi thông báo biến động số dư của ngân hàng (xem trong email thật).</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600">Từ khóa Gmail query</label>
              <input value={form.emailQuery} onChange={e => setForm(f => ({ ...f, emailQuery: e.target.value }))} placeholder='vd: "thong bao giao dich"' className="w-full text-sm border rounded px-2 py-2 mt-1 font-mono" />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600">Tên ngân hàng <span className="text-red-500">*</span></label>
              <input value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))} placeholder="vd: Sacombank" className="w-full text-sm border rounded px-2 py-2 mt-1" />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600">Mã khóa phụ (alternativeCodes, JSON)</label>
              <input value={form.alternativeCodes} onChange={e => setForm(f => ({ ...f, alternativeCodes: e.target.value }))} placeholder='vd: ["BRK01", "BRKCU"]' className="w-full text-sm border rounded px-2 py-2 mt-1 font-mono" />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.enabled} onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))} className="w-4 h-4" />
              Bật quét tự động
            </label>

            <button data-help-id="btn-save-autoverify" onClick={handleSave} disabled={saving} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
