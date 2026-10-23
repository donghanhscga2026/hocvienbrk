// UI và persistence giả: kiểm tra component thật, không ghi dữ liệu trực tuyến.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), ts = require('typescript'), React = require('react'), { JSDOM } = require('jsdom')
const repo = path.resolve(__dirname, '..'), cache = new Map()
const dom = new JSDOM('<form id="form"><div id="root"></div></form>', { url: 'https://test.invalid/tools/courses/pages/one' })
global.window = dom.window; global.document = dom.window.document; global.FormData = dom.window.FormData; global.MutationObserver = dom.window.MutationObserver; global.IS_REACT_ACT_ENVIRONMENT = true
Object.defineProperty(global, 'navigator', { configurable: true, value: dom.window.navigator })
const saves = [], published = [], checkpoints = []
let failSave = false
const mocks = {
  'next/link': { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) },
  'next/image': { __esModule: true, default: ({ unoptimized, ...props }) => React.createElement('img', props) },
  'next/font/local': { __esModule: true, default: () => ({ variable: '' }) },
  'next/navigation': { useRouter: () => ({ refresh() {} }) },
  '@/app/actions/course-page-actions': {
    updateCoursePage: async (...args) => { if (failSave) return { success: false, error: 'Save failed' }; saves.push(args); return { success: true } },
    saveCourseSections: async (...args) => { saves.push(args); return { success: true } },
    createCoursePageCheckpoint: async id => { checkpoints.push(id); return { success: true, versionNumber: 2 } },
    publishCoursePage: async id => { published.push(id); return { success: true, versionNumber: 3 } },
    getCoursePageVersions: async () => ({ success: true, versions: [] }),
    restoreCoursePageVersion: async () => ({ success: true }),
  },
}
function load(file) {
  if (cache.has(file)) return cache.get(file)
  const mod = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(path.join(repo, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  new Function('require', 'module', 'exports', code)(name => {
    if (name in mocks) return mocks[name]
    if (!name.startsWith('@/') && !name.startsWith('.')) return require(name)
    const base = name.startsWith('@/') ? name.slice(2) : path.posix.join(path.posix.dirname(file), name)
    if (base.startsWith('components/course-page/sections/') && !base.endsWith('GiftTemplateSection')) return { __esModule: true, default: () => null }
    const resolved = ['.tsx', '.ts'].map(ext => base + ext).find(candidate => fs.existsSync(path.join(repo, candidate))) || path.posix.join(base, 'index.ts')
    return load(resolved)
  }, mod, mod.exports)
  cache.set(file, mod.exports); return mod.exports
}
const root = require('react-dom/client').createRoot(document.getElementById('root'))
async function click(text) { await React.act(async () => { const node = [...document.querySelectorAll('button')].find(node => node.textContent.trim() === text); assert.ok(node, text); node.click() }) }
async function input(node, value) { await React.act(async () => { Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(node, value); node.dispatchEvent(new window.Event('input', { bubbles: true })) }) }
function selectedIds() { return new FormData(document.getElementById('form')).getAll('courseIds').map(Number) }
async function run() {
  try {
    const Picker = load('components/wi300/ProjectCoursePicker.tsx').default
    const courses = Array.from({ length: 20 }, (_, index) => ({ id: index + 1, name_lop: 'Khóa ' + (index + 1), id_khoa: 'COURSE_' + (index + 1) }))
    await React.act(async () => root.render(React.createElement(Picker, { courses, initialIds: [1, 99] })))
    assert.equal(document.querySelector('[aria-expanded]').getAttribute('aria-expanded'), 'false')
    assert.deepEqual(selectedIds(), [1, 99], 'Preserve inaccessible existing course links')
    await React.act(async () => document.querySelector('[aria-expanded]').click())
    await input(document.querySelector('[aria-label="Tìm khóa để liên kết"]'), 'COURSE_20')
    await React.act(async () => document.querySelector('[aria-label="Liên kết Khóa 20"]').click())
    assert.deepEqual(selectedIds(), [1, 99, 20])
    await React.act(async () => document.querySelector('label input').click())
    assert.deepEqual(selectedIds(), [1, 99], 'Bulk removal affects only filtered choices')
    await React.act(async () => document.querySelector('label input').click())
    await click('Xong')
    assert.deepEqual(selectedIds(), [1, 99, 20], 'Closing picker retains the form payload')
    await React.act(async () => document.querySelector('[aria-label="Gỡ liên kết Khóa 20"]').click())
    assert.deepEqual(selectedIds(), [1, 99])

    const preset = load('lib/course-page/templates/wi300-gift.ts').createWi300GiftCoursePage('GIFT')
    assert.equal(preset.sections.length, 7); assert.equal(preset.sections.find(section => section.variant === 'wi300-gift-testimonials').enabled, false)
    const page = { ...preset, id: 'one', seo: { ...preset.seo, templateKey: 'wi300-gift' }, sections: preset.sections.map(section => ({ ...section, sectionType: section.type })) }
    const Editor = load('app/tools/courses/pages/[id]/EditCoursePageForm.tsx').default
    await React.act(async () => root.render(React.createElement(Editor, { initialPage: page })))
    const frame = document.querySelector('iframe')
    await React.act(async () => frame.dispatchEvent(new window.Event('load')))
    assert.match(frame.contentDocument.body.textContent, /99\+ Quà Tặng/)
    const title = document.querySelector('input[id$="-title"]')
    await input(title, 'Bản nháp đang sửa')
    assert.match(frame.contentDocument.body.textContent, /Bản nháp đang sửa/)
    assert.equal(saves.length, 0, 'Live preview does not write persistence')
    assert.equal([...document.querySelectorAll('button')].find(node => node.textContent === 'Xuất bản').disabled, true)
    await React.act(async () => frame.contentDocument.querySelector('button').click())
    assert.equal(published.length, 0, 'Preview registration cannot publish or open payment')
    failSave = true; await click('Lưu bản nháp')
    assert.match(document.body.textContent, /Save failed/); assert.equal(title.value, 'Bản nháp đang sửa')
    failSave = false; await click('Lưu bản nháp'); assert.equal(checkpoints.length, 1)
    global.confirm = () => true
    await click('Xuất bản'); assert.deepEqual(published, ['one'])
    console.log('PASS course builder UI: bounded picker, retained and scoped selections, inaccessible links, real draft render, unsaved edits, inert checkout, save failure retention, checkpoint and explicit publish')
  } finally { await React.act(async () => root.unmount()); dom.window.close() }
}
run().catch(error => { console.error(error); process.exitCode = 1 })
