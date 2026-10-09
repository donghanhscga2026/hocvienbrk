const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const ts = require('typescript')
const React = require('react')
const { JSDOM } = require('jsdom')
const { act } = React
function load(file, overrides = {}) {
  const module = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  new Function('require', 'module', 'exports', code)(name => name in overrides ? overrides[name] : require(name), module, module.exports)
  return module.exports
}
async function run() {
  const catalog = load('lib/wi300/catalog.ts')
  const helpers = load('lib/wi300/personal-space.ts', { './catalog': catalog })
  assert.equal(helpers.pendingCourseLabel(), 'Chờ xử lý đăng ký')
  assert.equal(helpers.pendingCourseLabel({ status: 'PENDING', amount: 100, proofImage: null }), 'Chờ thanh toán')
  assert.equal(helpers.pendingCourseLabel({ status: 'PENDING', amount: 100, proofImage: 'proof.png' }), 'Chờ duyệt thanh toán')
  assert.equal(helpers.pendingCourseLabel({ status: 'VERIFIED', amount: 100, proofImage: 'proof.png' }), 'Chờ kích hoạt')
  assert.equal(helpers.pendingCourseLabel({ status: 'REJECTED', amount: 100, proofImage: 'proof.png' }), 'Minh chứng chưa được chấp nhận')
  assert.equal(helpers.pendingCourseLabel({ status: 'CANCELLED', amount: 100, proofImage: null }), 'Thanh toán đã hủy')

  const tools = [
    { id: 1, slug: 'crm', name: 'Chăm sóc khách hàng', url: '/tools/crm', roles: ['TEACHER'], isActive: true },
    { id: 2, slug: 'youtube-tools', name: 'YouTube', url: '/tools/youtube-tools', roles: [], isActive: true },
    { id: 3, slug: 'custom-page', name: 'Trang của tôi', url: '/tools/pages?tab=my-site', roles: [], isActive: true },
    { id: 4, slug: 'backup', name: 'Sao lưu', url: '/tools/backup', roles: ['ADMIN'], isActive: true },
    { id: 5, slug: 'custom', name: 'Công cụ mới', url: '/tools/new-helper', roles: [], isActive: true },
  ]
  assert.equal(helpers.isContentTool(tools[2]), true)
  assert.equal(helpers.toolGroup(tools[0]), 'marketing')
  assert.equal(helpers.toolGroup(tools[4]), 'other')
  assert.deepEqual(helpers.filterPersonalTools(tools, 'cham soc', 'marketing').map(t => t.id), [1])
  assert.deepEqual(helpers.filterPersonalTools(tools, 'youtube', 'system'), [])

  const dom = new JSDOM('<div id="root"></div>', { url: 'https://wi300.vn/my-space?tab=learning' })
  global.window = dom.window; global.document = dom.window.document; global.IS_REACT_ACT_ENVIRONMENT = true
  const { createRoot } = require('react-dom/client')
  const link = { __esModule: true, default: ({ children, scroll, onNavigate, ...props }) => React.createElement('a', props, children) }
  let params = new URLSearchParams('tab=learning')
  let role = 'STUDENT'
  let paymentProps = null
  let refreshCalls = 0
  const SpaceModule = load('components/wi300/Wi300PersonalSpace.tsx', {
    'next/link': link, 'next-auth/react': { useSession: () => ({ data: { user: { role, name: 'Lucy' } } }) },
    'next/navigation': { useSearchParams: () => params, useRouter: () => ({ refresh: () => { refreshCalls++ } }) },
    'next/dynamic': { __esModule: true, default: () => props => { paymentProps = props; return React.createElement('div', { 'data-payment': true }, 'Payment') } },
    '@/lib/wi300/catalog': catalog, '@/lib/wi300/personal-space': helpers,
  })
  // Các quy tắc role giống trang tools cũ, kể cả ADMIN không tự có quyền DEVELOPER.
  for (const [actor, allowed, expected] of [['STUDENT', ['ADMIN'], false], ['STUDENT', [], true], ['TEACHER', ['STUDENT'], true], ['ADMIN', ['TEACHER'], true], ['ADMIN', ['DEVELOPER'], false]]) assert.equal(SpaceModule.canUseTool(actor, allowed), expected)
  const courses = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, id_khoa: `C${i + 1}`, name_lop: `Khóa ${i + 1}` }))
  const enrollments = courses.map(course => ({ courseId: course.id, status: 'ACTIVE', completedCount: 1, totalLessons: 10, hiddenFromGifts: false, lastStudiedAt: new Date(`2026-10-${String(course.id).padStart(2, '0')}T10:00:00Z`) }))
  enrollments[8].completedCount = 10
  enrollments[9].status = 'PENDING'
  enrollments[9].payment = { id: 77, status: 'PENDING', amount: 100, proofImage: 'proof.png', qrCodeUrl: 'saved-qr.png', transferContent: 'saved-content' }
  const savedFetch = global.fetch
  global.fetch = async () => ({ ok: true, json: async () => ({ tools }) })
  const root = createRoot(document.getElementById('root'))
  const render = () => root.render(React.createElement(SpaceModule.default, { courses, enrollments, userId: 42, userPhone: 'test', accountError: false }))
  try {
    await act(async () => render())
    assert.equal(document.querySelectorAll('article').length, 6)
    assert.match(document.querySelector('[aria-label="Phân trang khóa học"]').textContent, /Trang 1\/2/)
    await act(async () => [...document.querySelectorAll('button')].find(b => b.textContent.includes('Trang sau')).click())
    assert.equal(document.querySelectorAll('article').length, 2)
    await act(async () => document.getElementById('learning-tab-completed').click())
    assert.equal(document.querySelectorAll('article').length, 1)
    assert.match(document.querySelector('article').textContent, /Khóa 9/)
    assert.equal(document.querySelector('[aria-label="Phân trang khóa học"]'), null)
    await act(async () => document.getElementById('learning-tab-pending').click())
    assert.match(document.querySelector('article').textContent, /Chờ duyệt thanh toán/)
    await act(async () => [...document.querySelectorAll('button')].find(b => b.textContent === 'Xem thanh toán').click())
    assert.equal(paymentProps.enrollment.payment.id, 77)
    assert.equal(paymentProps.enrollment.payment.qrCodeUrl, 'saved-qr.png')
    await act(async () => paymentProps.onUploadProof(77))
    assert.equal(refreshCalls, 1)
    await act(async () => paymentProps.onClose())
    await act(async () => document.getElementById('learning-tab-pending').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Home', bubbles: true })))
    assert.equal(document.getElementById('learning-tab-active').getAttribute('aria-selected'), 'true')
    assert.equal(document.querySelectorAll('article').length, 6)
    params = new URLSearchParams('tab=tools')
    await act(async () => render())
    assert.equal(document.querySelector('a[href="/tools/backup"]'), null)
    assert.equal(document.querySelector('a[href="/tools/crm"]'), null)
    assert.equal(document.querySelector('a[href^="/tools/pages"]'), null, 'Nội dung ở mục riêng')
    const select = document.getElementById('wi300-tool-group')
    assert.deepEqual([...select.options].map(o => o.value), ['', 'utilities', 'other'])
    await act(async () => { select.value = 'utilities'; select.dispatchEvent(new window.Event('change', { bubbles: true })) })
    assert.ok(document.querySelector('a[href="/tools/youtube-tools"]'))
    assert.equal(document.querySelector('a[href="/tools/new-helper"]'), null)
    const search = document.querySelector('input[type="search"]')
    await act(async () => { Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(search, 'khong co'); search.dispatchEvent(new window.Event('input', { bubbles: true })) })
    assert.match(document.body.textContent, /Không tìm thấy công cụ/)
    params = new URLSearchParams('tab=pages')
    await act(async () => render())
    assert.ok(document.querySelector('a[href^="/tools/pages"]'))
  } finally { global.fetch = savedFetch }

  let pushed = null
  const assistant = load('components/auth/AccountAssistantContext.tsx', {
    'next/navigation': { useRouter: () => ({ push: href => { pushed = href } }) },
    'next/dynamic': { __esModule: true, default: () => () => React.createElement('div', { 'data-assistant': true }, 'Video') },
  })
  function AssistantButton() { const ctx = assistant.useAccountAssistant(); return React.createElement('button', { onClick: ctx.openAssistant }, 'Open') }
  await act(async () => root.render(React.createElement(assistant.AccountAssistantProvider, { enabled: false }, React.createElement(AssistantButton))))
  await act(async () => document.querySelector('button').click())
  assert.equal(document.querySelector('[data-assistant]'), null)
  assert.equal(new URL(pushed, window.location.origin).searchParams.get('callbackUrl'), '/my-space?tab=learning')
  await act(async () => root.render(React.createElement(assistant.AccountAssistantProvider, null, React.createElement(AssistantButton))))
  await act(async () => document.querySelector('button').click())
  assert.ok(document.querySelector('[data-assistant]'), 'Web cũ vẫn dùng trợ lý mặc định')
  let assistantEnabled = false
  const Registration = load('components/course-page/RegistrationFlowModal.tsx', {
    'next/link': link, 'next/image': { __esModule: true, default: props => React.createElement('img', props) },
    'next-auth/react': { useSession: () => ({ data: null }) },
    '@/components/auth/AccountAssistantModal': { __esModule: true, default: () => React.createElement('div', { 'data-registration-assistant': true }, 'Video') },
    '@/components/auth/AccountAssistantContext': { useAccountAssistant: () => ({ enabled: assistantEnabled }) },
    '@/app/actions/course-actions': {}, '@/lib/bank-bin': { resolveBankBin: () => '' }, '@/lib/affiliate/get-client-ref': { getClientRef: () => null },
  }).default
  const registrationProps = { course: { id: 1, id_khoa: 'C1', name_lop: 'Khóa 1' }, session: null, userId: null, userPhone: null, onClose() {} }
  await act(async () => root.render(React.createElement(Registration, registrationProps)))
  assert.equal(document.querySelector('[data-registration-assistant]'), null)
  assert.ok(document.querySelector('a[href^="/login?"]'))
  assert.equal(new URL(document.querySelector('a[href^="/login?"]').href).searchParams.get('callbackUrl'), '/khoa-hoc/C1')
  assert.ok(document.querySelector('a[href^="/register?"]'))
  assistantEnabled = true
  await act(async () => root.render(React.createElement(Registration, registrationProps)))
  assert.ok(document.querySelector('[data-registration-assistant]'))
  await act(async () => root.unmount())
  dom.window.close()
  console.log('WI300 personal space: tabs, keyboard, six-course pagination, pending payments, saved QR, tool groups/search/roles, disabled assistant fallback and legacy assistant passed.')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
