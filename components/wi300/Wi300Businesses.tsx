/** Danh sách ưu tiên do chủ website chọn; chưa gán logo/link khi chưa có dữ liệu chính thức. */
export const featuredBusinesses = ['Wi.Mentor', 'Wi.Tech', 'Wi.Grow', 'Wi.Finance', 'Wi.Marketing']

export default function Wi300Businesses() {
  return <section id="doanh-nghiep-tieu-bieu" aria-labelledby="wi300-businesses-title" className="mx-auto max-w-7xl scroll-mt-40 px-4 py-12 sm:px-6 lg:scroll-mt-24 lg:px-8">
    <h2 id="wi300-businesses-title" className="text-2xl font-bold text-brk-on-surface sm:text-3xl">Doanh nghiệp tiêu biểu</h2>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-brk-muted">Kết nối với các doanh nghiệp tiêu biểu trong hệ sinh thái Wi — dành cho cá nhân và doanh nghiệp cùng phát triển.</p>
    <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {featuredBusinesses.map(name => <li key={name} className="flex min-h-32 items-center justify-center rounded-2xl border border-brk-outline bg-white p-4 text-center">
        <h3 className="break-words text-lg font-extrabold text-brk-primary">{name}</h3>
      </li>)}
    </ul>
  </section>
}
