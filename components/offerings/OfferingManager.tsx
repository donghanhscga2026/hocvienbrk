'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { getAdminCoursesAction, bulkToggleCourseStatusAction } from '@/app/actions/admin-actions'
import { getTeachersAction } from '@/app/actions/course-actions'
import MainHeader from '@/components/layout/MainHeader'
import ManagementWorkspace from '@/components/layout/ManagementWorkspace'
import OfferingManagementTabs from '@/components/offerings/OfferingManagementTabs'
import {
  groupInfo,
  offeringHref,
  offeringWorkspaceHref,
  offeringKinds,
  type ProductGroup,
} from '@/lib/offerings/shared'

type Item = {
  id: number
  id_khoa: string
  name_lop: string
  productGroup?: string
  status: boolean
  phi_coc: number
  link_anh_bia: string | null
  teacher?: { name: string | null } | null
  _count?: { enrollments: number }
}
export default function OfferingManager({ group }: { group: Exclude<ProductGroup, 'COURSE'> }) {
  const info = groupInfo[group]
  const [items, setItems] = useState<Item[]>([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('ALL')
  const [teacher, setTeacher] = useState('SELF')
  const [teachers, setTeachers] = useState<{ id: number; name: string | null }[]>([])
  const [admin, setAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [busy, setBusy] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  useEffect(() => {
    let current = true
    getAdminCoursesAction({ teacherId: teacher === 'SELF' || teacher === 'ALL' ? teacher : Number(teacher) })
      .then((result) => {
        if (!current) return
        if (!result.success) throw new Error('Không tải được danh sách. Vui lòng thử lại hoặc đăng nhập lại.')
        setItems((result.courses || []).filter((item: Item) => item.productGroup === group))
        setAdmin(result.isAdmin || false)
      })
      .catch((e) => {
        if (current) setError(e.message)
      })
      .finally(() => {
        if (current) setLoading(false)
      })
    return () => {
      current = false
    }
  }, [teacher, group, revision])
  useEffect(() => {
    let current = true
    getTeachersAction().then((result) => {
      if (current && result.success) setTeachers(result.teachers || [])
    })
    return () => {
      current = false
    }
  }, [])
  const filtered = useMemo(
    () =>
      items.filter(
        (item) =>
          (status === 'ALL' || item.status === (status === 'ACTIVE')) &&
          [item.name_lop, item.id_khoa, item.teacher?.name]
            .join(' ')
            .toLocaleLowerCase('vi')
            .includes(query.toLocaleLowerCase('vi')),
      ),
    [items, query, status],
  )
  const total = Math.max(1, Math.ceil(filtered.length / 10))
  const current = Math.min(page, total)
  type Summary = {
    id: number
    kind: keyof typeof offeringKinds
    pending: number
    active: number
    expired: number
    total: number
    warnings: string[]
  }
  const visibleIds = filtered
    .slice((current - 1) * 10, current * 10)
    .map((item) => item.id)
    .join(',')
  const [summary, setSummary] = useState<{ ids: string; rows: Summary[]; error?: string } | null>(null)
  useEffect(() => {
    if (!visibleIds || loading) return
    const controller = new AbortController()
    fetch('/api/offerings/management-summary?ids=' + visibleIds, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error)
        if (!controller.signal.aborted) setSummary({ ids: visibleIds, rows: data.rows || [] })
      })
      .catch((error) => {
        if (!controller.signal.aborted) setSummary({ ids: visibleIds, rows: [], error: error.message })
      })
    return () => controller.abort()
  }, [visibleIds, loading, revision])
  const rowSummary = (id: number) =>
    summary?.ids === visibleIds ? summary.rows.find((row) => row.id === id) : undefined
  const detailsFor = (item: Item) => {
    const row = rowSummary(item.id)
    return (
      <div className="mt-3 space-y-2">
        {row ? (
          <>
            <p className="text-sm font-semibold text-brk-primary">{offeringKinds[row.kind]}</p>
            <p className="text-sm text-brk-muted">
              {row.pending} chờ kích hoạt · {row.active} đang có quyền · {row.expired} hết hạn
            </p>
            <div className="flex flex-wrap gap-2">
              {row.warnings.map((warning) => (
                <span
                  key={warning}
                  className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900"
                >
                  {warning}
                </span>
              ))}
            </div>
          </>
        ) : summary?.ids === visibleIds && summary.error ? (
          <p className="text-sm text-amber-900">
            Chưa tải được thống kê.{' '}
            <button
              type="button"
              onClick={() => setRevision((value) => value + 1)}
              className="min-h-11 underline"
            >
              Thử lại
            </button>
          </p>
        ) : (
          <p className="text-sm text-brk-muted">Đang tải thống kê…</p>
        )}
        <div className="flex flex-wrap gap-3 text-sm font-semibold">
          <Link
            href={offeringHref(group, item.id_khoa)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center text-brk-primary"
          >
            Xem trang giới thiệu
          </Link>
          <Link
            href={offeringWorkspaceHref(group, item.id_khoa)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center text-brk-primary"
          >
            Xem không gian sử dụng
          </Link>
          {group === 'SERVICE' && (
            <Link
              href={`/tools/courses/new?id=${item.id}&group=SERVICE&tab=operations`}
              className="inline-flex min-h-11 items-center text-brk-primary"
            >
              Vận hành theo khách
            </Link>
          )}
        </div>
      </div>
    )
  }
  const field = 'min-h-12 rounded-xl border border-brk-outline bg-white px-3 text-base'
  function reload() {
    setLoading(true)
    setError('')
    setItems([])
    setRevision((r) => r + 1)
  }
  const pagination = (
    <nav
      aria-label="Phân trang quản lý"
      className="flex flex-wrap items-center justify-between gap-3 text-sm"
    >
      <p>
        {filtered.length} {info.singular}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={current === 1}
          onClick={() => setPage(current - 1)}
          className={field + ' disabled:opacity-40'}
        >
          Trước
        </button>
        <label>
          Trang{' '}
          <select
            aria-label="Chọn trang"
            className={field}
            value={current}
            onChange={(e) => setPage(Number(e.target.value))}
          >
            {Array.from({ length: total }, (_, i) => (
              <option key={i + 1}>{i + 1}</option>
            ))}
          </select>{' '}
          / {total}
        </label>
        <button
          type="button"
          disabled={current === total}
          onClick={() => setPage(current + 1)}
          className={field + ' disabled:opacity-40'}
        >
          Sau
        </button>
      </div>
    </nav>
  )
  async function toggle(item: Item) {
    setBusy(item.id)
    setError('')
    try {
      const result = await bulkToggleCourseStatusAction([item.id], !item.status)
      if (!result.success) throw new Error(result.error || 'Không lưu được trạng thái.')
      setItems((rows) => rows.map((row) => (row.id === item.id ? { ...row, status: !row.status } : row)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không lưu được trạng thái.')
    } finally {
      setBusy(null)
    }
  }
  return (
    <div className="min-h-screen bg-brk-background text-brk-on-surface">
      <MainHeader title={'Quản lý ' + info.singular} toolSlug="courses" />
      <ManagementWorkspace active={group === 'DIGITAL' ? 'products' : 'services'}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{info.label}</h1>
            <p className="mt-2 text-base text-brk-muted">{info.description}</p>
          </div>
          <Link
            href={'/tools/courses/new?group=' + group}
            className="inline-flex min-h-12 items-center rounded-xl bg-brk-primary px-5 font-semibold text-white"
          >
            + Thêm {info.singular}
          </Link>
        </div>
        <OfferingManagementTabs active={group} />
        {group === 'DIGITAL' && (
          <Link
            href="/tools/courses/new?group=DIGITAL&kind=COMBO"
            className="inline-flex min-h-12 items-center rounded-xl border border-brk-primary bg-white px-4 font-semibold text-brk-primary"
          >
            + Tạo combo
          </Link>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            type="search"
            aria-label="Tìm nội dung"
            placeholder={'Tìm ' + info.singular + '…'}
            className={field}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
          />
          <select
            aria-label="Lọc hiển thị"
            className={field}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hiển thị</option>
            <option value="HIDDEN">Đang ẩn</option>
          </select>
          <select
            aria-label="Người phụ trách"
            className={field}
            disabled={!admin}
            value={teacher}
            onChange={(e) => {
              setTeacher(e.target.value)
              setLoading(true)
              setError('')
              setItems([])
              setPage(1)
            }}
          >
            <option value="SELF">Của tôi</option>
            {admin && (
              <>
                <option value="ALL">Tất cả người phụ trách</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name || '#' + t.id}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">
            {error}{' '}
            <button type="button" onClick={reload} className="underline">
              Tải lại
            </button>
          </p>
        )}
        {pagination}
        {loading ? (
          <p role="status" className="p-6">
            Đang tải…
          </p>
        ) : !filtered.length ? (
          <p className="rounded-2xl border bg-white p-6">
            {items.length ? 'Không có kết quả phù hợp.' : `Chưa có ${info.singular} trong phạm vi đã chọn.`}
          </p>
        ) : (
          <div className="space-y-3">
            {filtered.slice((current - 1) * 10, current * 10).map((item) => (
              <article
                key={item.id}
                className="flex min-w-0 flex-wrap items-start gap-4 rounded-2xl border border-brk-outline bg-white p-4"
              >
                {item.link_anh_bia && (
                  <img
                    src={item.link_anh_bia}
                    alt=""
                    loading="lazy"
                    className="h-20 w-28 rounded-xl object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/tools/courses/new?id=${item.id}&group=${group}`}
                    className="break-words text-lg font-bold text-brk-primary"
                  >
                    {item.name_lop}
                  </Link>
                  <p className="mt-1 text-sm text-brk-muted">
                    {item.id_khoa} · {item.teacher?.name || 'Chưa phân công'}
                  </p>
                  <p className="mt-2 text-base font-semibold">
                    {item.phi_coc > 0 ? item.phi_coc.toLocaleString('vi-VN') + 'đ' : 'Miễn phí'}
                  </p>
                  <p className="mt-1 text-sm text-brk-muted">
                    {rowSummary(item.id)?.total ?? item._count?.enrollments ?? 0} đăng ký ·{' '}
                    {item.status ? 'Công khai' : 'Đang ẩn'}
                  </p>
                  {detailsFor(item)}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/tools/courses/new?id=${item.id}&group=${group}`}
                    className={field + ' inline-flex items-center font-semibold text-brk-primary'}
                  >
                    Quản lý
                  </Link>
                  {admin && (
                    <button
                      type="button"
                      disabled={busy != null}
                      onClick={() => void toggle(item)}
                      className={field + ' disabled:opacity-40'}
                    >
                      {item.status ? 'Ẩn' : 'Hiện'}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
        {pagination}
      </ManagementWorkspace>
    </div>
  )
}
