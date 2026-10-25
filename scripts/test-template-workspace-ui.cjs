// UI interaction with fake persistence; template compilation and iframe message checks are real.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), ts = require('typescript'), React = require('react'), { JSDOM } = require('jsdom')
const repo = path.resolve(__dirname, '..'), cache = new Map(), dom = new JSDOM('<div id="root"></div>', { url: 'https://test.invalid/tools/courses/templates?course=AI&name=AI&courseId=1' })
global.window = dom.window; global.document = dom.window.document; global.location = dom.window.location; global.IS_REACT_ACT_ENVIRONMENT = true
Object.defineProperty(global, 'navigator', { configurable: true, value: dom.window.navigator })
dom.window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }; dom.window.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
const saved = [], applied = [], params = new URLSearchParams('course=AI&name=AI&courseId=1')
let failSave = false
const pendingPreviews = []
const mocks = {
  'next/link': { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) },
  'next/navigation': { useSearchParams: () => params },
  'next/dynamic': { __esModule: true, default: () => ({ value, disabled, onChange }) => React.createElement('textarea', { 'aria-label': 'Code', value, disabled, onInput: event => onChange(event.target.value) }) },
  '@/lib/course-page/templates': { COURSE_TEMPLATE_LIBRARY: [{ key: 'system', name: 'Built-in', description: 'True template preview' }] },
  '@/lib/course-page/template-workspace-client': { templateWorkspaceRequest: async (url, input) => {
    if (!input && url.includes('?page=')) return { template: { name: 'Current page copy', description: '', sourceType: 'html' }, source: { entryPath: 'index.html', files: [{ path: 'index.html', kind: 'html', content: '<section id="current"><h1>Applied page source</h1></section>' }] } }
    if (!input) return { templates: [], admin: false, revision: { id: 'page-1', updatedAt: '2026-10-17T00:00:00.000Z' } }
    if (input.action === 'apply') { applied.push([input.slug, input.name, input.id]); return { success: true } }
    if (input.action === 'preview-course-code') return new Promise(resolve => pendingPreviews.push({ resolve, html: input.html }))
    if (failSave) throw new Error('Storage failed; code retained')
    saved.push(input); return { revision: { id: 'page-1', updatedAt: '2026-10-17T00:01:00.000Z' }, template: { id: 'saved', name: input.name, description: input.description, sourceType: input.sourceType, updatedAt: '2026-10-14T00:00:00.000Z' } }
  } },
  '@/app/actions/course-page-actions': { applyCoursePageTemplate: async (...args) => { applied.push(args); return { success: true } } },
  '@/app/actions/course-page-template-actions': { applyStoredCoursePageTemplate: async (...args) => { applied.push(args); return { success: true } }, deleteStoredCoursePageTemplate: async () => ({ success: true }) },
}
function load(file) {
  if (cache.has(file)) return cache.get(file)
  const mod = { exports: {} }; cache.set(file, mod.exports)
  const code = ts.transpileModule(fs.readFileSync(path.join(repo, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  new Function('require', 'module', 'exports', code)(name => {
    if (name in mocks) return mocks[name]
    if (!name.startsWith('@/') && !name.startsWith('./') && !name.startsWith('../')) return require(name)
    const base = name.startsWith('@/') ? name.slice(2) : path.posix.join(path.posix.dirname(file), name)
    const target = ['.tsx', '.ts'].map(ext => base + ext).find(file => fs.existsSync(path.join(repo, file)))
    return load(target)
  }, mod, mod.exports); return mod.exports
}
const root = require('react-dom/client').createRoot(document.getElementById('root'))
function snapshot(name) { if (process.env.MANAGEMENT_UI_SNAPSHOT_DIR) { fs.mkdirSync(process.env.MANAGEMENT_UI_SNAPSHOT_DIR, { recursive: true }); fs.writeFileSync(path.join(process.env.MANAGEMENT_UI_SNAPSHOT_DIR, name + '.html'), document.getElementById('root').innerHTML) } }
async function click(text) { await React.act(async () => { const button = [...document.querySelectorAll('button')].find(node => node.textContent.trim() === text); assert.ok(button, text); button.click() }) }
async function code(text) { await React.act(async () => { const input = document.querySelector('textarea[aria-label="Code"]'); Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(input, text); input.dispatchEvent(new window.Event('input', { bubbles: true })) }) }
async function tick() { await React.act(async () => new Promise(resolve => setTimeout(resolve, 700))) }
async function run() {
  try {
    await React.act(async () => root.render(React.createElement(load('components/course/CourseTemplateWorkspace.tsx').default)))
    assert.equal(document.querySelectorAll('input[type="file"]').length, 0); assert.ok(!document.body.textContent.includes('Mẫu của tôi')); assert.equal(document.querySelectorAll('iframe').length, 0, 'Listing presets does not fetch heavy preview pages')
    snapshot('template-library')
    window.confirm = () => false; await click('Dùng mẫu'); assert.equal(applied.length, 0)
    window.confirm = () => true; await click('Dùng mẫu'); assert.deepEqual(applied[0], ['AI', 'AI', 'system'])
    await click('Sửa code từ mẫu')
    const frame = document.querySelector('dialog iframe'), token = new URL(frame.src).searchParams.get('token')
    await React.act(async () => window.dispatchEvent(new window.MessageEvent('message', { origin: 'https://evil.invalid', source: frame.contentWindow, data: { source: 'course-template-builtin', token, html: '<section>Wrong</section>' } })))
    assert.ok(document.querySelector('dialog[open]'), 'Untrusted copy message is ignored')
    await React.act(async () => window.dispatchEvent(new window.MessageEvent('message', { origin: location.origin, source: frame.contentWindow, data: { source: 'course-template-builtin', token, html: '<section id="hero"><h1>Captured actual template</h1></section>' } })))
    assert.match(document.querySelector('textarea[aria-label="Code"]').value, /Captured actual template/)
    await code('<section id="hero"><h1>Edited immediately</h1></section>'); await tick()
    assert.match(document.querySelector('iframe[srcdoc]').srcdoc, /Edited immediately/)
    snapshot('template-editor')
    assert.equal(applied.length, 1, 'Preview never applies a template')
    await click('Lưu bản nháp cho khóa học'); assert.equal(saved.length, 1); assert.equal(saved[0].action, 'save-course-code'); assert.equal(saved[0].slug, 'AI'); assert.ok(!('scope' in saved[0]), 'No private library record is created'); assert.match(saved[0].html, /Edited immediately/); assert.equal(applied.length, 1, 'Saving code never changes the live course')
    failSave = true; await code('<section id="hero">Keep unsaved edits</section>'); await tick(); await click('Lưu bản nháp cho khóa học')
    assert.match(document.querySelector('textarea[aria-label="Code"]').value, /Keep unsaved edits/); assert.match(document.body.textContent, /Storage failed/)
    const previewBefore = document.querySelector('iframe[srcdoc]').srcdoc
    await code('<section><img src="ftp://invalid.test/missing.png"></section>'); await tick()
    assert.match(document.body.textContent, /Đường dẫn chưa được hỗ trợ/); assert.equal(document.querySelector('iframe[srcdoc]').srcdoc, previewBefore, 'Invalid changes keep the last valid preview and the editable draft')
    await code('<script src="https://cdn.tailwindcss.com"></script><h1>Canvas remote preview</h1>')
    await React.act(async () => new Promise(resolve => setTimeout(resolve, 1300)))
    assert.equal(pendingPreviews.length, 1)
    await code('<h1>Newer local preview</h1>'); await tick()
    await React.act(async () => pendingPreviews[0].resolve({ html: '<h1>Stale server response</h1>', warnings: [] }))
    assert.match(document.querySelector('iframe[srcdoc]').srcdoc, /Newer local preview/, 'A stale server response cannot overwrite a newer preview')
    await code('<script src="https://cdn.tailwindcss.com"></script><h1>Latest Canvas preview</h1>')
    await React.act(async () => new Promise(resolve => setTimeout(resolve, 1300)))
    await React.act(async () => pendingPreviews[1].resolve({ html: '<h1>Compiled Canvas preview</h1>', warnings: ['Tailwind prepared'] }))
    assert.match(document.querySelector('iframe[srcdoc]').srcdoc, /Compiled Canvas preview/)
    const event = new window.Event('beforeunload', { cancelable: true }); window.dispatchEvent(event); assert.equal(event.defaultPrevented, true)
    await React.act(async () => root.render(React.createElement(load('components/course/CourseTemplateWorkspace.tsx').default, { key: 'inline', embedded: true, context: { slug: 'AI', name: 'Inline course', courseId: 1 }, startPageId: 'current' })))
    assert.equal(document.querySelector('[data-management-workspace]'), null, 'Embedded editor does not repeat the application navigation')
    assert.match(document.querySelector('textarea[aria-label="Code"]').value, /Applied page source/)
    await code('<section id="current"><h1>Inline edited source</h1></section>'); await tick()
    assert.match(document.querySelector('iframe[srcdoc]').srcdoc, /Inline edited source/)
    snapshot('course-inline-code')
    console.log('PASS template workspace UI: true previews, course context, confirmed apply, trusted HTML copies, live preview, direct course drafts without a private library, no eager previews/uploads and retained edits on failure')
  } finally { await React.act(async () => root.unmount()); dom.window.close() }
}
run().catch(error => { console.error(error); process.exitCode = 1 })
