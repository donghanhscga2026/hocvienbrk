/* Kiểm tra thông báo hướng dẫn và metadata riêng; không gọi database. */
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const ts = require('typescript')
const React = require('react')
const { JSDOM } = require('jsdom')
function load(file, overrides = {}) {
  const module = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  new Function('require', 'module', 'exports', code)(name => name in overrides ? overrides[name] : require(name), module, module.exports)
  return module.exports
}
async function run() {
  const pages = load('lib/wi300/default-pages.ts')
  for (const pathname of ['/khoa-hoc/course', '/courses/course/learn', '/page/custom', '/landing/custom', '/login', '/']) assert.equal(pages.defaultPageTitle(pathname), null)
  assert.equal(pages.defaultPageTitle('/tools/posts'), 'Bài viết cộng đồng')
  assert.equal(pages.defaultPageTitle('/tools/affiliate/payouts'), 'Duyệt rút tiền')
  for (const route of ['login', 'register']) {
    let brand = null
    const metadata = load('app/' + route + '/layout.tsx', { '@/lib/site-profile/deployment-runtime': { getCurrentDeploymentBrand: async () => brand } })
    assert.deepEqual(await metadata.generateMetadata(), {})
    brand = { name: 'WI300' }
    assert.equal((await metadata.generateMetadata()).title, route === 'login' ? 'Đăng nhập' : 'Tạo tài khoản')
  }
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://wi300.vn/' })
  global.window = dom.window; global.document = dom.window.document; global.localStorage = dom.window.localStorage; global.IS_REACT_ACT_ENVIRONMENT = true
  const { createRoot } = require('react-dom/client')
  const { act } = React
  const saved = { fetch: global.fetch, setTimeout: global.setTimeout, clearTimeout: global.clearTimeout }
  let scheduled = []
  global.fetch = async url => ({ json: async () => url.includes('/config') ? { success: true, data: { displayMode: 'icon' } } : { success: true, data: { pageGuide: { title: 'Hướng dẫn mẫu' } } } })
  global.setTimeout = (callback, delay) => { scheduled.push({ callback, delay }); return scheduled.length }
  global.clearTimeout = () => {}
  const Assistant = load('components/assistant/AssistantProvider.tsx', {
    'next/navigation': { usePathname: () => '/' },
    './AssistantPopup': { __esModule: true, default: () => React.createElement('div', null, 'Popup') },
  }).AssistantProvider
  const root = createRoot(document.getElementById('root'))
  try {
    await act(async () => root.render(React.createElement(Assistant, { toastEnabled: false }, 'WI300')))
    assert.equal(scheduled.filter(timer => timer.delay === 2000).length, 0, 'WI300 không hẹn mở thông báo')
    assert.doesNotMatch(document.body.textContent, /Trang này có hướng dẫn/)
    await act(async () => root.render(React.createElement(Assistant, { toastEnabled: true }, 'Legacy')))
    const timer = scheduled.find(timer => timer.delay === 2000)
    assert.ok(timer, 'Web cũ vẫn hẹn mở hướng dẫn')
    await act(async () => timer.callback())
    assert.match(document.body.textContent, /Trang này có hướng dẫn/)
    await act(async () => root.render(React.createElement(Assistant, { toastEnabled: false }, 'WI300')))
    assert.doesNotMatch(document.body.textContent, /Trang này có hướng dẫn/, 'Tắt cả thông báo đang mở')
    await act(async () => root.unmount())
  } finally {
    Object.assign(global, saved)
    dom.window.close()
  }
  console.log('WI300 discovery: default layout scope, auth metadata and WI300-only toast suppression passed.')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
