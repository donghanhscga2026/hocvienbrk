'use client'

import { useState, type FormEvent } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, Download, LayoutTemplate, Monitor, Plus, Smartphone, Sparkles, Trash2 } from 'lucide-react'
import { createLandingDraft, initialBrief, landingHtml, makeLandingOutline, moveLandingSection, newLandingSection, outlineError, safeLandingUrl, type LandingBrief, type LandingSection } from '@/lib/wi300/landing-ai'

const input = 'mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-emerald-600'
const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-40'
const secondary = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50'
const panel = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6'

function BriefField({ label, value, onChange, multiline = false, required = false, placeholder = '' }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean; required?: boolean; placeholder?: string }) {
  return <label className="block text-sm font-semibold text-slate-700">{label}{required && <span className="text-red-600"> *</span>}
    {multiline ? <textarea className={input + ' min-h-28 resize-y'} value={value} onChange={event => onChange(event.target.value)} maxLength={2000} required={required} placeholder={placeholder} /> : <input className={input} value={value} onChange={event => onChange(event.target.value)} maxLength={200} required={required} placeholder={placeholder} />}
  </label>
}

/** Toàn bộ thao tác của bản thử ở trình duyệt; chưa gọi AI, CRM hoặc lưu database. */
export default function WiLandingAI() {
  const [brief, setBrief] = useState<LandingBrief>(initialBrief)
  const [step, setStep] = useState(0)
  const [outline, setOutline] = useState<LandingSection[]>([])
  const [draft, setDraft] = useState<LandingSection[]>([])
  const [selected, setSelected] = useState('')
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const editBrief = <K extends keyof LandingBrief>(key: K, value: LandingBrief[K]) => setBrief(old => ({ ...old, [key]: value }))
  const current = draft.find(section => section.id === selected) || draft[0]
  const nextOutline = (event: FormEvent) => {
    event.preventDefault()
    const message = outlineError(brief)
      || (brief.ctaUrl && !safeLandingUrl(brief.ctaUrl) ? 'Đường dẫn liên hệ cần bắt đầu bằng https://.' : '')
      || (brief.imageUrl && !safeLandingUrl(brief.imageUrl) ? 'Đường dẫn ảnh cần bắt đầu bằng https://.' : '')
    if (message) { setError(message); return }
    setOutline(makeLandingOutline(brief)); setStep(1); setError(''); setNotice('')
  }
  const createDraft = () => {
    const result = createLandingDraft(brief, outline)
    setDraft(result); setSelected(result[0].id); setStep(2); setNotice('Đã tạo bản nháp từ mẫu. Những phần chưa có thông tin được đánh dấu để bạn bổ sung.')
  }
  const editSection = (key: 'title' | 'body', value: string) => {
    if (!current) return
    setDraft(old => old.map(section => section.id === current.id ? { ...section, [key]: value, ...(key === 'body' ? { needsInput: !value.trim() } : {}) } : section))
  }
  const download = () => {
    const blob = new Blob([landingHtml(brief, draft)], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url; anchor.download = 'wi-landing-ban-nhap.html'
    document.body.appendChild(anchor); anchor.click(); anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setNotice('Đã tải HTML bản nháp. Kiểm tra các phần cần bổ sung và đường dẫn liên hệ trước khi sử dụng.')
  }

  return <div className="mx-auto w-full max-w-7xl space-y-6 bg-slate-50 px-3 py-5 text-slate-900 sm:px-6 sm:py-8">
    <header className="overflow-hidden rounded-3xl bg-slate-950 p-5 text-white sm:p-8">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-emerald-200"><Sparkles size={14} aria-hidden="true" />Wi Landing AI · Bản thử giao diện</div>
      <h2 className="max-w-2xl text-2xl font-bold tracking-tight sm:text-4xl">Từ ý tưởng đến một trang giới thiệu rõ ràng.</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Chọn cấu trúc, duyệt dàn ý rồi chỉnh sửa trang của bạn. Bạn luôn quyết định nội dung cuối cùng.</p>
      <p className="mt-4 text-xs leading-5 text-emerald-200">Chưa kết nối AI thật. Bản thử sử dụng mẫu và thông tin bạn nhập, chưa lưu hoặc xuất bản lên website.</p>
    </header>
    <nav aria-label="Các bước tạo landing page" className="grid grid-cols-3 gap-2">
      {['Thông tin','Duyệt dàn ý','Chỉnh sửa trang'].map((label, index) => <button key={label} type="button" disabled={index === 1 ? !outline.length : index === 2 ? !draft.length : false} aria-current={step === index ? 'step' : undefined} onClick={() => { setStep(index); setError('') }} className={'flex min-h-14 min-w-0 items-center justify-center gap-2 rounded-2xl border px-2 text-xs font-semibold sm:text-sm ' + (step === index ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-200 bg-white text-slate-600 disabled:opacity-40')}><span className="shrink-0">{index + 1}.</span><span>{label}</span></button>)}
    </nav>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

    {step === 0 && <form onSubmit={nextOutline} className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className={panel + ' space-y-5'}>
        <div><h3 className="text-lg font-bold">Bạn muốn giới thiệu điều gì?</h3><p className="mt-1 text-sm text-slate-500">Thông tin càng cụ thể, bản nháp càng gần với nhu cầu.</p></div>
        <fieldset><legend className="text-sm font-semibold">Loại landing page</legend><div className="mt-2 grid grid-cols-3 gap-2">{([{ id: 'course', label: 'Khóa học' },{ id: 'service', label: 'Dịch vụ' },{ id: 'gift', label: 'Quà tặng' }] as const).map(item => <label key={item.id} className={'flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border px-2 text-xs sm:text-sm ' + (brief.kind === item.id ? 'border-emerald-700 bg-emerald-50' : 'border-slate-200')}><input type="radio" name="landing-kind" checked={brief.kind === item.id} onChange={() => editBrief('kind', item.id)} />{item.label}</label>)}</div></fieldset>
        <BriefField label="Tên sản phẩm hoặc dịch vụ" value={brief.name} onChange={value => editBrief('name',value)} required placeholder="Ví dụ: Khóa học Zalo Mastery" />
        <BriefField label="Khách hàng bạn muốn phục vụ" value={brief.audience} onChange={value => editBrief('audience',value)} required placeholder="Ví dụ: Chủ doanh nghiệp nhỏ" />
        <BriefField label="Lợi ích chính" value={brief.benefits} onChange={value => editBrief('benefits',value)} multiline placeholder="Mỗi lợi ích một dòng, dùng thông tin thực tế bạn có." />
        <div className="grid gap-4 sm:grid-cols-2"><BriefField label="Người cung cấp / giảng viên" value={brief.expert} onChange={value => editBrief('expert',value)} /><BriefField label="Giá và quyền lợi" value={brief.price} onChange={value => editBrief('price',value)} placeholder="Để trống nếu chưa công bố giá" /></div>
        <div className="grid gap-4 sm:grid-cols-2"><BriefField label="Chữ trên nút liên hệ" value={brief.cta} onChange={value => editBrief('cta',value)} /><BriefField label="Đường dẫn liên hệ" value={brief.ctaUrl} onChange={value => editBrief('ctaUrl',value)} placeholder="https://..." /></div>
        <BriefField label="Đường dẫn ảnh bìa (tùy chọn)" value={brief.imageUrl} onChange={value => editBrief('imageUrl',value)} placeholder="https://..." />
      </div>
      <aside className={panel + ' space-y-5 lg:self-start'}>
        <h3 className="flex items-center gap-2 text-lg font-bold"><LayoutTemplate size={20} aria-hidden="true" />Cách tạo cấu trúc</h3>
        <fieldset className="space-y-2"><legend className="sr-only">Cách tạo cấu trúc</legend>{([{ id: 'template', title: 'Theo mẫu', text: 'Dùng bố cục có sẵn theo loại trang.' },{ id: 'suggest', title: 'AI đề xuất — mô phỏng', text: 'Thử cách đề xuất dàn ý từ thông tin đã nhập.' },{ id: 'custom', title: 'Theo ý tôi', text: 'Nhập các phần theo đúng thứ tự bạn muốn.' }] as const).map(item => <label key={item.id} className={'flex cursor-pointer items-start gap-3 rounded-xl border p-3 ' + (brief.mode === item.id ? 'border-emerald-700 bg-emerald-50' : 'border-slate-200')}><input type="radio" name="landing-mode" checked={brief.mode === item.id} onChange={() => editBrief('mode',item.id)} className="mt-1" /><span><span className="block text-sm font-semibold">{item.title}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{item.text}</span></span></label>)}</fieldset>
        {brief.mode === 'custom' && <BriefField label="Dàn ý riêng (mỗi phần một dòng)" value={brief.customOutline} onChange={value => editBrief('customOutline',value)} multiline placeholder={'Mở đầu\nLợi ích\nGiới thiệu chuyên gia\nĐăng ký'} />}
        <label className="block text-sm font-semibold">Phong cách<select value={brief.style} onChange={event => editBrief('style',event.target.value as LandingBrief['style'])} className={input}><option value="bright">Sáng và thân thiện</option><option value="bold">Đậm và nổi bật</option><option value="minimal">Tối giản</option></select></label>
        <label className="flex items-center justify-between gap-3 text-sm font-semibold">Màu chủ đạo<input type="color" aria-label="Màu chủ đạo" value={brief.color} onChange={event => editBrief('color',event.target.value)} className="h-11 w-16 cursor-pointer rounded-lg" /></label>
        <button type="submit" className={button + ' w-full'}>Tạo dàn ý mẫu<ArrowRight size={16} aria-hidden="true" /></button>
        <p className="text-xs leading-5 text-slate-500">Bạn sẽ duyệt dàn ý ở bước tiếp theo trước khi tạo trang.</p>
      </aside>
    </form>}

    {step === 1 && <section className={panel + ' space-y-5'} aria-label="Dàn ý landing page">
      <div><h3 className="text-xl font-bold">Duyệt cấu trúc trước khi tạo trang</h3><p className="mt-2 text-sm text-slate-500">Đổi tên, thêm, bỏ hoặc sắp xếp lại các phần. Nội dung chưa được tạo ở bước này.</p></div>
      <ol className="space-y-3">{outline.map((section,index) => <li key={section.id} className="flex min-w-0 flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3"><span className="w-6 text-sm text-slate-500">{index+1}.</span><input aria-label={'Tên phần ' + (index+1)} value={section.title} maxLength={80} required onChange={event => setOutline(old => old.map(item => item.id === section.id ? { ...item, title: event.target.value } : item))} className={input + ' mt-0 min-w-0 flex-1 basis-36'} /><div className="flex gap-1"><button type="button" aria-label={'Đưa phần ' + (index+1) + ' lên'} disabled={index===0} onClick={() => setOutline(old => moveLandingSection(old,index,-1))} className="min-h-11 min-w-11 rounded-lg border border-slate-200 disabled:opacity-30"><ArrowUp size={16} className="mx-auto" /></button><button type="button" aria-label={'Đưa phần ' + (index+1) + ' xuống'} disabled={index===outline.length-1} onClick={() => setOutline(old => moveLandingSection(old,index,1))} className="min-h-11 min-w-11 rounded-lg border border-slate-200 disabled:opacity-30"><ArrowDown size={16} className="mx-auto" /></button><button type="button" aria-label={'Xóa phần ' + (index+1)} disabled={outline.length===1} onClick={() => setOutline(old => old.filter(item => item.id !== section.id))} className="min-h-11 min-w-11 rounded-lg border border-slate-200 text-red-600 disabled:opacity-30"><Trash2 size={16} className="mx-auto" /></button></div></li>)}</ol>
      <button type="button" disabled={outline.length>=12} onClick={() => setOutline(old => [...old,newLandingSection()])} className={secondary}><Plus size={16} aria-hidden="true" />Thêm phần</button>
      <div className="flex flex-wrap justify-between gap-3 border-t border-slate-100 pt-5"><button type="button" onClick={() => setStep(0)} className={secondary}><ArrowLeft size={16} aria-hidden="true" />Sửa thông tin</button><button type="button" onClick={createDraft} disabled={!outline.length || outline.some(section=>!section.title.trim())} className={button}><Check size={16} aria-hidden="true" />Duyệt dàn ý và tạo bản nháp</button></div>
    </section>}

    {step === 2 && <section className="space-y-4" aria-label="Chỉnh sửa và xem trước">
      <div className="flex flex-wrap items-center justify-between gap-3"><button type="button" onClick={() => setStep(1)} className={secondary}><ArrowLeft size={16} aria-hidden="true" />Sửa dàn ý</button><button type="button" onClick={download} className={button}><Download size={16} aria-hidden="true" />Tải HTML bản nháp</button></div>
      <div className="grid min-w-0 gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className={panel + ' space-y-5 xl:self-start'}>
          <h3 className="text-lg font-bold">Chỉnh sửa từng phần</h3>
          <label className="block text-sm font-semibold">Chọn phần<select className={input} value={current?.id || ''} onChange={event => setSelected(event.target.value)}>{draft.map((section,index)=><option key={section.id} value={section.id}>{index+1}. {section.title}</option>)}</select></label>
          {current && <><BriefField label="Tiêu đề phần" value={current.title} onChange={value=>editSection('title',value)} /><BriefField label="Nội dung phần" value={current.body} onChange={value=>editSection('body',value)} multiline /></>}
          <label className="block text-sm font-semibold">Phong cách trang<select value={brief.style} onChange={event=>editBrief('style',event.target.value as LandingBrief['style'])} className={input}><option value="bright">Sáng và thân thiện</option><option value="bold">Đậm và nổi bật</option><option value="minimal">Tối giản</option></select></label>
          <label className="flex items-center justify-between text-sm font-semibold">Màu trang<input type="color" aria-label="Màu trang" value={brief.color} onChange={event=>editBrief('color',event.target.value)} className="h-11 w-16" /></label>
          <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">{draft.filter(section=>section.needsInput).length} phần cần bổ sung thông tin. Minh chứng, giá và điều kiện cần do bạn xác nhận.</p>
          <p className="text-xs leading-5 text-slate-500">Bản nháp chỉ ở phiên làm việc này. Bạn có thể tải HTML để giữ lại; chưa có lưu tài khoản, AI chỉnh sửa hay nút xuất bản.</p>
        </aside>
        <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white p-3"><h3 className="text-sm font-semibold">Xem trước</h3><div className="flex gap-2"><button type="button" aria-pressed={viewport==='desktop'} onClick={()=>setViewport('desktop')} className={secondary + ' px-3'}><Monitor size={16} aria-hidden="true" />Máy tính</button><button type="button" aria-pressed={viewport==='mobile'} onClick={()=>setViewport('mobile')} className={secondary + ' px-3'}><Smartphone size={16} aria-hidden="true" />Điện thoại</button></div></div>
          <div className="p-2 sm:p-4"><iframe title="Bản nháp landing page" sandbox="" srcDoc={landingHtml(brief,draft)} className={'mx-auto block h-[80dvh] min-h-[640px] max-w-full rounded-xl border-0 bg-white shadow-sm ' + (viewport==='mobile' ? 'w-[375px]' : 'w-full')} /></div>
        </div>
      </div>
    </section>}
  </div>
}
