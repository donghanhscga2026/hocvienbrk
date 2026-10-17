// Bộ điều hướng và hai bộ chỉnh sửa thật, API giả cách ly; không ghi dữ liệu trực tuyến.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), ts = require('typescript')
const React = require('react'), { JSDOM } = require('jsdom')
const repo = path.resolve(__dirname, '..'), cache = new Map()
const dom = new JSDOM('<div id="root"></div>', { url: 'https://test.invalid/tools/courses/new?id=1' })
global.window = dom.window; global.document = dom.window.document; global.location = dom.window.location; global.IS_REACT_ACT_ENVIRONMENT = true
Object.defineProperty(global, 'navigator', { configurable: true, value: dom.window.navigator })
dom.window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
dom.window.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
let stored = null, failSave = false, failPublish = false, applied = 0, publishes = 0, draftWrites = 0, allowConfirm = true
let failRead = false, failCodeRead = false
window.confirm = () => allowConfirm
global.confirm = () => allowConfirm
const sourceHtml = '<section id="hero"><h1>Current HTML</h1><a href="#dang-ky">Register</a></section>'
function makePage(code = false) {
  return { id: 'page-1', slug: 'AI', name: 'Course AI', status: 'draft', updatedAt: new Date('2026-10-17T00:00:00Z'), useTemplate: true, seo: { templateKey: code ? 'course-code' : 'expert-course' }, theme: {}, navigation: {}, checkoutConfig: {}, sections: code ? [{ sectionKey: 'code', sectionType: 'rich_content', type: 'rich_content', variant: 'zip-source-v1', enabled: true, content: { exactSource: { html: sourceHtml } } }] : [{ sectionKey: 'hero', sectionType: 'hero', type: 'hero', enabled: true, content: { title: 'Original title' } }] }
}
const actions = {
  getCoursePages: async () => { if (failRead) throw Error('Page load failed'); return stored ? [structuredClone(stored)] : [] },
  getCoursePage: async () => structuredClone(stored),
  updateCoursePage: async (id, data) => { if (failSave) return { success: false, error: 'Save failed' }; stored = { ...stored, ...data }; draftWrites++; return { success: true } },
  saveCourseSections: async (id, sections) => { stored.sections = structuredClone(sections); return { success: true } },
  createCoursePageCheckpoint: async () => ({ success: true, versionNumber: 2 }),
  getCoursePageVersions: async () => ({ success: true, versions: [] }),
  restoreCoursePageVersion: async () => ({ success: true }),
  publishCoursePage: async () => { if (failPublish) return { success: false, error: 'Publish failed' }; stored.status = 'published'; publishes++; return { success: true, versionNumber: 3 } },
}
const mocks = {
  'next/link': { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) },
  'next/navigation': { useSearchParams: () => new URLSearchParams(), useRouter: () => ({ refresh() {} }) },
  'next/dynamic': { __esModule: true, default: () => ({ value, disabled, onChange }) => React.createElement('textarea', { 'aria-label': 'Code', value, disabled, onInput: event => onChange(event.target.value) }) },
  '@/app/actions/course-page-actions': actions,
  '@/components/course/CourseDraftPreview': { __esModule: true, default: () => React.createElement('div', { 'data-draft-preview': true }) },
  './TemplatePreviewFrame': { __esModule: true, default: ({ src, html }) => React.createElement('iframe', { src, srcDoc: html, title: 'Preview' }) },
  '@/lib/course-page/template-workspace-client': { templateWorkspaceRequest: async (url, input) => {
    if (!input) {
      if (failCodeRead && url.includes('?page=')) throw Error('Code load failed')
      const revision = { id: stored?.id ?? null, updatedAt: stored?.updatedAt.toISOString() ?? null }
      if (url.includes('?page=')) return { revision, source: { entryPath: 'index.html', files: [{ path: 'index.html', kind: 'html', content: stored.sections[0].content.exactSource.html }] } }
      return { revision }
    }
    if (failSave) throw Error('Code save failed')
    if (input.action === 'apply') { applied++; stored = makePage(); return { success: true } }
    assert.equal(input.action, 'save-course-code')
    draftWrites++; stored = { ...makePage(true), sections: [{ ...makePage(true).sections[0], content: { exactSource: { html: input.html } } }] }
    return { success: true, revision: { id: stored.id, updatedAt: stored.updatedAt.toISOString() }, warnings: [] }
  } },
}
function load(file) {
  if (cache.has(file)) return cache.get(file)
  const mod = { exports: {} }; cache.set(file, mod.exports)
  const code = ts.transpileModule(fs.readFileSync(path.join(repo, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  new Function('require', 'module', 'exports', code)(name => {
    if (name in mocks) return mocks[name]
    if (!name.startsWith('@/') && !name.startsWith('.')) return require(name)
    const base = name.startsWith('@/') ? name.slice(2) : path.posix.join(path.posix.dirname(file), name)
    if (base.startsWith('components/course-page/sections/')) return { __esModule: true, default: () => null }
    const target = ['.tsx', '.ts'].map(ext => base + ext).find(file => fs.existsSync(path.join(repo, file))) || base + '/index.ts'
    return load(target)
  }, mod, mod.exports)
  return mod.exports
}
const root = require('react-dom/client').createRoot(document.getElementById('root'))
const visible = node => !node.closest('[hidden]')
function buttons() { return [...document.querySelectorAll('button')].filter(visible) }
async function click(text) { await React.act(async () => { const node = buttons().find(node => node.textContent.trim() === text || node.textContent.trim().startsWith(text)); assert.ok(node, 'Missing visible button ' + text); assert.equal(node.disabled, false, 'Button enabled: ' + text); node.click() }) }
const current = () => document.querySelector('[aria-current="step"]').textContent
async function input(node, value) { await React.act(async () => { const proto = node.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(node, value); node.dispatchEvent(new window.Event('input', { bubbles: true })) }) }
async function render(key, props = {}) { await React.act(async () => root.render(React.createElement(load('components/course/CourseSalesPagePanel.tsx').default, { key, slug: 'AI', courseName: 'Course AI', courseId: 1, canEdit: true, ...props }))) }
async function run() {
  try {
    await render('new')
    assert.match(current(), /Chọn giao diện/)
    await click('3Kiểm tra & xuất bản'); assert.match(current(), /Chọn giao diện/); assert.equal(publishes, 0)
    await React.act(async () => document.querySelector('input[value="code"]').click())
    await click('Tiếp tục dán code'); assert.match(current(), /Chỉnh sửa trang/)
    assert.ok(!buttons().some(node => node.textContent.includes('Thêm nội dung')), 'Code flow has no block editor')
    await input(document.querySelector('textarea[aria-label="Code"]'), '<section><h1>Keep this code</h1><a href="#dang-ky">Join</a></section>')
    failSave = true; await click('Lưu & tiếp tục kiểm tra')
    assert.match(current(), /Chỉnh sửa trang/); assert.match(document.querySelector('textarea[aria-label="Code"]').value, /Keep this code/); assert.equal(publishes, 0)
    failSave = false; await click('Lưu & tiếp tục kiểm tra')
    assert.match(current(), /Kiểm tra & xuất bản/); assert.equal(draftWrites, 1); assert.equal(publishes, 0)
    assert.equal([...document.querySelectorAll('input[type="checkbox"]:checked')].filter(visible).length, 0, 'Review items are not automatically certified')
    allowConfirm = false; await click('Xuất bản trang'); assert.equal(publishes, 0)
    allowConfirm = true; failPublish = true; await click('Xuất bản trang'); assert.match(document.body.textContent, /Publish failed/); assert.equal(stored.status, 'draft')
    failPublish = false; await click('Xuất bản trang'); assert.equal(publishes, 1)
    assert.equal([...document.querySelectorAll('a')].filter(node => visible(node) && node.textContent.includes('Xem trang công khai')).length, 1)

    stored = makePage(); await render('preset')
    assert.match(current(), /Chỉnh sửa trang/, 'Existing pages resume at step two')
    await click('Nội dung')
    const title = document.querySelector('input[id$="-title"]'); await input(title, 'Unsaved title')
    await click('Các mục chỉnh sửa'); await click('Màu sắc & bố cục'); await click('Các mục chỉnh sửa'); await click('Nội dung')
    assert.equal(document.querySelector('input[id$="-title"]').value, 'Unsaved title', 'Switching edit categories preserves state')
    await click('Quay lại'); assert.match(current(), /Chỉnh sửa trang/, 'Dirty edits cannot be replaced by a new template')
    failSave = true; await click('Lưu & tiếp tục kiểm tra'); assert.match(current(), /Chỉnh sửa trang/); assert.equal(document.querySelector('input[id$="-title"]').value, 'Unsaved title')
    failSave = false; await click('Lưu & tiếp tục kiểm tra'); assert.match(current(), /Kiểm tra & xuất bản/); assert.equal(stored.sections[0].content.title, 'Unsaved title')
    await click('Quay lại chỉnh sửa'); await click('Quay lại'); assert.match(current(), /Chọn giao diện/)
    allowConfirm = false; await click('Chọn mẫu & tiếp tục'); assert.equal(applied, 0)
    allowConfirm = true; await click('Chọn mẫu & tiếp tục'); assert.equal(applied, 1); assert.match(current(), /Chỉnh sửa trang/)

    stored = makePage(true); await render('existing-code')
    assert.match(current(), /Chỉnh sửa trang/); assert.match(document.querySelector('textarea[aria-label="Code"]').value, /Current HTML/)
    assert.ok(!buttons().some(node => node.textContent.includes('Thêm nội dung')))
    await input(document.querySelector('textarea[aria-label="Code"]'), '<section>Code not saved</section>')
    await click('Các mục chỉnh sửa'); await click('Thông tin & SEO')
    assert.match(document.body.textContent, /Hãy lưu bản nháp trước khi chuyển/)
    assert.match(document.querySelector('textarea[aria-label="Code"]').value, /Code not saved/)
    failCodeRead = true; await render('code-load-failure')
    assert.match(document.body.textContent, /Code load failed/)
    assert.ok(!buttons().some(node => node.textContent.trim() === 'Dùng mẫu'), 'Failed code load never opens a second template chooser')
    failCodeRead = false; await click('Tải lại mã trang')
    assert.match(document.querySelector('textarea[aria-label="Code"]').value, /Current HTML/)
    failRead = true; await render('page-load-failure')
    assert.match(document.body.textContent, /Page load failed/)
    failRead = false; await click('Tải lại trang bán'); assert.match(current(), /Chỉnh sửa trang/)
    await render('readonly', { canEdit: false })
    assert.equal(document.querySelector('[aria-label="Các bước thiết lập trang bán"]'), null)
    assert.ok(!buttons().some(node => node.textContent.includes('Xuất bản')))
    console.log('PASS course sales flow: guided entry/resume, native and code paths, unified saves, dirty navigation protection, failed-save retention, explicit final publish, manual review checks, template replacement confirmation and read-only mode')
  } finally { await React.act(async () => root.unmount()); dom.window.close() }
}
run().catch(error => { console.error(error); process.exitCode = 1 })
