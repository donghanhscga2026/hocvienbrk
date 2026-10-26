// GĐ1 trang bán: rà soát nhập HTML/URL/ZIP — kiểm kê ảnh link ngoài, bảng gán
// sự kiện tường minh, duyệt khối, cầu nối data-mfc-action và 2 action server mới.
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const load = require('./helpers/load-ts.cjs')

const review = load('lib/course-page/import-review.ts')
const zip = load('lib/course-page/importer/zip-browser.ts', {})

const DATA_PNG = 'data:image/png;base64,' + Buffer.from('fake-png-bytes-123456').toString('base64')
const fixture = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><style>.hero{background:url("https://cdn.example.com/bg.jpg")}</style></head><body>
<header data-mfc-block="dau-trang"><nav><a href="#dang-ky">Đăng ký ngay</a><a href="https://zalo.me/123">Nhắn Zalo</a></nav></header>
<section data-mfc-block="gioi-thieu"><h1>Khóa học mẫu</h1><img src="https://i.postimg.cc/hero.jpg" alt="Ảnh hero"><img src="${DATA_PNG}" alt="Ảnh nhúng"><img srcset="https://cdn.example.com/a-480.jpg 480w, https://cdn.example.com/a-800.jpg 800w" alt="Ảnh srcset"><p><a href="#lo-trinh">Xem lộ trình</a></p><button type="button">Chia sẻ khóa học</button></section>
<section data-mfc-block="lo-trinh"><h2>Lộ trình</h2><form><input name="phone"><button>Gửi đăng ký</button></form></section>
<footer data-mfc-block="chan-trang"><a href="javascript:alert(1)">Liên kết lạ</a></footer>
</body></html>`

async function run() {
  // ── Kiểm kê ảnh ──────────────────────────────────────────────────────────
  const inventory = review.extractImageInventory(fixture)
  const imgs = inventory.filter(item => item.source === 'img')
  const css = inventory.filter(item => item.source === 'css')
  assert.equal(imgs.length, 3, 'Ba ảnh img: src, data-URI, srcset')
  assert.equal(imgs[0].kind, 'url'); assert.equal(imgs[0].currentUrl, 'https://i.postimg.cc/hero.jpg')
  assert.equal(imgs[1].kind, 'data'); assert.ok(imgs[1].bytes > 0, 'data-URI có dung lượng bytes')
  assert.match(imgs[2].currentUrl, /a-480\.jpg/, 'srcset lấy URL đầu')
  assert.equal(css.length, 1); assert.equal(css[0].currentUrl, 'https://cdn.example.com/bg.jpg')

  // Áp map: thay link data-URI bằng link HTTPS, đặt alt, lazy trừ ảnh đầu.
  const mapped = review.applyImageMap(fixture, {
    [imgs[1].id]: { url: 'https://i.postimg.cc/anh-nhung.jpg', alt: 'Ảnh đã gán link' },
    [css[0].id]: { url: 'https://cdn.example.com/bg-moi.jpg' },
  })
  assert.ok(!mapped.includes('data:image/png'), 'data-URI đã được thay bằng link ngoài')
  assert.ok(mapped.includes('https://i.postimg.cc/anh-nhung.jpg'))
  assert.ok(mapped.includes('alt="Ảnh đã gán link"'))
  assert.ok(mapped.includes('bg-moi.jpg'), 'URL ảnh trong CSS được thay')
  const imgTags = [...mapped.matchAll(/<img[^>]*>/g)].map(match => match[0])
  assert.equal(imgTags.length, 3)
  assert.ok(!/loading=/.test(imgTags[0]), 'Ảnh đầu tiên không bị lazy')
  assert.ok(/loading="lazy"/.test(imgTags[1]) && /decoding="async"/.test(imgTags[1]), 'Ảnh sau có lazy + async')
  assert.ok(/loading="lazy"/.test(imgTags[2]))

  // data-URI chưa gán link thì giữ nguyên (UI wizard chặn áp dụng ở bước này).
  const unmapped = review.applyImageMap(fixture, {})
  assert.ok(unmapped.includes('data:image/png'), 'data-URI chưa gán giữ nguyên để UI chặn')

  // ── Phần tử tương tác + gán sự kiện ──────────────────────────────────────
  const items = review.extractInteractiveElements(fixture)
  const byLabel = label => items.find(item => item.label.includes(label))
  assert.equal(byLabel('Đăng ký ngay').suggestedAction, 'register', 'Anchor #dang-ky gợi ý register')
  assert.equal(byLabel('Nhắn Zalo').suggestedAction, 'external', 'Link https gợi ý external')
  assert.equal(byLabel('Xem lộ trình').suggestedAction, 'scroll', 'Anchor nội bộ gợi ý scroll')
  assert.equal(items.find(item => item.tag === 'form').suggestedAction, 'register', 'Form gợi ý register')

  const registerEl = byLabel('Đăng ký ngay'), shareButton = items.find(item => item.tag === 'button' && item.label.includes('Chia sẻ'))
  const scrollEl = byLabel('Xem lộ trình'), zaloEl = byLabel('Nhắn Zalo'), badEl = items.find(item => (item.href || '').startsWith('javascript:'))
  const courseEl = byLabel('Nhắn Zalo')
  const { html: evented, warnings } = review.applyEventMap(fixture, {
    [registerEl.id]: { action: 'register' },
    [shareButton.id]: { action: 'share' },
    [scrollEl.id]: { action: 'scroll', target: 'lo-trinh' },
    [zaloEl.id]: { action: 'external', href: 'https://zalo.me/456' },
    [badEl.id]: { action: 'external', href: 'javascript:alert(2)' },
  })
  assert.ok(evented.includes('data-mfc-action="register"'), 'register được ghi tường minh')
  assert.ok(evented.includes('data-mfc-action="share"'), 'share được ghi tường minh')
  assert.ok(evented.includes('data-mfc-action="scroll"') && evented.includes('data-mfc-target="lo-trinh"'), 'scroll kèm khối đích')
  assert.ok(evented.includes('data-mfc-action="external"') && evented.includes('https://zalo.me/456'), 'external giữ link đã đổi')
  assert.equal(warnings.length, 1, 'href javascript: bị từ chối kèm cảnh báo')
  assert.ok(!evented.includes('data-mfc-action="external" href="javascript:'), 'Không ghi hành động cho link độc')

  const { html: coursed, warnings: courseWarnings } = review.applyEventMap(fixture, { [courseEl.id]: { action: 'course', target: 'KHOA_KHAC' } })
  assert.equal(courseWarnings.length, 0)
  assert.ok(coursed.includes('data-mfc-action="course"') && coursed.includes('data-mfc-target="/khoa-hoc/KHOA_KHAC"'), 'course chuẩn hoá slug thành đường /khoa-hoc/')

  // ── Khối ─────────────────────────────────────────────────────────────────
  const blocks = review.extractBlocks(fixture)
  assert.deepEqual(blocks.map(block => block.key), ['dau-trang', 'gioi-thieu', 'lo-trinh', 'chan-trang'])
  assert.equal(blocks[1].heading, 'Khóa học mẫu')

  // ── Map formData → liên hệ ───────────────────────────────────────────────
  assert.deepEqual(
    review.mapFormDataToContact({ ho_ten: 'Nguyễn Văn A', sdt: '0901234567', email: 'a@example.com', other: 'x' }),
    { fullName: 'Nguyễn Văn A', phone: '0901234567', email: 'a@example.com' },
  )
  assert.deepEqual(review.mapFormDataToContact({ 'Họ tên': 'Trần B', so_dien_thoai: '0912' }), { fullName: 'Trần B', phone: '0912' })

  // ── BRIDGE hiểu data-mfc-action ──────────────────────────────────────────
  assert.ok(zip.BRIDGE.includes("data-mfc-action"), 'Bridge đọc data-mfc-action')
  assert.ok(zip.BRIDGE.includes("actionType:'open_share'"), 'Bridge phát open_share')
  assert.ok(zip.BRIDGE.includes("actionType:'course_link'"), 'Bridge phát course_link từ data-action')
  assert.ok(zip.BRIDGE.includes("action==='scroll'") || zip.BRIDGE.includes('action===\'scroll\''), 'Bridge xử lý scroll tường minh')
  assert.ok(zip.BRIDGE.includes('formData'), 'Bridge giữ formData cho form đăng ký')

  // ── Route có 2 action mới + save kèm khóa khối ───────────────────────────
  const route = fs.readFileSync(path.join(__dirname, '..', 'app/api/course-templates/route.ts'), 'utf8')
  assert.ok(route.includes("'import-url'"), 'Route có action import-url')
  assert.ok(route.includes("'check-image-urls'"), 'Route có action check-image-urls')
  assert.ok(route.includes('selectedBlockKeys'), 'save-course-code ghi selectedBlockKeys')
  assert.ok(route.includes('registrationBlockKeys'), 'save-course-code ghi registrationBlockKeys')
  assert.ok(route.includes('fetchRemoteHtml') && route.includes('prepareStandaloneHtml'), 'import-url dùng fetch chống SSRF + prepare')
  assert.ok(route.includes('assertSafeUrl'), 'check-image-urls dùng lại kiểm tra URL an toàn')

  console.log('test-sales-import-gd1: PASS')
}

run().catch(error => { console.error(error); process.exit(1) })
