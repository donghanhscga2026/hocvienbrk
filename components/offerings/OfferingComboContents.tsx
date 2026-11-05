import Link from 'next/link'
import { comboItems } from '@/lib/offerings/combo'
import { groupInfo, offeringWorkspaceHref, type OfferingDetails } from '@/lib/offerings/shared'
import { getCurrentSiteProfile, getCourseWhereForProfile } from '@/lib/site-profile/runtime'

export default async function OfferingComboContents({
  details,
  active = false,
}: {
  details: OfferingDetails
  active?: boolean
}) {
  const profile = await getCurrentSiteProfile()
  const { status: _status, ...scope } = profile ? getCourseWhereForProfile(profile) : {}
  void _status
  const items = await comboItems(details, scope)
  return (
    <section id="combo" className="scroll-mt-28 space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-green-950">{active ? 'Combo của bạn' : 'Gói này bao gồm'}</h2>
        <p className="mt-2 text-sm leading-7 text-brk-muted">
          {active
            ? 'Chọn từng món để vào học, sử dụng hoặc đặt lịch. Quyền đã sở hữu được giữ nguyên.'
            : 'Một lần đăng ký để nhận các món dưới đây. Thời hạn sản phẩm tính từ khi kích hoạt combo; món đã có quyền không tự cộng thêm thời hạn.'}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <article key={item.id} className="flex min-w-0 flex-col gap-4 rounded-2xl border bg-white p-5">
            <div className="flex items-start gap-4">
              {item.link_anh_bia && (
                <img
                  src={item.link_anh_bia}
                  alt=""
                  loading="lazy"
                  className="h-20 w-28 rounded-xl object-cover"
                />
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-brk-primary">
                  {groupInfo[item.productGroup].label}
                  {item.gift ? ' · Quà tặng kèm' : ''}
                </p>
                <h3 className="mt-2 break-words text-xl font-bold">{item.name_lop}</h3>
              </div>
            </div>
            <p className="text-sm text-brk-muted">
              {item.productGroup === 'SERVICE'
                ? `${item.sessions} buổi · ${item.durationMin} phút/buổi`
                : item.productGroup === 'DIGITAL'
                  ? item.accessDays
                    ? `${item.accessDays} ngày từ khi kích hoạt`
                    : 'Không giới hạn thời gian'
                  : 'Quyền học theo cấu hình khóa học'}
            </p>
            {active ? (
              <Link
                href={
                  item.productGroup === 'COURSE'
                    ? `/courses/${encodeURIComponent(item.id_khoa)}/learn`
                    : offeringWorkspaceHref(item.productGroup, item.id_khoa)
                }
                className="mt-auto inline-flex min-h-12 items-center justify-center rounded-xl bg-brk-primary px-4 font-semibold text-white"
              >
                {item.productGroup === 'COURSE'
                  ? 'Vào học'
                  : item.productGroup === 'SERVICE'
                    ? 'Vào dịch vụ / Đặt lịch'
                    : 'Mở nội dung'}{' '}
                →
              </Link>
            ) : (
              <p className="text-sm text-brk-muted">
                {item.gift
                  ? 'Đã bao gồm trong giá combo'
                  : `Giá lẻ: ${item.phi_coc.toLocaleString('vi-VN')}đ`}
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}
