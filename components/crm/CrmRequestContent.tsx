import type { partnerDetails } from '@/lib/crm/partner-details'

export default function CrmRequestContent({ content, partner }: { content: string; partner?: ReturnType<typeof partnerDetails> | null }) {
  if (!partner) return <section className="rounded-2xl border border-slate-200 bg-white p-4"><h3 className="mb-2 text-xs font-semibold text-slate-500">Nội dung yêu cầu</h3><p className="whitespace-pre-wrap break-words text-sm leading-6">{content}</p></section>
  return <section aria-label="Hồ sơ đăng ký đối tác" className="space-y-3">
    <div className="grid gap-3 sm:grid-cols-2">{[{ label: 'Loại đối tác', value: partner.kind === 'BUSINESS' ? 'Doanh nghiệp' : partner.kind === 'TEACHER' ? 'Giảng viên' : partner.kind === 'BOTH' ? 'Giảng viên và doanh nghiệp' : 'Cần xác minh' }, { label: 'Doanh nghiệp', value: partner.organization }, { label: 'Chuyên môn / lĩnh vực', value: partner.expertise }].filter(item => item.value).map(item => <div key={item.label} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs text-slate-500">{item.label}</p><p className="mt-1 break-words font-semibold">{item.value}</p></div>)}</div>
    <div className="rounded-2xl border border-slate-200 bg-white p-4"><h3 className="mb-2 font-semibold">Đề xuất hợp tác</h3><p className="whitespace-pre-wrap break-words text-sm leading-6">{partner.legacy ? content : partner.proposal || 'Chưa ghi đề xuất.'}</p>{partner.portfolio && <p className="mt-3 whitespace-pre-wrap break-words text-sm text-slate-500">Hồ sơ tham khảo: {partner.portfolio}</p>}</div>
  </section>
}
