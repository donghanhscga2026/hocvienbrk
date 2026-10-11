const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), ts = require('typescript'), React = require('react'), { JSDOM } = require('jsdom')
const repo = path.resolve(__dirname, '..'), cache = new Map(), { act } = React
const dom = new JSDOM('<div id="root"></div>', { url: 'https://test.invalid/support?requestOpen=general' })
global.window = dom.window; global.document = dom.window.document; global.sessionStorage = dom.window.sessionStorage; global.IS_REACT_ACT_ENVIRONMENT = true
window.HTMLDialogElement.prototype.showModal = function () { this.open = true }
window.HTMLDialogElement.prototype.close = function () { this.open = false }
document.addEventListener('click', event => { if (event.target.closest?.('a')) event.preventDefault() })
const { createRoot } = require('react-dom/client')
let query = new URLSearchParams(), signedIn = false, checks = 0, calls = []
const ok = (value, message) => { assert.ok(value, message); checks++ }
const placeholder = { __esModule: true, default: () => null }
const overrides = {
  'next/link': { __esModule: true, default: ({ children, scroll, onNavigate, ...props }) => React.createElement('a', props, children) },
  'next/image': { __esModule: true, default: ({ unoptimized, ...props }) => React.createElement('img', props) },
  'next/navigation': { useSearchParams: () => query, useRouter: () => ({ refresh() {}, push() {} }) },
  'next-auth/react': { useSession: () => ({ data: signedIn ? { user: { id: 3, role: 'STUDENT' } } : null }) },
  './CrmDataTools': { ...placeholder, CrmWebsitePanel: () => null },
  './CrmPhaseThree': { ...placeholder, CrmEmailConsent: () => null },
  './CrmStudents': placeholder,
}
function load(file) {
  const absolute = path.resolve(repo, file)
  if (cache.has(absolute)) return cache.get(absolute)
  const mod = { exports: {} }, code = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  new Function('require', 'module', 'exports', code)(name => {
    if (name in overrides) return overrides[name]
    if (name.startsWith('.') || name.startsWith('@/')) { const base = name.startsWith('@/') ? path.resolve(repo, name.slice(2)) : path.resolve(path.dirname(absolute), name); return load(path.relative(repo, fs.existsSync(base + '.tsx') ? base + '.tsx' : base + '.ts')) }
    return require(name)
  }, mod, mod.exports)
  cache.set(absolute, mod.exports); return mod.exports
}
const owners = [{ id: 0, name: 'Điều phối WI300', email: 'admin@example.com' }, { id: 1, name: 'Nguyễn Mai', email: 'teacher@example.com' }]
const rows = ['PARTNER','LEARNING','SUPPORT','ACCOUNT','FEEDBACK'].map((topic, index) => ({ id: '00000000-0000-4000-8000-00000000000' + (index + 1), contactId: null, ownerId: index < 2 ? 1 : null, name: ['Lê Minh Anh','Phạm Hà','Nguyễn Hồng','Trần Quân','Mai Ngọc'][index], email: 'member@example.com', phone: '+84912345678', userId: topic === 'ACCOUNT' ? null : 3, category: topic === 'LEARNING' ? 'LEARNING' : 'SUPPORT', topic, source: topic === 'PARTNER' ? 'Wi300: Đăng ký đối tác' : 'Yêu cầu thành viên', status: index ? 'NEW' : 'IN_PROGRESS', content: ['Đăng ký: Giảng viên và doanh nghiệp. Tôi muốn hợp tác giảng dạy về chuyển đổi số.', 'Nhờ giải thích thêm ví dụ ở bài 3 trong khóa xây dựng thương hiệu.', 'Tôi cần hỗ trợ tìm tài liệu và lộ trình phù hợp.', 'Tôi không nhận được mã xác minh khi tạo tài khoản.', 'Góp ý cách sắp xếp phần học tập trên điện thoại.'][index], resolution: 'Đã kiểm tra hồ sơ, chờ bổ sung thông tin.', publicReply: '', version: 1, createdAt: '2026-10-11T06:30:00Z', lessonId: null, course: null, outcome: 'MORE_INFO', events: [] }))
const contacts = rows.slice(0,3).map((row,index) => ({ id: index+1, name: row.name, email: row.email, phone: row.phone, source: 'Thành viên WI300', needs: 'Quan tâm ứng dụng AI trong doanh nghiệp', tags: [], ownerId: 1, owner: owners[1], archived: false, version: 1, lastContactAt: null, updatedAt: row.createdAt, opportunities: [{ id: index+1, title: 'Tư vấn khóa AI', stage: 'QUALIFIED', amount: 1000000, version: 1, lostReason: '' }], tasks: [{ id: index+1, title: 'Gọi lại trao đổi lộ trình', dueAt: '2026-10-12T02:00:00Z', completedAt: null }], learning: [{ courseId: 10+index, title: 'Ứng dụng AI trong công việc và phát triển doanh nghiệp', slug: 'ai-business', status: 'ACTIVE', completed: index+2, total: 10, lastActivityAt: row.createdAt, lastLesson: 'Bài 3' }], pendingRequests: index+1 }))
global.fetch = async (url, options = {}) => {
  calls.push({ url: String(url), options })
  let data
  if (options.method === 'PATCH') data = { updated: true }
  else if (String(url).includes('profileId=')) data = { profile: { id: 3, name: rows[0].name, image: null, role: 'STUDENT', learning: contacts[0].learning, teaching: [], related: [] } }
  else if (String(url).includes('/api/crm/requests')) data = { requests: rows, total: rows.length }
  else if (String(url).includes('view=owners')) data = { owners, actor: { id: 0, isAdmin: true } }
  else if (String(url).includes('view=tasks')) data = { tasks: [], total: 0, stats: { today: 3, overdue: 1, unscheduled: 2 } }
  else if (String(url).includes('view=detail')) data = { contact: { ...contacts[0], activities: [], activityTotal: 0 } }
  else data = { contacts, total: contacts.length }
  return { ok: true, status: 200, json: async () => data }
}
const root = createRoot(document.getElementById('root'))
const button = text => [...document.querySelectorAll('button')].find(node => node.textContent === text)
const click = async node => { assert.ok(node); await act(async () => node.click()) }
const snapshot = name => { if (!process.env.CRM_UI_SNAPSHOT_DIR) return; fs.mkdirSync(process.env.CRM_UI_SNAPSHOT_DIR, { recursive: true }); const original = document.getElementById('root'), clone = original.cloneNode(true); original.querySelectorAll('select').forEach((node, index) => clone.querySelectorAll('select')[index].querySelectorAll('option').forEach(option => { if (option.value === node.value) option.setAttribute('selected', ''); else option.removeAttribute('selected') })); fs.writeFileSync(path.join(process.env.CRM_UI_SNAPSHOT_DIR, name + '.html'), clone.innerHTML) }
async function run() {
  const Form = load('components/crm/CrmRequestForm.tsx').default
  await act(async () => root.render(React.createElement(Form, { initiallyOpen: true, hideTrigger: true, signedIn: false, initialContent: 'Bản nháp câu hỏi cần giữ', defaultCategory: 'SUPPORT' })))
  const login = document.querySelector('a[href^="/login?"]')
  ok(new URL(login.href).searchParams.get('callbackUrl') === '/support?requestOpen=general', 'Sign-in returns to same request form')
  await click(login)
  ok(JSON.parse(sessionStorage.getItem('crm-request-draft:general::')).content === 'Bản nháp câu hỏi cần giữ', 'Draft saved before auth navigation')
  ok(!button('Gửi yêu cầu'), 'Guest cannot submit ordinary request')
  await act(async () => root.render(React.createElement(Form, { key: 'signed', initiallyOpen: true, hideTrigger: true, signedIn: true, defaultCategory: 'SUPPORT' })))
  ok(document.querySelector('textarea').value === 'Bản nháp câu hỏi cần giữ', 'Draft restored after login')
  const Inbox = load('components/crm/CrmRequests.tsx').default
  await act(async () => root.render(React.createElement(Inbox, { owners, isAdmin: true, onChanged() {} })))
  ok(document.body.textContent.includes('Hỗ trợ tài khoản') && document.body.textContent.includes('Đăng ký đối tác'), 'Topics distinguish account support and partner requests')
  snapshot('requests')
  await click([...document.querySelectorAll('button')].find(node => node.textContent.includes(rows[0].name)))
  ok(document.querySelector('dialog').open, 'Request opens accessible drawer')
  ok(document.querySelector('textarea').value.includes('Đã kiểm tra'), 'Internal notes retained')
  const reply = document.querySelectorAll('textarea')[1]
  ok(reply.value === '', 'Reply composer never copies private note')
  snapshot('request-drawer')
  await click(button('Nhắc người phụ trách'))
  const reminder = calls.filter(call => call.options.method === 'PATCH').at(-1)
  ok(JSON.parse(reminder.options.body).action === 'REMIND' && !('resolution' in JSON.parse(reminder.options.body)), 'Reminder sends no note or reply payload')
  await click([...document.querySelectorAll('button')].find(node => node.textContent.includes(rows[0].name)))
  await click(button('Hồ sơ người gửi'))
  ok(document.body.textContent.includes('Thành viên #3') && document.body.textContent.includes('Học viên'), 'Sender profile shows actual role')
  ok(calls.some(call => call.url.includes('profileId=' + rows[0].id)), 'Profile lookup anchors request, never arbitrary user ID')
  snapshot('sender-profile')
  await click(document.querySelector('button[aria-label="Đóng hồ sơ"]'))
  await click([...document.querySelectorAll('button')].find(node => node.textContent.includes(rows[3].name)))
  ok(!button('Gửi phản hồi & thông báo') && document.body.textContent.includes('chưa tự gửi email'), 'Guest support does not claim undeliverable notification')
  const Workspace = load('components/crm/CrmWorkspace.tsx').default
  await act(async () => root.render(React.createElement(Workspace)))
  ok(document.querySelector('table') && document.querySelector('summary').textContent === '⋯', 'CRM list uses one care button and secondary menu')
  snapshot('contacts')
  await click([...document.querySelectorAll('button')].find(node => node.textContent === contacts[0].name))
  ok(document.querySelector('dialog').open && document.querySelector('[aria-label="Các phần hồ sơ CRM"]'), 'Contact uses drawer with profile sections')
  snapshot('contact-drawer')
  await click(button('Tư vấn'))
  ok([...document.querySelectorAll('dialog div:not([hidden])')].some(node => node.textContent.includes('Cơ hội tư vấn')), 'Consultation section remains accessible')
  await act(async () => root.unmount())
  dom.window.close()
  console.log(JSON.stringify({ result: 'passed', assertions: checks, scope: 'Real React components with isolated fetch fixtures' }))
}
run().catch(error => { console.error(error); process.exitCode = 1 })
