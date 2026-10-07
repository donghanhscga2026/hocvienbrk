'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckSquare,
  ExternalLink,
  FileArchive,
  FileCode2,
  GripVertical,
  LayoutTemplate,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  XSquare,
} from 'lucide-react'
import MainHeader from '@/components/layout/MainHeader'
import ImportedSection from '@/components/course-page/sections/ImportedSection'
import ZipSourceSection from '@/components/course-page/sections/ZipSourceSection'
import { COURSE_TEMPLATE_LIBRARY } from '@/lib/course-page/templates'
import { WebsiteTemplateAnalysis } from '@/lib/course-page/importer/types'
import { prepareWebsiteZip } from '@/lib/course-page/importer/zip-browser'
import { analyzeWebsiteHtml } from '@/lib/course-page/importer/html-analyzer'
import { isImportedRegistrationSection } from '@/lib/course-page/importer/registration'
import { saveImportedTemplate } from '@/lib/course-page/importer/save-template'
import { supabase } from '@/lib/supabase'
import {
  deleteStoredCoursePageTemplate,
  getStoredCoursePageTemplates,
} from '@/app/actions/course-page-template-actions'

type StoredTemplate = {
  id: string
  key: string
  name: string
  description?: string | null
  sourceUrl?: string | null
  sourceType?: string | null
  thumbnailUrl?: string | null
  analysis?: any
  createdAt?: string | Date
}

const SECTION_NAMES: Record<string, string> = {
  header: 'Header / Điều hướng',
  hero: 'Hero',
  pain_points: 'Nỗi đau / Vấn đề',
  outcomes: 'Kết quả / Lợi ích',
  roadmap: 'Hành trình / Lộ trình',
  gallery: 'Thư viện hình ảnh',
  instructor: 'Diễn giả / Chuyên gia',
  bonuses: 'Quà tặng',
  pricing: 'Học phí / Giá trị',
  fit: 'Phù hợp / Không phù hợp',
  faq: 'Câu hỏi thường gặp',
  registration: 'Form đăng ký',
  closing_message: 'Lời kết',
  footer: 'Footer',
  sticky_cta: 'Thanh hành động cố định',
  rich_content: 'Nội dung',
}

export default function CourseTemplateLibraryPage() {
  const [storedTemplates, setStoredTemplates] = useState<StoredTemplate[]>([])
  const [loadingLibrary, setLoadingLibrary] = useState(true)
  const [showImporter, setShowImporter] = useState(false)
  const [sourceUrl, setSourceUrl] = useState('')
  const [sourceFile, setSourceFile] = useState<File | null>(null)
  const [sourceZip, setSourceZip] = useState<File | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<WebsiteTemplateAnalysis | null>(null)
  const [sectionOrder, setSectionOrder] = useState<string[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const loadLibrary = async () => {
    setLoadingLibrary(true)
    try {
      const res = await getStoredCoursePageTemplates()
      if (res.success) setStoredTemplates((res.templates || []) as StoredTemplate[])
      else setMessage({ type: 'error', text: res.error || 'Không thể tải mẫu của tôi' })
    } catch {
      setMessage({ type: 'error', text: 'Không tải được thư viện mẫu. Hãy tải lại trang để kiểm tra mẫu đã lưu.' })
    } finally {
      setLoadingLibrary(false)
    }
  }

  useEffect(() => {
    loadLibrary()
  }, [])

  const orderedSections = useMemo(() => {
    if (!analysis) return []
    const byId = new Map(analysis.sections.map(section => [section.id, section]))
    return sectionOrder.map(id => byId.get(id)).filter(Boolean) as WebsiteTemplateAnalysis['sections']
  }, [analysis, sectionOrder])

  const selectedSections = useMemo(
    () => orderedSections.filter(section => selected.has(section.id)),
    [orderedSections, selected],
  )
  const isExactAnalysis = Boolean(analysis?.exactSource?.url)
  const selectableSectionIds = useMemo(
    () => orderedSections.filter(section => !isImportedRegistrationSection(section)).map(section => section.id),
    [orderedSections],
  )
  const registrationSectionIds = useMemo(
    () => orderedSections.filter(isImportedRegistrationSection).map(section => section.id),
    [orderedSections],
  )

  const resetAnalysis = () => {
    setAnalysis(null)
    setSectionOrder([])
    setSelected(new Set())
    setTemplateName('')
    setTemplateDescription('')
    setMessage(null)
  }

  const handleAnalyze = async () => {
    if (!sourceZip && !sourceFile && !sourceUrl.trim()) {
      setMessage({ type: 'error', text: 'Hãy dán URL website, chọn file HTML hoặc chọn ZIP mã nguồn.' })
      return
    }

    setAnalyzing(true)
    setMessage(null)
    try {
      let result: WebsiteTemplateAnalysis

      if (sourceZip) {
        const prepared = await prepareWebsiteZip(sourceZip)
        const safeBase = sourceZip.name
          .replace(/\.zip$/i, '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9_-]+/gi, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 60) || 'website'
        const storagePath = `course-template-sources/${safeBase}-${Date.now().toString(36)}.html`
        const exactFile = new Blob([prepared.html], { type: 'text/html;charset=utf-8' })
        const { error: uploadError } = await supabase.storage
          .from('uploads')
          .upload(storagePath, exactFile, {
            contentType: 'text/html;charset=utf-8',
            upsert: false,
          })
        if (uploadError) {
          throw new Error(`Không thể lưu trang ZIP vào kho dữ liệu: ${uploadError.message}`)
        }

        const { data: publicData } = supabase.storage.from('uploads').getPublicUrl(storagePath)
        if (!publicData?.publicUrl) throw new Error('Không lấy được URL công khai của trang ZIP đã lưu.')

        result = analyzeWebsiteHtml({
          html: prepared.analysisHtml,
          sourceType: 'zip',
          sourceUrl: publicData.publicUrl,
        })
        result.exactSource = {
          url: publicData.publicUrl,
          zipFileName: sourceZip.name,
          entryPath: prepared.entryPath,
          fileCount: prepared.fileCount,
          inlinedAssetCount: prepared.inlinedAssetCount,
        }
        result.warnings = Array.from(new Set([
          ...result.warnings.filter(warning => !/đường dẫn file cục bộ|tương đối/i.test(warning)),
          'ZIP Exact Mode: chọn/bỏ từng khối nhưng vẫn giữ nguyên CSS/bố cục nguồn. Form đăng ký nguồn luôn bị loại và CTA đăng ký chuyển sang MFC.',
          ...prepared.warnings,
        ]))
      } else {
        let response: Response
        if (sourceFile) {
          // Browser-exported HTML often embeds images as base64 and can exceed
          // Vercel's request-body limit before our API route is reached.
          // Gzip is especially effective for base64 HTML, so compress it client-side.
          if (typeof CompressionStream !== 'undefined') {
            const compressedStream = sourceFile.stream().pipeThrough(new CompressionStream('gzip'))
            const compressed = await new Response(compressedStream).arrayBuffer()
            response = await fetch('/api/admin/course-page-templates/analyze', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/gzip',
                'X-HTML-Filename': encodeURIComponent(sourceFile.name),
                ...(sourceUrl.trim() ? { 'X-Source-URL': encodeURIComponent(sourceUrl.trim()) } : {}),
              },
              body: compressed,
            })
          } else {
            const form = new FormData()
            form.append('file', sourceFile)
            if (sourceUrl.trim()) form.append('sourceUrl', sourceUrl.trim())
            response = await fetch('/api/admin/course-page-templates/analyze', {
              method: 'POST',
              body: form,
            })
          }
        } else {
          response = await fetch('/api/admin/course-page-templates/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: sourceUrl.trim() }),
          })
        }

        const responseText = await response.text()
        let data: any = null
        try {
          data = responseText ? JSON.parse(responseText) : null
        } catch {
          const tooLarge = response.status === 413 || /request entity too large|body exceeded/i.test(responseText)
          throw new Error(
            tooLarge
              ? 'File HTML quá lớn để gửi trực tiếp. Hệ thống đã thử nén file nhưng vẫn vượt giới hạn máy chủ.'
              : `Máy chủ trả về phản hồi không hợp lệ (HTTP ${response.status}). Vui lòng thử lại.`,
          )
        }
        if (!response.ok || !data?.success) {
          throw new Error(data?.error || `Không thể phân tích website (HTTP ${response.status})`)
        }
        result = data.analysis as WebsiteTemplateAnalysis
      }

      setAnalysis(result)
      const ids = result.sections.map(section => section.id)
      const defaultSelectedIds = result.sections
        .filter(section => !isImportedRegistrationSection(section))
        .map(section => section.id)
      setSectionOrder(ids)
      setSelected(new Set(defaultSelectedIds))
      setTemplateName(result.title || 'Mẫu website mới')
      setTemplateDescription(
        result.sourceType === 'zip'
          ? `Nhập nguyên bản từ ZIP ${result.exactSource?.zipFileName || sourceZip?.name || ''}`.trim()
          : result.sourceUrl || result.finalUrl
            ? `Nhập từ ${result.finalUrl || result.sourceUrl}`
            : 'Nhập từ file HTML',
      )
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'Không thể phân tích website' })
    } finally {
      setAnalyzing(false)
    }
  }

  const toggleSection = (id: string) => {
    const section = analysis?.sections.find(item => item.id === id)
    if (section && isImportedRegistrationSection(section)) return
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const moveSection = (id: string, direction: -1 | 1) => {
    setSectionOrder(prev => {
      const index = prev.indexOf(id)
      const nextIndex = index + direction
      if (index < 0 || nextIndex < 0 || nextIndex >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[nextIndex]] = [next[nextIndex], next[index]]
      return next
    })
  }

  const dropBefore = (targetId: string) => {
    if (!draggingId || draggingId === targetId) return
    setSectionOrder(prev => {
      const next = prev.filter(id => id !== draggingId)
      const targetIndex = next.indexOf(targetId)
      next.splice(targetIndex < 0 ? next.length : targetIndex, 0, draggingId)
      return next
    })
    setDraggingId(null)
  }

  const createTemplate = async () => {
    if (!analysis) return
    if (!templateName.trim()) {
      setMessage({ type: 'error', text: 'Hãy đặt tên cho mẫu.' })
      return
    }
    const selectedIds = sectionOrder.filter(id => selected.has(id))
    if (!selectedIds.length) {
      setMessage({ type: 'error', text: 'Hãy chọn ít nhất một phần để tạo mẫu.' })
      return
    }

    setSavingTemplate(true)
    setMessage(null)
    try {
      const res = await saveImportedTemplate({
        name: templateName.trim(),
        description: templateDescription.trim(),
        analysis,
        selectedSectionIds: selectedIds,
      })
      const createdName = res.template.name || templateName
      setShowImporter(false)
      resetAnalysis()
      setSourceUrl('')
      setSourceFile(null)
      setSourceZip(null)
      setMessage({ type: 'success', text: `Đã tạo mẫu “${createdName}”. Mẫu đã sẵn sàng để áp dụng cho khóa học.` })
      // Tải lại danh sách riêng, không giữ nút tạo mẫu trong trạng thái chờ.
      void loadLibrary()
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Không thể tạo mẫu. Hãy kiểm tra thư viện trước khi tạo lại.' })
    } finally {
      setSavingTemplate(false)
    }
  }

  const deleteTemplate = async (template: StoredTemplate) => {
    if (!confirm(`Xóa mẫu “${template.name}”? Các khóa học đã áp dụng mẫu này vẫn giữ nguyên dữ liệu riêng của chúng.`)) return
    setDeletingId(template.id)
    const res = await deleteStoredCoursePageTemplate(template.id)
    if (res.success) {
      setStoredTemplates(prev => prev.filter(item => item.id !== template.id))
    } else {
      setMessage({ type: 'error', text: res.error || 'Không thể xóa mẫu' })
    }
    setDeletingId(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MainHeader title="THƯ VIỆN MẪU SALESPAGE" toolSlug="courses" />
      <main className="mx-auto max-w-7xl space-y-6 p-4 pb-20 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/tools/courses" className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-purple-700">
              <ArrowLeft className="h-4 w-4" /> Quản lý khóa học
            </Link>
            <h1 className="mt-3 text-2xl font-black text-gray-900">Thư viện mẫu Salespage</h1>
            <p className="mt-1 max-w-3xl text-sm text-gray-500">
              Dùng mẫu có sẵn hoặc nhập một website / file HTML. Khi áp dụng cho khóa học, hệ thống tạo bản dữ liệu riêng để chỉnh sửa độc lập.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setShowImporter(prev => !prev); setMessage(null) }}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-purple-700 px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-purple-800"
          >
            <Plus className="h-4 w-4" /> Nhập mẫu từ Website
          </button>
        </div>

        {message && (
          <div className={`rounded-2xl border p-4 text-sm font-semibold ${message.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
            {message.text}
          </div>
        )}

        {showImporter && (
          <section className="overflow-hidden rounded-3xl border border-purple-200 bg-white shadow-sm">
            <div className="border-b bg-purple-50 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-purple-600">Website → Template</div>
                  <h2 className="mt-1 text-xl font-black text-gray-900">Phân tích và tạo mẫu</h2>
                  <p className="mt-1 text-sm text-gray-600">Chọn 1 trong 3 nguồn: URL, file HTML hoặc ZIP mã nguồn. HTML mặc định giữ nguyên trang và đóng gói CSS Tailwind; ZIP giữ bố cục và tài nguyên đi kèm. URL phân tích thành các khối. Hãy xem cảnh báo và kiểm tra bản xem trước trước khi lưu.</p>
                </div>
                {analysis && (
                  <button type="button" onClick={resetAnalysis} className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-xs font-bold text-gray-600">
                    <RefreshCw className="h-4 w-4" /> Phân tích nguồn khác
                  </button>
                )}
              </div>
            </div>

            {!analysis ? (
              <div className="grid gap-4 p-5 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-end">
                <div>
                  <label className="mb-2 flex items-center gap-2 text-xs font-black uppercase text-gray-500">
                    <Link2 className="h-4 w-4" /> URL website
                  </label>
                  <input
                    value={sourceUrl}
                    onChange={e => { setSourceUrl(e.target.value); if (sourceZip) setSourceZip(null) }}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-purple-500"
                  />
                </div>
                <div className="hidden pb-3 text-xs font-black text-gray-300 lg:block">HOẶC</div>
                <div>
                  <label className="mb-2 flex items-center gap-2 text-xs font-black uppercase text-gray-500">
                    <FileCode2 className="h-4 w-4" /> File HTML
                  </label>
                  <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600 hover:border-purple-400">
                    <span className="min-w-0 truncate">{sourceFile?.name || 'Chọn file .html / .htm'}</span>
                    <Upload className="h-4 w-4 shrink-0" />
                    <input
                      type="file"
                      accept=".html,.htm,text/html"
                      className="hidden"
                      onChange={e => { setSourceFile(e.target.files?.[0] || null); setSourceZip(null) }}
                    />
                  </label>
                </div>
                <div className="hidden pb-3 text-xs font-black text-gray-300 lg:block">HOẶC</div>
                <div>
                  <label className="mb-2 flex items-center gap-2 text-xs font-black uppercase text-gray-500">
                    <FileArchive className="h-4 w-4" /> ZIP mã nguồn
                  </label>
                  <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/60 px-4 py-3 text-sm text-gray-700 hover:border-emerald-500">
                    <span className="min-w-0 truncate">{sourceZip?.name || 'Chọn file .zip chứa website'}</span>
                    <Upload className="h-4 w-4 shrink-0 text-emerald-700" />
                    <input
                      type="file"
                      accept=".zip,application/zip"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0] || null
                        setSourceZip(file)
                        if (file) {
                          setSourceFile(null)
                          setSourceUrl('')
                        }
                      }}
                    />
                  </label>
                  <p className="mt-1 text-[10px] leading-4 text-gray-400">Tự tìm trang chính, nhúng asset cục bộ và giữ nguyên giao diện.</p>
                </div>
                <div className="lg:col-span-5 flex justify-end">
                  <button
                    type="button"
                    onClick={handleAnalyze}
                    disabled={analyzing}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-black px-5 py-3 text-xs font-black text-yellow-400 disabled:opacity-50"
                  >
                    {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <LayoutTemplate className="h-4 w-4" />}
                    {analyzing ? (sourceZip ? 'Đang giải nén & phân tích...' : 'Đang phân tích...') : 'Phân tích trang'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid min-h-[720px] xl:grid-cols-[470px_1fr]">
                <div className="border-b p-4 xl:border-b-0 xl:border-r">
                  <div className="rounded-2xl bg-gray-50 p-4">
                    <div className="text-sm font-black text-gray-900">{analysis.title}</div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold text-gray-500">
                      <span>{analysis.stats.sections} phần</span>
                      <span>•</span><span>{analysis.stats.images} ảnh</span>
                      <span>•</span><span>{analysis.stats.links} liên kết</span>
                      <span>•</span><span>{analysis.stats.forms} form</span>
                    </div>
                    {!!analysis.colors.length && (
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        {analysis.colors.slice(0, 8).map(color => (
                          <span key={color} title={color} className="h-6 w-6 rounded-full border border-black/10 shadow-sm" style={{ background: color }} />
                        ))}
                      </div>
                    )}
                    {!!analysis.fonts.length && <div className="mt-2 text-[11px] text-gray-500">Font phát hiện: {analysis.fonts.join(', ')}</div>}
                  </div>

                  {!!analysis.warnings.length && (
                    <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                      {analysis.warnings.map((warning, index) => <div key={index}>• {warning}</div>)}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-black text-gray-900">{isExactAnalysis ? 'Các phần trong trang gốc' : 'Chọn phần đưa vào mẫu'}</div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setSelected(new Set(selectableSectionIds))} className="inline-flex items-center gap-1 rounded-lg bg-green-50 px-2.5 py-2 text-[10px] font-black text-green-700">
                        <CheckSquare className="h-3.5 w-3.5" /> Chọn tất cả
                      </button>
                      <button type="button" onClick={() => setSelected(new Set())} className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-2 text-[10px] font-black text-gray-600">
                        <XSquare className="h-3.5 w-3.5" /> Bỏ tất cả
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 max-h-[500px] space-y-2 overflow-y-auto pr-1">
                    {orderedSections.map((section, index) => {
                      const checked = selected.has(section.id)
                      return (
                        <div
                          key={section.id}
                          onDragOver={e => e.preventDefault()}
                          onDrop={() => dropBefore(section.id)}
                          className={`flex items-start gap-2 rounded-xl border p-3 transition ${checked ? 'border-purple-200 bg-purple-50/60' : 'border-gray-200 bg-gray-50 opacity-60'}`}
                        >
                          <button
                            type="button"
                            draggable={!isExactAnalysis && !isImportedRegistrationSection(section)}
                            onDragStart={() => { if (!isExactAnalysis && !isImportedRegistrationSection(section)) setDraggingId(section.id) }}
                            onDragEnd={() => setDraggingId(null)}
                            className="mt-0.5 cursor-grab rounded p-1 text-gray-400 active:cursor-grabbing"
                            title="Kéo để đổi vị trí"
                          >
                            <GripVertical className="h-4 w-4" />
                          </button>
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={isImportedRegistrationSection(section)}
                            onChange={() => toggleSection(section.id)}
                            className="mt-1 h-4 w-4 accent-purple-700"
                          />
                          <button type="button" disabled={isImportedRegistrationSection(section)} onClick={() => toggleSection(section.id)} className="min-w-0 flex-1 text-left disabled:cursor-default">
                            <div className="truncate text-xs font-black text-gray-900">{section.label}</div>
                            <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-purple-600">
                              {SECTION_NAMES[section.sectionType] || section.sectionType} · {Math.round(section.confidence * 100)}%
                              {isImportedRegistrationSection(section) ? ' · LOẠI BỎ — dùng đăng ký MFC' : ''}
                            </div>
                          </button>
                          <div className={isExactAnalysis ? "hidden" : "flex shrink-0"}>
                            <button type="button" onClick={() => moveSection(section.id, -1)} disabled={index === 0} className="rounded p-1 text-gray-400 disabled:opacity-20" title="Đưa lên"><ArrowUp className="h-3.5 w-3.5" /></button>
                            <button type="button" onClick={() => moveSection(section.id, 1)} disabled={index === orderedSections.length - 1} className="rounded p-1 text-gray-400 disabled:opacity-20" title="Đưa xuống"><ArrowDown className="h-3.5 w-3.5" /></button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="mt-4 space-y-3 border-t pt-4">
                    <div>
                      <label className="mb-1 block text-[10px] font-black uppercase text-gray-500">Tên mẫu</label>
                      <input value={templateName} onChange={e => setTemplateName(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-black uppercase text-gray-500">Ghi chú</label>
                      <input value={templateDescription} onChange={e => setTemplateDescription(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" />
                    </div>
                    {message?.type === 'error' && (
                      <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{message.text}</div>
                    )}
                    <button
                      type="button"
                      onClick={createTemplate}
                      disabled={savingTemplate || selected.size === 0}
                      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-purple-700 px-4 font-black text-white disabled:opacity-40"
                    >
                      {savingTemplate ? <Loader2 className="h-4 w-4 animate-spin" /> : <LayoutTemplate className="h-4 w-4" />}
                      {savingTemplate ? 'Đang tạo mẫu...' : isExactAnalysis ? 'Tạo mẫu nguyên trang' : `Tạo mẫu từ ${selected.size} phần đã chọn`}
                    </button>
                  </div>
                </div>

                <div className="bg-gray-100 p-3 sm:p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-black uppercase tracking-widest text-gray-500">Preview</div>
                      <div className="text-[11px] text-gray-400">{isExactAnalysis ? "Xem nguyên trang với CSS đã đóng gói; thứ tự giữ theo file gốc." : "Bỏ chọn hoặc đổi thứ tự bên trái, bản xem trước cập nhật ngay."}</div>
                    </div>
                    <div className="rounded-lg bg-white px-3 py-2 text-[11px] font-bold text-gray-600">{isExactAnalysis ? "Nguyên trang" : `${selectedSections.length} phần`}</div>
                  </div>
                  <div
                    className="max-h-[760px] overflow-y-auto rounded-2xl border bg-white shadow-sm"
                    style={{
                      ['--course-primary' as any]: analysis.theme.primaryColor || '#6D28D9',
                      ['--course-text' as any]: analysis.theme.textColor || '#1F2937',
                      ['--text-heading' as any]: analysis.theme.textColor || '#1F2937',
                      ['--text-body' as any]: analysis.theme.textColor || '#374151',
                      ['--course-container-max' as any]: analysis.theme.containerWidth || '1120px',
                      ['--course-heading-font' as any]: analysis.theme.headingFont || 'system-ui',
                      ['--course-body-font' as any]: analysis.theme.bodyFont || 'system-ui',
                    }}
                  >
                    {isExactAnalysis && analysis.exactSource?.url ? (
                      <div>
                        <ZipSourceSection
                          content={{
                            exactSource: analysis.exactSource,
                            selectedBlockKeys: selectedSections.map(section => section.id),
                            registrationBlockKeys: registrationSectionIds,
                          }}
                        />
                      </div>
                    ) : (
                    <div className="pointer-events-none origin-top scale-[0.82]" style={{ width: '121.95%' }}>
                      {selectedSections.map(section => (
                        <ImportedSection
                          key={section.id}
                          id={section.sourceId || section.id}
                          content={{
                            design: section.design,
                            importedMeta: { label: section.label, confidence: section.confidence },
                            importedSource: {
                              sectionType: section.sectionType,
                              heading: section.heading,
                              paragraphs: section.paragraphs,
                              listItems: section.listItems,
                              cards: section.cards,
                              tableRows: section.tableRows,
                              images: section.images,
                              actions: section.actions,
                              faqItems: section.faqItems,
                              formFields: section.formFields,
                              fidelity: section.fidelity,
                            },
                          }}
                        />
                      ))}
                      {!selectedSections.length && (
                        <div className="p-12 text-center text-sm font-bold text-gray-400">Chưa chọn phần nào để xem trước.</div>
                      )}
                    </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-gray-900">Mẫu hệ thống</h2>
              <p className="text-xs text-gray-500">Các mẫu được xây dựng sẵn trong MFC.</p>
            </div>
            <LayoutTemplate className="h-8 w-8 text-purple-700" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {COURSE_TEMPLATE_LIBRARY.map(template => (
              <article key={template.key} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="text-[10px] font-black uppercase tracking-widest text-purple-600">Mẫu hệ thống</div>
                <h3 className="mt-2 text-xl font-black text-gray-900">{template.name}</h3>
                <p className="mt-2 min-h-12 text-sm leading-6 text-gray-500">{template.description}</p>
                <div className="mt-5 rounded-xl bg-purple-50 p-3 text-xs font-semibold text-purple-800">
                  Áp dụng từ màn hình Khóa học → Mẫu.
                </div>
              </article>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-3">
            <h2 className="text-lg font-black text-gray-900">Mẫu của tôi</h2>
            <p className="text-xs text-gray-500">Các mẫu được tạo từ website / file HTML. Có thể áp dụng cho nhiều khóa học và chỉnh riêng từng khóa.</p>
          </div>
          {loadingLibrary ? (
            <div className="rounded-3xl border bg-white p-10 text-center text-sm font-bold text-gray-500">
              <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-purple-600" /> Đang tải thư viện...
            </div>
          ) : storedTemplates.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-8 text-center">
              <FileCode2 className="mx-auto h-9 w-9 text-gray-300" />
              <div className="mt-3 font-black text-gray-700">Chưa có mẫu website nào</div>
              <p className="mt-1 text-sm text-gray-500">Bấm “Nhập mẫu từ Website” để tạo mẫu đầu tiên.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {storedTemplates.map(template => {
                const sectionCount = Array.isArray(template.analysis?.sections)
                  ? template.analysis.sections.filter((section: any) => section.enabled !== false).length
                  : 0
                return (
                  <article key={template.id} className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                    {template.thumbnailUrl ? (
                      <img src={template.thumbnailUrl} alt="" className="aspect-[16/8] w-full object-cover" />
                    ) : (
                      <div className="grid aspect-[16/8] place-items-center bg-purple-50"><LayoutTemplate className="h-8 w-8 text-purple-300" /></div>
                    )}
                    <div className="p-5">
                      <div className="text-[10px] font-black uppercase tracking-widest text-purple-600">Mẫu của tôi · {sectionCount} phần</div>
                      <h3 className="mt-1 text-lg font-black text-gray-900">{template.name}</h3>
                      {template.description && <p className="mt-2 line-clamp-2 text-xs leading-5 text-gray-500">{template.description}</p>}
                      {template.sourceUrl && (
                        <a href={template.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex max-w-full items-center gap-1 truncate text-[11px] font-bold text-blue-600">
                          <ExternalLink className="h-3 w-3 shrink-0" /> <span className="truncate">Trang nguồn</span>
                        </a>
                      )}
                      <div className="mt-4 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-gray-400">Chọn tại Khóa học → Mẫu</span>
                        <button
                          type="button"
                          onClick={() => deleteTemplate(template)}
                          disabled={deletingId === template.id}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 disabled:opacity-50"
                          title="Xóa mẫu"
                        >
                          {deletingId === template.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <Link href="/tools/courses" className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-xs font-black text-yellow-400">
          Chọn khóa học để áp dụng mẫu <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </main>
    </div>
  )
}
