'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Save, Plus, Trash2, ArrowUp, ArrowDown, Settings, FileText, Palette, Copy, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { updateCoursePage, saveCourseSections } from '@/app/actions/course-page-actions'

interface EditCoursePageFormProps {
  initialPage: {
    id: string
    slug: string
    name: string
    status: 'draft' | 'published' | 'archived'
    seo: any
    theme: any
    navigation: any
    checkoutConfig: any
    useTemplate?: boolean
    sections: any[]
  }
}

export default function EditCoursePageForm({ initialPage }: EditCoursePageFormProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'info' | 'theme' | 'sections'>('sections')
  const [expandedSection, setExpandedSection] = useState<number | null>(0)
  const [advanced, setAdvanced] = useState(false)
  
  // Page state
  const [name, setName] = useState(initialPage.name)
  const [status, setStatus] = useState(initialPage.status)
  const [seo, setSeo] = useState(initialPage.seo || {})
  const [theme, setTheme] = useState(initialPage.theme || {})
  const [checkoutConfig, setCheckoutConfig] = useState(initialPage.checkoutConfig || {})
  const [navigation, setNavigation] = useState(initialPage.navigation || {})
  
  const [useTemplate, setUseTemplate] = useState(initialPage.useTemplate !== false)
  
  // Sections state
  const [sections, setSections] = useState<any[]>(initialPage.sections || [])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSavePage = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await updateCoursePage(initialPage.id, {
        name,
        status,
        seo,
        theme,
        navigation,
        checkoutConfig,
        useTemplate,
      })

      if (res.success) {
        // Now save sections
        const secRes = await saveCourseSections(initialPage.id, sections)
        if (secRes.success) {
          setMessage({ type: 'success', text: 'Đã lưu cấu hình trang thành công!' })
          router.push('/tools/courses')
        } else {
          setMessage({ type: 'error', text: secRes.error || 'Lỗi khi lưu các phần giao diện' })
        }
      } else {
        setMessage({ type: 'error', text: res.error || 'Lỗi khi lưu thông tin trang' })
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Lỗi hệ thống' })
    } finally {
      setSaving(false)
    }
  }

  // Section manipulation
  const handleAddSection = (type: string) => {
    const newSec = {
      sectionKey: `${type}_${Date.now()}`,
      sectionType: type,
      enabled: true,
      sortOrder: sections.length + 1,
      visibility: 'all',
      content: {}
    }
    setSections([...sections, newSec])
  }

  const handleDeleteSection = (index: number) => {
    if (!confirm('Bạn có muốn xóa section này?')) return
    const newSecs = sections.filter((_, i) => i !== index)
    // Update sort order
    const updated = newSecs.map((sec, i) => ({ ...sec, sortOrder: i + 1 }))
    setSections(updated)
  }

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === sections.length - 1) return

    const targetIndex = direction === 'up' ? index - 1 : index + 1
    const newSecs = [...sections]
    
    // Swap
    const temp = newSecs[index]
    newSecs[index] = newSecs[targetIndex]
    newSecs[targetIndex] = temp

    // Re-assign sort orders
    const updated = newSecs.map((sec, i) => ({ ...sec, sortOrder: i + 1 }))
    setSections(updated)
  }

  const handleUpdateSectionContent = (index: number, field: string, value: any) => {
    const newSecs = [...sections]
    newSecs[index] = { ...newSecs[index], [field]: value }
    setSections(newSecs)
  }

  const updateContent = (index: number, field: string, value: any) => {
    setSections(prev => prev.map((sec, i) => i === index ? { ...sec, content: { ...(sec.content || {}), [field]: value } } : sec))
  }

  const duplicateSection = (index: number) => {
    const source = sections[index]
    const copy = { ...source, id: undefined, sectionKey: `${source.sectionKey}_copy_${Date.now()}`, content: JSON.parse(JSON.stringify(source.content || {})) }
    const next = [...sections]
    next.splice(index + 1, 0, copy)
    setSections(next.map((sec, i) => ({ ...sec, sortOrder: i + 1 })))
    setExpandedSection(index + 1)
  }

  const sectionName = (type: string) => ({
    hero: 'Ảnh mở đầu', quote: 'Trích dẫn', pain_points: 'Vấn đề khách hàng',
    benefits: 'Lợi ích', outcomes: 'Kết quả nhận được', instructor: 'Chuyên gia',
    rich_content: 'Nội dung', wigrow_artwork: 'Ảnh & thông điệp', roadmap: 'Lộ trình',
    pricing: 'Giá / Đăng ký', curriculum: 'Nội dung khóa học',
    testimonials: 'Cảm nhận học viên', closing_message: 'Lời kết'
  } as Record<string,string>)[type] || 'Nội dung'

  const field = (index: number, key: string, label: string, multiline = false) => {
    const value = sections[index]?.content?.[key] ?? ''
    return <div>
      <label className="block text-xs font-bold text-gray-600 mb-1">{label}</label>
      {multiline ? <textarea value={value} onChange={e => updateContent(index,key,e.target.value)} className="w-full min-h-24 rounded-xl border border-gray-200 px-3 py-2 text-sm" />
        : <input value={value} onChange={e => updateContent(index,key,e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />}
    </div>
  }

  const simpleEditor = (sec: any, index: number) => {
    const common = <div className="grid gap-3">{field(index,'eyebrow','Dòng chữ nhỏ')}{field(index,'title','Tiêu đề')}{field(index,'description','Nội dung mô tả',true)}</div>
    if (sec.sectionType === 'wigrow_artwork') return <div className="grid gap-3">{field(index,'imageUrl','Địa chỉ hình ảnh')}{field(index,'imageAlt','Mô tả hình ảnh')}{field(index,'title','Tiêu đề trên ảnh')}{field(index,'accent','Dòng nhấn mạnh')}{field(index,'description','Nội dung',true)}</div>
    if (sec.sectionType === 'quote') return <div className="grid gap-3">{field(index,'quote','Câu trích dẫn',true)}{field(index,'author','Tác giả')}{field(index,'caption','Ghi chú')}</div>
    if (sec.sectionType === 'closing_message') return <div className="grid gap-3">{field(index,'title','Tiêu đề')}{field(index,'signature','Chữ ký')}</div>
    return common
  }


  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`p-4 rounded-2xl border text-sm font-semibold ${
            message.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-100 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('info')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'info' ? 'bg-black text-yellow-400 shadow-sm' : 'text-gray-400 hover:bg-gray-50'
          }`}
        >
          <Settings className="w-4 h-4" /> 📑 Tổng quan & Checkout
        </button>
        <button
          onClick={() => setActiveTab('theme')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'theme' ? 'bg-black text-yellow-400 shadow-sm' : 'text-gray-400 hover:bg-gray-50'
          }`}
        >
          <Palette className="w-4 h-4" /> 🎨 Giao diện & SEO
        </button>
        <button
          onClick={() => setActiveTab('sections')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'sections' ? 'bg-black text-yellow-400 shadow-sm' : 'text-gray-400 hover:bg-gray-50'
          }`}
        >
          <FileText className="w-4 h-4" /> ✏️ Chỉnh nội dung
        </button>
      </div>

      {/* Tab: Info & Checkout */}
      {activeTab === 'info' && (
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Tên hiển thị (Quản trị)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-black text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Trạng thái trang</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-black text-sm bg-white"
              >
                <option value="draft">Bản nháp (Draft)</option>
                <option value="published">Xuất bản công khai (Published)</option>
              </select>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <h3 className="font-bold text-sm text-gray-800 mb-3">Cấu hình Thanh toán & Đăng ký</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Cổng thanh toán</label>
                <select
                  value={checkoutConfig.provider || 'vietqr'}
                  onChange={(e) => setCheckoutConfig({ ...checkoutConfig, provider: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white"
                >
                  <option value="vietqr">VietQR Auto</option>
                  <option value="sepay">SePay Webhook</option>
                  <option value="manual">Chuyển khoản thủ công</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Mã Prefix nội dung CK</label>
                <input
                  type="text"
                  value={checkoutConfig.paymentDescriptionPrefix || 'CK'}
                  onChange={(e) => setCheckoutConfig({ ...checkoutConfig, paymentDescriptionPrefix: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Hạn thanh toán (Phút)</label>
                <input
                  type="number"
                  value={checkoutConfig.orderExpirationMinutes || 15}
                  onChange={(e) => setCheckoutConfig({ ...checkoutConfig, orderExpirationMinutes: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Theme & SEO */}
      {activeTab === 'theme' && (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <h3 className="font-bold text-sm text-gray-800 mb-3">Màu sắc chủ đạo (Bảng mã HEX)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Primary Color</label>
                <input
                  type="text"
                  value={theme.primaryColor || '#C9683C'}
                  onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Secondary Color</label>
                <input
                  type="text"
                  value={theme.secondaryColor || '#E8C468'}
                  onChange={(e) => setTheme({ ...theme, secondaryColor: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Background Color</label>
                <input
                  type="text"
                  value={theme.backgroundColor || '#1A1B26'}
                  onChange={(e) => setTheme({ ...theme, backgroundColor: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Text Color</label>
                <input
                  type="text"
                  value={theme.textColor || '#F2E8D5'}
                  onChange={(e) => setTheme({ ...theme, textColor: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <h3 className="font-bold text-sm text-gray-800 mb-3">SEO Metadata</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Tiêu đề SEO (Meta Title)</label>
                <input
                  type="text"
                  value={seo.title || ''}
                  onChange={(e) => setSeo({ ...seo, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Mô tả SEO (Meta Description)</label>
                <textarea
                  value={seo.description || ''}
                  onChange={(e) => setSeo({ ...seo, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs h-20"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Sections - simple builder */}
      {activeTab === 'sections' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-purple-50 border border-purple-100 p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-black text-gray-900">Chỉnh trang thật đơn giản</h3>
              <p className="text-xs text-gray-600 mt-1">Bấm một khối để sửa chữ hoặc ảnh. Dùng ↑ ↓ để đổi vị trí. Không cần biết mã hay cấu trúc kỹ thuật.</p>
            </div>
            <a href={`/khoa-hoc/${initialPage.slug}`} target="_blank" className="inline-flex items-center gap-2 rounded-xl bg-white border border-purple-200 px-3 py-2 text-xs font-bold text-purple-700">
              Xem trang hiện tại <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="text-xs font-bold text-gray-500 self-center">+ Thêm:</span>
            {['hero','rich_content','benefits','instructor','testimonials','pricing','closing_message'].map(type => (
              <button key={type} onClick={() => handleAddSection(type)} className="rounded-xl bg-gray-100 hover:bg-purple-50 px-3 py-2 text-xs font-bold text-gray-700">
                <Plus className="inline w-3 h-3 mr-1" />{sectionName(type)}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {sections.map((sec,index) => {
              const open=expandedSection===index
              return <div key={sec.sectionKey} className={`rounded-2xl border bg-white overflow-hidden ${open?'border-purple-300 shadow-sm':'border-gray-200'}`}>
                <button type="button" onClick={() => setExpandedSection(open?null:index)} className="w-full p-4 flex items-center gap-3 text-left">
                  <span className="w-7 h-7 rounded-full bg-gray-900 text-yellow-400 flex items-center justify-center text-xs font-black">{index+1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-sm text-gray-900">{sectionName(sec.sectionType)}</div>
                    <div className="text-xs text-gray-400 truncate">{sec.content?.title || sec.content?.description || 'Bấm để thêm nội dung'}</div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${sec.enabled?'bg-green-50 text-green-700':'bg-gray-100 text-gray-400'}`}>{sec.enabled?'Đang hiện':'Đang ẩn'}</span>
                  {open?<ChevronUp className="w-4 h-4"/>:<ChevronDown className="w-4 h-4"/>}
                </button>
                {open && <div className="border-t border-gray-100 p-4 space-y-4">
                  {simpleEditor(sec,index)}
                  <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100">
                    <label className="inline-flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={sec.enabled} onChange={e=>handleUpdateSectionContent(index,'enabled',e.target.checked)}/> Hiển thị khối này</label>
                    <div className="flex-1"/>
                    <button onClick={()=>handleMoveSection(index,'up')} disabled={index===0} className="p-2 rounded-lg bg-gray-100 disabled:opacity-30" title="Đưa lên"><ArrowUp className="w-4 h-4"/></button>
                    <button onClick={()=>handleMoveSection(index,'down')} disabled={index===sections.length-1} className="p-2 rounded-lg bg-gray-100 disabled:opacity-30" title="Đưa xuống"><ArrowDown className="w-4 h-4"/></button>
                    <button onClick={()=>duplicateSection(index)} className="p-2 rounded-lg bg-gray-100" title="Nhân bản"><Copy className="w-4 h-4"/></button>
                    <button onClick={()=>handleDeleteSection(index)} className="p-2 rounded-lg bg-red-50 text-red-600" title="Xóa"><Trash2 className="w-4 h-4"/></button>
                  </div>
                  <button type="button" onClick={()=>setAdvanced(!advanced)} className="text-[11px] font-bold text-gray-400 hover:text-gray-700">⚙️ {advanced?'Ẩn':'Hiện'} cài đặt nâng cao</button>
                  {advanced && <div className="grid md:grid-cols-2 gap-3 rounded-xl bg-gray-50 p-3">
                    <div><label className="text-[10px] font-bold text-gray-500">Đối tượng xem</label><select value={sec.visibility||'all'} onChange={e=>handleUpdateSectionContent(index,'visibility',e.target.value)} className="w-full mt-1 rounded-lg border p-2 text-xs"><option value="all">Tất cả</option><option value="unregistered">Chưa đăng ký</option><option value="registered">Đã kích hoạt</option></select></div>
                    <div><label className="text-[10px] font-bold text-gray-500">Mã khối</label><input value={sec.sectionKey} readOnly className="w-full mt-1 rounded-lg border p-2 text-xs bg-white text-gray-400"/></div>
                  </div>}
                </div>}
              </div>
            })}
          </div>
        </div>
      )}

      {/* Save Trigger */}
      <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">
        <Link
          href="/tools/courses"
          className="px-5 py-3 border border-gray-200 rounded-xl text-xs font-bold uppercase text-gray-500 hover:bg-gray-50 transition-all"
        >
          Hủy
        </Link>
        <button
          onClick={handleSavePage}
          disabled={saving}
          className="px-6 py-3 bg-black text-yellow-400 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-gray-800 transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </div>
    </div>
  )
}
