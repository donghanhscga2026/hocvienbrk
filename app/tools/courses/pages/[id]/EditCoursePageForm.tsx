'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Save, Plus, Trash2, ArrowUp, ArrowDown, Settings, FileText, Palette, Copy, ExternalLink, ChevronDown, ChevronUp, Monitor, Smartphone, GripVertical, RefreshCw } from 'lucide-react'
import { updateCoursePage, saveCourseSections, publishCoursePage, getCoursePageVersions, restoreCoursePageVersion, createCoursePageCheckpoint } from '@/app/actions/course-page-actions'

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
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('mobile')
  const [previewKey, setPreviewKey] = useState(0)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  
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
  const [publishing, setPublishing] = useState(false)
  const [uploadingImage, setUploadingImage] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [versions, setVersions] = useState<any[]>([])
  const [showVersions, setShowVersions] = useState(false)
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
          const checkpoint = await createCoursePageCheckpoint(initialPage.id)
          setMessage({ type: 'success', text: checkpoint.success ? `Đã lưu bản nháp • Phiên bản ${checkpoint.versionNumber}` : 'Đã lưu bản nháp thành công!' })
          setDirty(false)
          setPreviewKey(k => k + 1)
          router.refresh()
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

  const handlePublish = async () => {
    if (dirty) {
      setMessage({ type: 'error', text: 'Hãy lưu thay đổi trước khi xuất bản.' })
      return
    }
    if (!confirm('Xuất bản phiên bản hiện tại lên trang công khai?')) return
    setPublishing(true)
    const res = await publishCoursePage(initialPage.id)
    setPublishing(false)
    if (res.success) {
      setStatus('published')
      setMessage({ type: 'success', text: `Đã xuất bản phiên bản ${res.versionNumber}.` })
      setPreviewKey(k => k + 1)
      router.refresh()
    } else setMessage({ type: 'error', text: res.error || 'Không thể xuất bản' })
  }

  const handleLoadVersions = async () => {
    if (showVersions) { setShowVersions(false); return }
    const res = await getCoursePageVersions(initialPage.id)
    if (res.success) {
      setVersions(res.versions || [])
      setShowVersions(true)
    } else setMessage({ type: 'error', text: ('error' in res ? res.error : undefined) || 'Không thể tải lịch sử phiên bản' })
  }

  const handleRestoreVersion = async (versionNumber: number) => {
    if (!confirm(`Khôi phục phiên bản ${versionNumber} vào bản đang chỉnh sửa? Trang công khai chưa thay đổi cho tới khi bạn bấm Xuất bản.`)) return
    const res = await restoreCoursePageVersion(initialPage.id, versionNumber)
    if (res.success) window.location.reload()
    else setMessage({ type: 'error', text: res.error || 'Không thể khôi phục phiên bản' })
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
    setDirty(true)
    setSections([...sections, newSec])
    setExpandedSection(sections.length)
  }

  const handleDeleteSection = (index: number) => {
    if (!confirm('Bạn có muốn xóa section này?')) return
    const newSecs = sections.filter((_, i) => i !== index)
    // Update sort order
    const updated = newSecs.map((sec, i) => ({ ...sec, sortOrder: i + 1 }))
    setDirty(true)
    setSections(updated)
  }

  const reorderSections = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= sections.length || to >= sections.length) return
    const next = [...sections]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setDirty(true)
    setSections(next.map((sec, i) => ({ ...sec, sortOrder: i + 1 })))
    setExpandedSection(to)
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
    setDirty(true)
    setSections(updated)
  }

  const handleUpdateSectionContent = (index: number, field: string, value: any) => {
    setDirty(true)
    const newSecs = [...sections]
    newSecs[index] = { ...newSecs[index], [field]: value }
    setSections(newSecs)
  }

  const updateContent = (index: number, field: string, value: any) => {
    setDirty(true)
    setSections(prev => prev.map((sec, i) => i === index ? { ...sec, content: { ...(sec.content || {}), [field]: value } } : sec))
  }

  const updateNestedContent = (index:number, key:string, fieldName:string, value:any) => {
    setDirty(true)
    setSections(prev => prev.map((sec,i) => i===index ? { ...sec, content:{ ...(sec.content||{}), [key]:{ ...(sec.content?.[key]||{}), [fieldName]:value } } } : sec))
  }

  const duplicateSection = (index: number) => {
    setDirty(true)
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

  const updateListItem = (sectionIndex: number, key: string, itemIndex: number, fieldName: string, value: string) => {
    const items = [...(sections[sectionIndex]?.content?.[key] || [])]
    items[itemIndex] = { ...(items[itemIndex] || {}), [fieldName]: value }
    updateContent(sectionIndex, key, items)
  }

  const addListItem = (sectionIndex: number, key: string) => {
    const items = [...(sections[sectionIndex]?.content?.[key] || [])]
    items.push({ id: `item_${Date.now()}`, title: '', description: '' })
    updateContent(sectionIndex, key, items)
  }

  const removeListItem = (sectionIndex: number, key: string, itemIndex: number) => {
    const items = (sections[sectionIndex]?.content?.[key] || []).filter((_: any, i: number) => i !== itemIndex)
    updateContent(sectionIndex, key, items)
  }

  const listEditor = (index: number, key: string, label: string) => {
    const items = sections[index]?.content?.[key] || []
    return <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-gray-600">{label}</label>
        <button type="button" onClick={() => addListItem(index,key)} className="text-xs font-bold text-purple-700">+ Thêm mục</button>
      </div>
      {items.map((item:any,itemIndex:number) => <div key={item.id || itemIndex} className="rounded-xl border border-gray-200 p-3 space-y-2 bg-gray-50">
        <div className="flex gap-2">
          <input value={item.title || ''} onChange={e => updateListItem(index,key,itemIndex,'title',e.target.value)} placeholder="Tiêu đề" className="flex-1 rounded-lg border px-3 py-2 text-sm bg-white"/>
          <button type="button" onClick={() => removeListItem(index,key,itemIndex)} className="p-2 text-red-500" title="Xóa mục"><Trash2 className="w-4 h-4"/></button>
        </div>
        <textarea value={item.description || ''} onChange={e => updateListItem(index,key,itemIndex,'description',e.target.value)} placeholder="Nội dung" className="w-full rounded-lg border px-3 py-2 text-sm bg-white min-h-16"/>
      </div>)}
      {!items.length && <button type="button" onClick={() => addListItem(index,key)} className="w-full rounded-xl border border-dashed border-gray-300 p-3 text-xs font-bold text-gray-500">+ Thêm mục đầu tiên</button>}
    </div>
  }

  const updateNestedItem = (sectionIndex:number, key:string, itemIndex:number, patch:any) => {
    const items=[...(sections[sectionIndex]?.content?.[key] || [])]
    items[itemIndex]={...(items[itemIndex] || {}),...patch}
    updateContent(sectionIndex,key,items)
  }

  const addNestedItem = (sectionIndex:number, key:string, seed:any) => {
    updateContent(sectionIndex,key,[...(sections[sectionIndex]?.content?.[key] || []),{id:`item_${Date.now()}`,...seed}])
  }

  const removeNestedItem = (sectionIndex:number,key:string,itemIndex:number) => {
    updateContent(sectionIndex,key,(sections[sectionIndex]?.content?.[key] || []).filter((_:any,i:number)=>i!==itemIndex))
  }

  const instructorsEditor = (index:number) => <div className="space-y-3">
    <div className="flex justify-between items-center"><label className="text-xs font-bold text-gray-600">Danh sách chuyên gia</label><button type="button" onClick={()=>addNestedItem(index,'instructors',{name:'',role:'',imageUrl:'',imageAlt:'',bio:[]})} className="text-xs font-bold text-purple-700">+ Thêm chuyên gia</button></div>
    {(sections[index]?.content?.instructors || []).map((ins:any,i:number)=><div key={ins.id||i} className="rounded-xl border bg-gray-50 p-3 space-y-2">
      <div className="flex gap-2"><input value={ins.name||''} onChange={e=>updateNestedItem(index,'instructors',i,{name:e.target.value})} placeholder="Tên chuyên gia" className="flex-1 rounded-lg border px-3 py-2 text-sm bg-white"/><button type="button" onClick={()=>removeNestedItem(index,'instructors',i)} className="p-2 text-red-500"><Trash2 className="w-4 h-4"/></button></div>
      <input value={ins.role||''} onChange={e=>updateNestedItem(index,'instructors',i,{role:e.target.value})} placeholder="Vai trò / chức danh" className="w-full rounded-lg border px-3 py-2 text-sm bg-white"/>
      <input value={ins.imageUrl||''} onChange={e=>updateNestedItem(index,'instructors',i,{imageUrl:e.target.value})} placeholder="Link ảnh chuyên gia" className="w-full rounded-lg border px-3 py-2 text-sm bg-white"/>
      {ins.imageUrl && <img src={ins.imageUrl} alt="" className="h-28 max-w-full rounded-lg object-contain bg-white border"/>}
      <textarea value={(ins.bio||[]).join('\n')} onChange={e=>updateNestedItem(index,'instructors',i,{bio:e.target.value.split('\n')})} placeholder="Giới thiệu. Mỗi đoạn một dòng." className="w-full rounded-lg border px-3 py-2 text-sm bg-white min-h-20"/>
    </div>)}
  </div>

  const pricingEditor = (index:number) => <div className="space-y-3">
    <div className="flex justify-between items-center"><label className="text-xs font-bold text-gray-600">Gói giá</label><button type="button" onClick={()=>addNestedItem(index,'plans',{name:'Gói mới',price:0,currency:'VND',ctaText:'Đăng ký ngay',features:[]})} className="text-xs font-bold text-purple-700">+ Thêm gói</button></div>
    {(sections[index]?.content?.plans || []).map((plan:any,i:number)=><div key={plan.id||i} className="rounded-xl border bg-gray-50 p-3 space-y-2">
      <div className="flex gap-2"><input value={plan.name||''} onChange={e=>updateNestedItem(index,'plans',i,{name:e.target.value})} placeholder="Tên gói" className="flex-1 rounded-lg border px-3 py-2 text-sm bg-white"/><button type="button" onClick={()=>removeNestedItem(index,'plans',i)} className="p-2 text-red-500"><Trash2 className="w-4 h-4"/></button></div>
      <div className="grid grid-cols-2 gap-2"><input type="number" value={plan.price??0} onChange={e=>updateNestedItem(index,'plans',i,{price:Number(e.target.value)})} placeholder="Giá bán" className="rounded-lg border px-3 py-2 text-sm bg-white"/><input type="number" value={plan.originalPrice??''} onChange={e=>updateNestedItem(index,'plans',i,{originalPrice:e.target.value?Number(e.target.value):undefined})} placeholder="Giá gốc" className="rounded-lg border px-3 py-2 text-sm bg-white"/></div>
      <input value={plan.ctaText||''} onChange={e=>updateNestedItem(index,'plans',i,{ctaText:e.target.value})} placeholder="Chữ trên nút đăng ký" className="w-full rounded-lg border px-3 py-2 text-sm bg-white"/>
      <textarea value={(plan.features||[]).join('\n')} onChange={e=>updateNestedItem(index,'plans',i,{features:e.target.value.split('\n').filter(Boolean)})} placeholder="Quyền lợi, mỗi dòng một mục" className="w-full rounded-lg border px-3 py-2 text-sm bg-white min-h-20"/>
      <label className="flex gap-2 items-center text-xs font-bold"><input type="checkbox" checked={!!plan.featured} onChange={e=>updateNestedItem(index,'plans',i,{featured:e.target.checked})}/> Làm nổi bật gói này</label>
    </div>)}
  </div>

  const roadmapEditor = (index:number) => <div className="space-y-3">
    <div className="flex justify-between items-center"><label className="text-xs font-bold text-gray-600">Các chặng / giai đoạn</label><button type="button" onClick={()=>addNestedItem(index,'phases',{period:'',title:'',description:'',details:[]})} className="text-xs font-bold text-purple-700">+ Thêm chặng</button></div>
    {(sections[index]?.content?.phases || []).map((phase:any,i:number)=><div key={phase.id||i} className="rounded-xl border bg-gray-50 p-3 space-y-2">
      <div className="flex gap-2"><input value={phase.period||''} onChange={e=>updateNestedItem(index,'phases',i,{period:e.target.value})} placeholder="Thời gian / Giai đoạn" className="w-40 rounded-lg border px-3 py-2 text-sm bg-white"/><input value={phase.title||''} onChange={e=>updateNestedItem(index,'phases',i,{title:e.target.value})} placeholder="Tên chặng" className="flex-1 rounded-lg border px-3 py-2 text-sm bg-white"/><button type="button" onClick={()=>removeNestedItem(index,'phases',i)} className="p-2 text-red-500"><Trash2 className="w-4 h-4"/></button></div>
      <textarea value={phase.description||''} onChange={e=>updateNestedItem(index,'phases',i,{description:e.target.value})} placeholder="Mô tả" className="w-full rounded-lg border px-3 py-2 text-sm bg-white min-h-16"/>
      <textarea value={(phase.details||[]).join('\n')} onChange={e=>updateNestedItem(index,'phases',i,{details:e.target.value.split('\n').filter(Boolean)})} placeholder="Chi tiết, mỗi dòng một ý" className="w-full rounded-lg border px-3 py-2 text-sm bg-white min-h-16"/>
    </div>)}
  </div>

  const ctaEditor = (index:number, key:'primaryCta'|'secondaryCta'|'cta', label:string) => {
    const cta=sections[index]?.content?.[key] || {}
    return <div className="rounded-xl border bg-gray-50 p-3 grid gap-2">
      <label className="text-xs font-bold text-gray-600">{label}</label>
      <input value={cta.label||''} onChange={e=>updateNestedContent(index,key,'label',e.target.value)} placeholder="Chữ trên nút" className="w-full rounded-lg border px-3 py-2 text-sm bg-white"/>
      <div className="grid md:grid-cols-2 gap-2">
        <select value={cta.action||'scroll'} onChange={e=>updateNestedContent(index,key,'action',e.target.value)} className="rounded-lg border px-3 py-2 text-sm bg-white"><option value="open_registration">Mở đăng ký</option><option value="scroll">Cuộn tới một phần</option><option value="external_link">Mở liên kết</option></select>
        <input value={cta.target||''} onChange={e=>updateNestedContent(index,key,'target',e.target.value)} placeholder="Đích / link (nếu cần)" className="rounded-lg border px-3 py-2 text-sm bg-white"/>
      </div>
    </div>
  }

  const uploadSectionImage = async (index:number, key:string, file:File) => {
    const token=`${index}:${key}`
    setUploadingImage(token)
    setMessage(null)
    try {
      const formData=new FormData()
      formData.append('file',file)
      const response=await fetch('/api/upload/course',{method:'POST',body:formData})
      const data=await response.json()
      if(!response.ok || !data.url) throw new Error(data.error || 'Không thể tải ảnh lên')
      updateContent(index,key,data.url)
      setMessage({type:'success',text:'Đã tải ảnh lên thư viện thành công.'})
    } catch(error:any) {
      setMessage({type:'error',text:error.message || 'Tải ảnh thất bại'})
    } finally {
      setUploadingImage(null)
    }
  }

  const imageUrlField = (index:number, key:string, label:string) => {
    const value=sections[index]?.content?.[key] || ''
    const token=`${index}:${key}`
    return <div>
      <label className="block text-xs font-bold text-gray-600 mb-1">{label}</label>
      <div className="flex flex-col sm:flex-row gap-2">
        <label className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-purple-700 px-4 py-2 text-xs font-black text-white hover:bg-purple-800">
          {uploadingImage===token?'Đang tải ảnh...':'Tải ảnh lên'}
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploadingImage===token} onChange={e=>{const file=e.target.files?.[0]; if(file) void uploadSectionImage(index,key,file); e.currentTarget.value=''}} className="hidden"/>
        </label>
        <input value={value} onChange={e=>updateContent(index,key,e.target.value)} placeholder="Hoặc dán link hình ảnh..." className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm"/>
      </div>
      <p className="mt-1 text-[10px] text-gray-400">JPG, PNG, WEBP hoặc GIF • tối đa 2MB</p>
      {value && <div className="mt-2 rounded-xl border bg-gray-50 p-2"><img src={value} alt="" className="max-h-40 max-w-full rounded-lg object-contain mx-auto"/></div>}
    </div>
  }

  const paragraphsEditor = (index:number, key='paragraphs', label='Các đoạn nội dung') => <div>
    <label className="block text-xs font-bold text-gray-600 mb-1">{label}</label>
    <textarea value={(sections[index]?.content?.[key] || []).join('\n\n')} onChange={e=>updateContent(index,key,e.target.value.split(/\n\s*\n/).filter(Boolean))} placeholder="Mỗi đoạn cách nhau một dòng trống" className="w-full min-h-32 rounded-xl border border-gray-200 px-3 py-2 text-sm"/>
  </div>

  const simpleEditor = (sec: any, index: number) => {
    const common = <div className="grid gap-3">{field(index,'eyebrow','Dòng chữ nhỏ')}{field(index,'title','Tiêu đề')}{field(index,'description','Nội dung mô tả',true)}</div>
    if (sec.sectionType === 'wigrow_artwork') return <div className="grid gap-3">{imageUrlField(index,'imageUrl','Hình ảnh')}{field(index,'imageAlt','Mô tả hình ảnh')}{field(index,'title','Tiêu đề trên ảnh')}{field(index,'accent','Dòng nhấn mạnh')}{field(index,'description','Nội dung',true)}</div>
    if (sec.sectionType === 'quote') return <div className="grid gap-3">{field(index,'quote','Câu trích dẫn',true)}{field(index,'author','Tác giả')}{field(index,'caption','Ghi chú')}</div>
    if (sec.sectionType === 'closing_message') return <div className="grid gap-3">{field(index,'title','Tiêu đề')}{paragraphsEditor(index)}{field(index,'signature','Chữ ký')}</div>
    if (sec.sectionType === 'rich_content') return <div className="grid gap-3">{field(index,'eyebrow','Dòng chữ nhỏ')}{field(index,'title','Tiêu đề')}{field(index,'description','Mô tả',true)}{paragraphsEditor(index)}{imageUrlField(index,'imageUrl','Hình ảnh minh họa')}{field(index,'imageAlt','Mô tả ảnh')}<div><label className="block text-xs font-bold text-gray-600 mb-1">Vị trí ảnh</label><select value={sec.content?.imagePosition||'right'} onChange={e=>updateContent(index,'imagePosition',e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white"><option value="left">Bên trái</option><option value="right">Bên phải</option><option value="top">Phía trên</option></select></div>{ctaEditor(index,'cta','Nút hành động')}</div>
    if (sec.sectionType === 'roadmap') return <div className="grid gap-3">{field(index,'eyebrow','Dòng chữ nhỏ')}{field(index,'title','Tiêu đề')}{field(index,'description','Mô tả',true)}{roadmapEditor(index)}</div>
    if (sec.sectionType === 'instructor') return <div className="grid gap-3">{field(index,'eyebrow','Dòng chữ nhỏ')}{field(index,'title','Tiêu đề')}{field(index,'description','Mô tả',true)}{instructorsEditor(index)}</div>
    if (sec.sectionType === 'pricing') return <div className="grid gap-3">{field(index,'eyebrow','Dòng chữ nhỏ')}{field(index,'title','Tiêu đề')}{pricingEditor(index)}{field(index,'paymentNote','Ghi chú thanh toán',true)}</div>
    if (sec.sectionType === 'hero') return <div className="grid gap-3">{field(index,'eyebrow','Dòng chữ nhỏ')}{field(index,'title','Tiêu đề chính')}{field(index,'highlightedText','Dòng nhấn mạnh')}{field(index,'description','Mô tả',true)}{imageUrlField(index,'imageUrl','Ảnh chính')}{field(index,'imageAlt','Mô tả ảnh')}{ctaEditor(index,'primaryCta','Nút chính')}{ctaEditor(index,'secondaryCta','Nút phụ (không bắt buộc)')}</div>
    if (sec.sectionType === 'benefits' || sec.sectionType === 'outcomes' || sec.sectionType === 'pain_points') return <div className="grid gap-3">{field(index,'eyebrow','Dòng chữ nhỏ')}{field(index,'title','Tiêu đề')}{field(index,'description','Mô tả',true)}{listEditor(index,'items','Các mục nội dung')}</div>
    return common
  }


  return (
    <div className="space-y-6">
      <div className="sticky top-2 z-40 flex items-center gap-3 rounded-2xl border bg-white/95 backdrop-blur px-4 py-3 shadow-sm">
        <div className="flex-1 min-w-0">
          <div className="font-black text-sm text-gray-900 truncate">{name}</div>
          <div className={`text-xs ${dirty?'text-amber-600':'text-green-600'}`}>{dirty?'Có thay đổi chưa lưu':'Mọi thay đổi đã được lưu'}</div>
        </div>
        <button type="button" onClick={handleLoadVersions} className="rounded-xl border border-gray-200 px-3 py-2.5 text-xs font-bold text-gray-600">Lịch sử</button>
        <button type="button" onClick={handleSavePage} disabled={saving || !dirty} className="inline-flex items-center gap-2 rounded-xl border border-gray-900 px-4 py-2.5 text-xs font-black text-gray-900 disabled:opacity-40">
          <Save className="w-4 h-4"/>{saving?'Đang lưu...':'Lưu bản nháp'}
        </button>
        <button type="button" onClick={handlePublish} disabled={publishing || dirty} className="rounded-xl bg-black px-4 py-2.5 text-xs font-black text-yellow-400 disabled:opacity-40">
          {publishing?'Đang xuất bản...':'Xuất bản'}
        </button>
      </div>
      {showVersions && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between mb-3"><h3 className="font-black text-sm">Lịch sử phiên bản</h3><button onClick={() => setShowVersions(false)} className="text-xs text-gray-500">Đóng</button></div>
          <div className="space-y-2 max-h-64 overflow-auto">
            {versions.length === 0 && <p className="text-xs text-gray-500">Chưa có phiên bản đã lưu.</p>}
            {versions.map((version:any) => <div key={version.id} className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
              <div className="flex-1"><div className="text-xs font-black">Phiên bản {version.versionNumber} {(version.snapshot as any)?.kind === 'published' ? '• Đã xuất bản' : ''}</div><div className="text-[11px] text-gray-500">{new Date(version.createdAt).toLocaleString('vi-VN')}</div></div>
              <button type="button" onClick={() => handleRestoreVersion(version.versionNumber)} className="rounded-lg border bg-white px-3 py-2 text-xs font-bold">Khôi phục</button>
            </div>)}
          </div>
        </div>
      )}

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
                onChange={(e) => { setName(e.target.value); setDirty(true) }}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-black text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Trạng thái trang</label>
              <select
                value={status}
                onChange={(e) => { setStatus(e.target.value as any); setDirty(true) }}
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
                  onChange={(e) => { setCheckoutConfig({ ...checkoutConfig, provider: e.target.value }); setDirty(true) }}
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
                  onChange={(e) => { setCheckoutConfig({ ...checkoutConfig, paymentDescriptionPrefix: e.target.value }); setDirty(true) }}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Hạn thanh toán (Phút)</label>
                <input
                  type="number"
                  value={checkoutConfig.orderExpirationMinutes || 15}
                  onChange={(e) => { setCheckoutConfig({ ...checkoutConfig, orderExpirationMinutes: parseInt(e.target.value) }); setDirty(true) }}
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
                  onChange={(e) => { setTheme({ ...theme, primaryColor: e.target.value }); setDirty(true) }}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Secondary Color</label>
                <input
                  type="text"
                  value={theme.secondaryColor || '#E8C468'}
                  onChange={(e) => { setTheme({ ...theme, secondaryColor: e.target.value }); setDirty(true) }}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Background Color</label>
                <input
                  type="text"
                  value={theme.backgroundColor || '#1A1B26'}
                  onChange={(e) => { setTheme({ ...theme, backgroundColor: e.target.value }); setDirty(true) }}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Text Color</label>
                <input
                  type="text"
                  value={theme.textColor || '#F2E8D5'}
                  onChange={(e) => { setTheme({ ...theme, textColor: e.target.value }); setDirty(true) }}
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
                  onChange={(e) => { setSeo({ ...seo, title: e.target.value }); setDirty(true) }}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Mô tả SEO (Meta Description)</label>
                <textarea
                  value={seo.description || ''}
                  onChange={(e) => { setSeo({ ...seo, description: e.target.value }); setDirty(true) }}
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

          <div className="grid xl:grid-cols-[minmax(0,1fr)_minmax(360px,46%)] gap-4 items-start">
            <div className="space-y-3">
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
              return <div key={sec.sectionKey} onDragOver={e => e.preventDefault()} onDrop={() => { if (dragIndex !== null) reorderSections(dragIndex,index); setDragIndex(null) }} className={`rounded-2xl border bg-white overflow-hidden transition-opacity ${dragIndex===index?'opacity-50':''} ${open?'border-purple-300 shadow-sm':'border-gray-200'}`}>
                <button type="button" onClick={() => setExpandedSection(open?null:index)} className="w-full p-4 flex items-center gap-3 text-left">
                  <span draggable onDragStart={e => { e.stopPropagation(); setDragIndex(index) }} onDragEnd={() => setDragIndex(null)} onClick={e => e.stopPropagation()} title="Giữ và kéo để đổi vị trí" className="cursor-grab active:cursor-grabbing p-1 -m-1"><GripVertical className="w-4 h-4 text-gray-400 shrink-0" /></span><span className="w-7 h-7 rounded-full bg-gray-900 text-yellow-400 flex items-center justify-center text-xs font-black">{index+1}</span>
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

            <aside className="xl:sticky xl:top-4 rounded-2xl border border-gray-200 bg-gray-100 p-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="font-black text-xs text-gray-700 flex-1">XEM TRƯỚC TRANG ĐANG XUẤT BẢN</div>
                <button type="button" onClick={() => setPreviewMode('mobile')} className={`p-2 rounded-lg ${previewMode==='mobile'?'bg-black text-yellow-400':'bg-white text-gray-500'}`} title="Điện thoại"><Smartphone className="w-4 h-4"/></button>
                <button type="button" onClick={() => setPreviewMode('desktop')} className={`p-2 rounded-lg ${previewMode==='desktop'?'bg-black text-yellow-400':'bg-white text-gray-500'}`} title="Máy tính"><Monitor className="w-4 h-4"/></button>
                <button type="button" onClick={() => setPreviewKey(k=>k+1)} className="p-2 rounded-lg bg-white text-gray-500" title="Tải lại"><RefreshCw className="w-4 h-4"/></button>
              </div>
              <div className="overflow-auto rounded-xl bg-gray-300 p-2 min-h-[650px] flex justify-center">
                <iframe key={previewKey} title="Xem trước salespage" src={`/khoa-hoc/${initialPage.slug}`} className="bg-white rounded-lg border-0 shadow-sm transition-all duration-300" style={{width: previewMode==='mobile'?390:'100%', height:720}} />
              </div>
              <p className="mt-2 text-[10px] leading-4 text-gray-500">Preview hiển thị bản đang xuất bản. Sau khi lưu thay đổi, bấm ↻ để kiểm tra bản mới.</p>
            </aside>
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
