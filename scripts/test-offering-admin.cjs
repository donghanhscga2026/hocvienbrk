// Uses isolated DOM/API/DB fixtures only. Never writes to the live application.
const assert = require('node:assert/strict'), React = require('react'), { JSDOM } = require('jsdom')
const load = require('./helpers/load-ts.cjs')
async function run() {
  const shared = load('lib/offerings/shared.ts')
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://wi300.test/tools/courses/new?id=42&group=DIGITAL' })
  global.window = dom.window; global.document = dom.window.document; global.FormData = dom.window.FormData; global.IS_REACT_ACT_ENVIRONMENT = true
  Object.defineProperty(global, 'navigator', { configurable: true, value: dom.window.navigator })
  window.confirm = () => true
  const originalFetch = global.fetch, { createRoot } = require('react-dom/client'), root = createRoot(document.getElementById('root'))
  const details = shared.parseOfferingDetails({ kind: 'RESOURCE', instructions: 'Shared instructions', resources: [{ title: 'App One', kind: 'APP', url: 'https://app.example/one' }, { title: 'PDF Two', kind: 'EBOOK', url: 'https://files.example/two.pdf', viewer: 'PDF' }], agenda: [{ title: 'Public outline', description: 'Public benefits' }] })
  const course = { id: 42, id_khoa: 'GIFTS', name_lop: 'Gift bundle', productGroup: 'DIGITAL', type: 'NORMAL', teacherId: 3, status: false, phi_coc: 100000, mo_ta_ngan: 'Public intro', mo_ta_dai: 'Public details', link_anh_bia: '', offeringDetails: details, lessons: [{ id: 'old', title: 'Existing video', type: 'VIDEO', videoUrl: '[Part 1]https://youtu.be/dQw4w9WgXcQ', content: 'Existing body', order: 1 }] }
  let saveFails = true, saved, requests = []
  const link = { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) }
  const stub = { __esModule: true, default: () => null }
  const mocks = {
    'next/link': link,
    'next/navigation': { useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }), useSearchParams: () => new URLSearchParams('id=42&group=DIGITAL') },
    '@/components/layout/MainHeader': stub, '@/components/layout/ManagementWorkspace': { __esModule: true, default: ({ children }) => children },
    '@/components/wi300/WiCourseProjects': stub, '@/components/course/CourseManagementActivity': stub, '@/components/course/CourseSalesPagePanel': stub, '@/components/course/CourseRosterWorkspace': stub, '@/components/course/CourseActivityFeedTab': stub,
    '@/components/admin/courses/ImportLessonsModal': { ImportLessonsModal: () => null },
    '@/components/admin/courses/LessonEditModal': { LessonEditModal: ({ lesson }) => React.createElement('div', { 'data-edit-existing': lesson.id }, lesson.title) },
    '@/components/admin/courses/AddLessonModal': { AddLessonModal: () => null }, '@/components/admin/courses/LessonAnnouncementModal': { LessonAnnouncementModal: () => null },
    '@/app/actions/course-actions': { getTeachersAction: async () => ({ success: true, teachers: [{ id: 3, name: 'Owner' }] }) },
    '@/app/actions/admin-actions': { updateCourseAction: async (id, data) => { saved = { id, data }; return { success: !saveFails, error: 'Save failed fixture' } } },
  }
  global.fetch = async url => { requests.push(String(url)); return { ok: true, json: async () => url === '/api/auth/session' ? { user: { id: '3', role: 'TEACHER' } } : url === '/api/courses/42' ? course : url.includes('categories') ? { categories: [] } : url.includes('bank-accounts') ? { accounts: [] } : { vouchers: [] } } }
  const visible = element => !element.closest('[hidden]')
  const button = text => [...document.querySelectorAll('button')].find(item => item.textContent.trim() === text && visible(item))
  const click = async text => React.act(async () => { assert.ok(button(text), `Missing visible button ${text}`); button(text).click() })
  const input = async (element, value) => React.act(async () => { assert.ok(element); const proto = element.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(element, value); element.dispatchEvent(new window.Event('input', { bubbles: true })); element.dispatchEvent(new window.Event('change', { bubbles: true })) })
  const Page = load('app/tools/courses/new/page.tsx', mocks).default
  try {
    await React.act(async () => root.render(React.createElement(Page)))
    assert.ok(button('Trang giới thiệu') && button('Nội dung sử dụng') && button('Giá & Quyền lợi'))
    assert.equal(document.querySelectorAll('nav[aria-label="Nhóm thông tin khóa học"]').length, 0, 'Offerings do not show the nested course settings menu')
    await click('Nội dung sử dụng')
    await input(document.querySelector('[aria-label="Hướng dẫn riêng tài nguyên"]'), 'Private guide for App One')
    await input(document.querySelector('[aria-label="Nguồn hướng dẫn riêng tài nguyên"]'), 'https://files.example/guide.pdf')
    await click('Xem thử trong web')
    assert.ok([...document.querySelectorAll('iframe')].some(frame => frame.src === 'https://app.example/one'))
    assert.ok([...document.querySelectorAll('iframe')].some(frame => frame.src === 'https://files.example/guide.pdf'))
    await click('Trang giới thiệu')
    assert.equal(document.querySelector('[data-info-group="description"]').hidden, false)
    assert.equal(document.querySelector('[data-info-group="payment"]').hidden, true)
    await click('Giá & Quyền lợi')
    await input(document.querySelector('[data-help-id="input-course-fee"]'), '250000')
    await click('Nội dung sử dụng')
    assert.equal(document.querySelector('[aria-label="Hướng dẫn riêng tài nguyên"]').value, 'Private guide for App One', 'Switching tabs preserves the resource draft')
    await React.act(async () => document.querySelector('#course-settings-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })))
    assert.ok(document.querySelector('[role="alert"]').textContent.includes('Save failed fixture'))
    assert.equal(saved.data.phi_coc, 250000)
    assert.equal(saved.data.offeringDetails.resources[0].instructions, 'Private guide for App One')
    assert.equal(saved.data.offeringDetails.resources[1].url, 'https://files.example/two.pdf')
    assert.equal(saved.data.mo_ta_ngan, 'Public intro', 'Hidden public fields are preserved on resource saves')
    assert.equal(document.querySelector('[aria-label="Hướng dẫn riêng tài nguyên"]').value, 'Private guide for App One', 'Failed save keeps draft')
    saveFails = false
    await React.act(async () => document.querySelector('#course-settings-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })))
    assert.ok(document.querySelector('[role="status"]').textContent.includes('thành công'))
    const old = [...document.querySelectorAll('[aria-label="Chọn nội dung để chỉnh sửa"] button')].find(item => item.textContent.includes('Existing video'))
    await React.act(async () => old.click())
    await click('Sửa nội dung này')
    assert.equal(document.querySelector('[data-edit-existing]').getAttribute('data-edit-existing'), 'old', 'Existing lesson content remains editable without conversion')
    assert.ok(!requests.some(url => url.includes('/resources/')), 'Owner preview uses authorized draft data without requiring a purchased-resource API call')
    const Reply = load('components/offerings/OfferingServiceReply.tsx').default
    let draft = 'A useful reply', repliesSent = 0, replySuccess = false
    const renderReply = version => root.render(React.createElement(Reply, { key: version, id: 'request-one', version, value: draft, onChange: value => { draft = value; renderReply(version) }, onSaved: () => { repliesSent++ } }))
    global.fetch = async (url, init) => { assert.equal(url, '/api/crm/requests'); const body = JSON.parse(init.body); assert.equal(body.action, 'SEND_REPLY'); assert.equal(body.id, 'request-one'); return { ok: replySuccess, status: replySuccess ? 200 : 409, json: async () => replySuccess ? {} : { error: 'Reply changed; reload' } } }
    await React.act(async () => renderReply(1))
    await click('Gửi phản hồi')
    assert.equal(draft, 'A useful reply'); assert.equal(repliesSent, 0)
    assert.ok(document.querySelector('[role="alert"]').textContent.includes('reload'))
    assert.equal(button('Gửi phản hồi').disabled, true, 'Conflicting reply requires fresh version before retry')
    replySuccess = true
    await React.act(async () => renderReply(2))
    await click('Gửi phản hồi')
    assert.equal(draft, ''); assert.equal(repliesSent, 1)
  } finally { await React.act(async () => root.unmount()); dom.window.close(); global.fetch = originalFetch }

  class CrmError extends Error { constructor(message, status) { super(message); this.status = status } }
  let actor = { id: 3, role: 'TEACHER' }, accessible = true, active = true, readUser, selectedGroup = 'SERVICE'
  const db = {
    course: { findUnique: async () => ({ id: 42, teacherId: accessible ? 3 : 9, productGroup: selectedGroup }), findMany: async ({ where }) => { assert.equal(where.teacherId, 3); return accessible ? [{ id: 42, productGroup: 'DIGITAL', feeType: 'MIEN_PHI', phi_coc: 0, teacherBankAccountId: null, link_anh_bia: null, mo_ta_ngan: null, mo_ta_dai: null }] : [] } },
    enrollment: { findUnique: async () => active ? { status: 'ACTIVE' } : null, findMany: async ({ where }) => { assert.equal(where.courseId, 42); return [{ id: 1, userId: 0, status: 'ACTIVE', activatedAt: new Date('2020-01-01T00:00:00Z'), payment: null, user: { name: 'Zero' } }] }, count: async ({ where }) => where.status === 'ACTIVE' && where.OR ? 1 : 1, groupBy: async () => [{ status: 'PENDING', _count: { _all: 2 } }, { status: 'ACTIVE', _count: { _all: 4 } }] },
    booking: { findMany: async ({ where }) => { readUser = where.userId; assert.equal(where.session.courseId, 42); return [] } }, crmRequest: { findMany: async ({ where }) => { assert.equal(where.userId, 0); assert.equal(where.courseId, 42); return [] } },
    lesson: { count: async () => 0 }, systemConfig: { findMany: async () => [{ key: 'catalog:offering:42', value: shared.parseOfferingDetails({ accessDays: 30 }) }] },
  }
  const serverMocks = { '@/lib/prisma': { __esModule: true, default: db }, '@/lib/course-page/permissions': { courseEditorActor: async () => { if (!actor) throw new CrmError('Unauthorized', 401); return actor } }, '@/lib/crm/service': { CrmError } }
  const operations = load('app/api/offerings/[slug]/operations/route.ts', serverMocks)
  const options = { params: Promise.resolve({ slug: 'SERVICE' }) }
  assert.equal((await operations.GET(new Request('https://wi300.test/api/offerings/SERVICE/operations?userId=0'), options)).status, 200)
  assert.equal(readUser, 0, 'Account zero is a valid selected customer')
  accessible = false
  assert.equal((await operations.GET(new Request('https://wi300.test/api/offerings/SERVICE/operations?userId=0'), options)).status, 403)
  accessible = true; active = false
  assert.equal((await operations.GET(new Request('https://wi300.test/api/offerings/SERVICE/operations?userId=0'), options)).status, 404)
  active = true
  const summary = load('app/api/offerings/management-summary/route.ts', serverMocks)
  const summaryResponse = await summary.GET(new Request('https://wi300.test/api/offerings/management-summary?ids=42'))
  assert.equal(summaryResponse.headers.get('cache-control'), 'private, no-store')
  const row = (await summaryResponse.json()).rows[0]
  assert.deepEqual([row.pending, row.active, row.expired, row.total], [2, 3, 1, 6])
  assert.ok(row.warnings.includes('Chưa có nội dung sử dụng') && !row.warnings.includes('Chưa có giá bán'), 'Intentionally free content is not reported as a missing price')
  selectedGroup = 'DIGITAL'
  const customers = load('app/api/offerings/[slug]/customers/route.ts', { ...serverMocks, '@/lib/offerings/server': { readOfferingDetails: async () => shared.parseOfferingDetails({ accessDays: 30 }) } })
  const customersResponse = await customers.GET(new Request('https://wi300.test/api/offerings/PRODUCT/customers'), options)
  assert.equal(customersResponse.status, 200)
  assert.equal((await customersResponse.json()).rows[0].state, 'EXPIRED', 'Customer list uses the same expiry rule as protected resource access')
  accessible = false
  assert.equal((await customers.GET(new Request('https://wi300.test/api/offerings/PRODUCT/customers'), options)).status, 403)
  assert.equal((await summary.GET(new Request('https://wi300.test/api/offerings/management-summary?ids=42'))).status, 403)
  actor = null
  assert.equal((await summary.GET(new Request('https://wi300.test/api/offerings/management-summary?ids=42'))).status, 401)
  console.log('Offering administration: section navigation, retained drafts/hidden values, failed save recovery, per-resource inline preview/guides, editable existing content, scoped operations/account zero, accurate entitlement counts and readiness warnings passed.')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
