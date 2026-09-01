'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Save, Plus, Trash2, ArrowUp, ArrowDown, Settings, FileText, Palette, ShieldAlert } from 'lucide-react'
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
  const [activeTab, setActiveTab] = useState<'info' | 'theme' | 'sections'>('info')
  
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

  const handleJSONChange = (index: number, valueStr: string) => {
    try {
      const parsed = JSON.parse(valueStr)
      const newSecs = [...sections]
      newSecs[index] = { ...newSecs[index], content: parsed }
      setSections(newSecs)
    } catch {
      // Allow raw typing, validate on save or show warning
    }
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
          <FileText className="w-4 h-4" /> 🗂️ Sắp xếp & Nội dung Sections
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

      {/* Tab: Sections */}
      {activeTab === 'sections' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center justify-between mb-2">
            <h3 className="font-bold text-sm text-gray-800">Cấu trúc các khối giao diện</h3>
            <div className="flex flex-wrap gap-1.5">
              {['hero', 'quote', 'pain_points', 'benefits', 'pricing', 'curriculum', 'testimonials'].map((type) => (
                <button
                  key={type}
                  onClick={() => handleAddSection(type)}
                  className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> {type}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {sections.map((sec, index) => (
              <div key={sec.sectionKey} className="border border-gray-100 rounded-2xl p-4 bg-gray-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 bg-black text-yellow-400 font-mono text-xs font-black rounded-full flex items-center justify-center">
                      {sec.sortOrder}
                    </span>
                    <span className="text-xs font-black uppercase tracking-wider bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                      {sec.sectionType}
                    </span>
                    <span className="text-xs font-mono text-gray-400">{sec.sectionKey}</span>
                  </div>
                  
                  {/* Visibility options */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Đối tượng:</span>
                      <select
                        value={sec.visibility || 'all'}
                        onChange={(e) => handleUpdateSectionContent(index, 'visibility', e.target.value)}
                        className="px-2 py-0.5 border border-gray-200 rounded text-[10px] font-semibold bg-white"
                      >
                        <option value="all">Tất cả mọi người</option>
                        <option value="unregistered">Chưa đăng ký/chưa học</option>
                        <option value="registered">Đã kích hoạt khóa học</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Bật:</label>
                      <input
                        type="checkbox"
                        checked={sec.enabled}
                        onChange={(e) => handleUpdateSectionContent(index, 'enabled', e.target.checked)}
                        className="w-3.5 h-3.5"
                      />
                    </div>

                    <div className="flex items-center gap-1 border-l border-gray-200 pl-2">
                      <button
                        onClick={() => handleMoveSection(index, 'up')}
                        disabled={index === 0}
                        className="p-1 text-gray-400 hover:text-black hover:bg-gray-100 rounded disabled:opacity-30"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveSection(index, 'down')}
                        disabled={index === sections.length - 1}
                        className="p-1 text-gray-400 hover:text-black hover:bg-gray-100 rounded disabled:opacity-30"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteSection(index)}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Content JSON Edit */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nội dung JSON cấu hình</label>
                  <textarea
                    defaultValue={JSON.stringify(sec.content, null, 2)}
                    onChange={(e) => handleJSONChange(index, e.target.value)}
                    placeholder="{}"
                    className="w-full font-mono text-xs p-3 rounded-lg border border-gray-200 bg-white h-24 focus:outline-none focus:border-black"
                  />
                </div>
              </div>
            ))}
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
          <Save className="w-4 h-4" /> {saving ? 'Đang lưu...' : 'Lưu tất cả cấu hình'}
        </button>
      </div>
    </div>
  )
}
