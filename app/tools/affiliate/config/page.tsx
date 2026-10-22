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

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">Cấu hình hoa hồng theo khóa học</h1>
      <p className="text-sm text-gray-500 mb-6">
        Tỷ lệ hoa hồng <b>trực tiếp</b> (% trên giá niêm yết) cho từng khóa học, tối thiểu <b>{minRate}%</b>.
        {role === 'TEACHER' ? ' Bạn chỉ thấy các khóa học của mình.' : ' Áp dụng cho mọi đơn mua mới sau khi lưu.'}
      </p>

      {msg && <div className="mb-4 px-4 py-2 text-sm bg-blue-50 text-blue-700 rounded-xl">{msg}</div>}

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
                  <ConfigRow key={c.id} course={c} minRate={minRate} saving={saving === c.id} onSave={save} />
                ))}
                {courses.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-10 text-center text-gray-400 italic">Chưa có khóa học nào</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <p className="text-[11px] text-gray-400 mt-4">
        * Hoa hồng trực tiếp tối thiểu {minRate}%. Hoa hồng gián tiếp (tri ân) cố định 2% toàn hệ thống
        cho người giới thiệu đầu tiên — không cấu hình theo từng khóa học.
        Khóa học đã khai giảng sẽ bị khóa cấu hình đối với giảng viên (quản trị viên vẫn chỉnh được khi cần xử lý ngoại lệ).
        Khóa chưa có cấu hình riêng sẽ không sinh hoa hồng trực tiếp.
      </p>
    </div>
  )
}

function ConfigRow({ course, minRate, saving, onSave }: {
  course: CourseConfig
  minRate: number
  saving: boolean
  onSave: (id: number, rate: number, active: boolean) => void
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
      <td className="px-3 py-2 text-center">
        <button disabled={saving || locked}
          onClick={() => onSave(course.id, Number(rate), active)}
          className="px-3 py-1 text-xs bg-gray-900 text-white rounded-lg disabled:opacity-50">
          {locked ? 'Đã khóa' : saving ? 'Đang lưu...' : 'Lưu'}
        </button>
      </td>
    </tr>
  )
}
