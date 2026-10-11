const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const ts = require('typescript')
const React = require('react')
const { JSDOM } = require('jsdom')
const { act } = React
function load(file, overrides) {
  const module = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  new Function('require', 'module', 'exports', code)(name => name in overrides ? overrides[name] : require(name), module, module.exports)
  return module.exports
}
async function run() {
  let brand = { name: 'WI300', tagline: 'Liên minh', description: 'Ứng dụng WI300', iconUrl: '/wi300/300dns-icon.png', palette: { primary: '#236c1e' } }
  const manifest = load('app/manifest.ts', { '@/lib/site-profile/deployment-runtime': { getCurrentDeploymentBrand: async () => brand } }).default
  const wi = await manifest()
  assert.equal(wi.id, '/')
  assert.equal(wi.start_url, '/')
  assert.equal(wi.scope, '/')
  assert.equal(wi.display, 'standalone')
  // Kiểm tra binary thực; khai báo sizes đúng nhưng ảnh sai vẫn làm cài đặt thất bại.
  for (const size of [192, 512]) {
    const icon = wi.icons.find(i => i.sizes === `${size}x${size}`)
    assert.equal(icon.type, 'image/png')
    assert.equal(icon.purpose, 'any')
    const metadata = await require('sharp')(path.join(__dirname, '..', 'public', icon.src)).metadata()
    assert.equal(metadata.width, size)
    assert.equal(metadata.height, size)
    assert.equal(metadata.format, 'png')
  }
  const installedBrand = brand
  brand = null
  assert.equal((await manifest()).short_name, 'MFC')
  assert.ok((await manifest()).icons.some(i => i.src === '/pwa/icon-192.png'))
  brand = installedBrand
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://wi300.example/' })
  global.window = dom.window; global.document = dom.window.document
  Object.defineProperty(global, 'navigator', { configurable: true, value: dom.window.navigator })
  global.IS_REACT_ACT_ENVIRONMENT = true
  let standalone = false
  let displayListener
  window.matchMedia = () => ({ get matches() { return standalone }, addEventListener(_, fn) { displayListener = fn }, removeEventListener() {} })
  window.HTMLDialogElement.prototype.showModal = function () { this.open = true }
  window.HTMLDialogElement.prototype.close = function () { this.open = false }
  const accounts = []
  const pwa = load('components/pwa/PwaInstallProvider.tsx', {
    'next/image': { __esModule: true, default: ({ unoptimized, ...props }) => React.createElement('img', props) },
    'next-auth/react': { useSession: () => ({ data: { user: { id: 0 } }, status: 'authenticated' }) },
    '@/lib/web-push-client': { clearChangedPushAccount: async id => accounts.push(id) },
    '@/components/wi300/Wi300BrandContext': { useWi300Brand: () => brand },
  })
  const { createRoot } = require('react-dom/client')
  const root = createRoot(document.getElementById('root'))
  let menuClosed = 0
  const render = () => root.render(React.createElement(pwa.default, null, React.createElement(pwa.InstallAppButton, { onBeforeOpen: () => menuClosed++ })))
  const button = () => [...document.querySelectorAll('button')].find(b => b.textContent.includes('Cài ứng dụng'))
  const dialog = () => document.querySelector('dialog')
  const readyButton = () => [...document.querySelectorAll('button')].find(b => b.textContent === 'Cài ngay')
  const click = b => b.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
  function installEvent(prompt, userChoice) {
    const event = new window.Event('beforeinstallprompt', { cancelable: true })
    event.prompt = prompt; event.userChoice = userChoice
    window.dispatchEvent(event)
    assert.equal(event.defaultPrevented, true)
  }
  try {
    await act(async () => render())
    assert.equal(accounts[0], '0')
    assert.ok(button())
    // Khi chưa có event, hướng dẫn vẫn hoạt động và không giả vờ đã cài.
    await act(async () => click(button()))
    assert.equal(menuClosed, 1)
    assert.equal(dialog().open, true)
    assert.match(dialog().textContent, /chưa bật cài trực tiếp/)
    let promptCalls = 0
    let resolveChoice
    const choice = new Promise(resolve => { resolveChoice = resolve })
    await act(async () => installEvent(() => { promptCalls++; return Promise.resolve() }, choice))
    assert.ok(readyButton(), 'Event đến muộn cập nhật ngay hộp đang mở')
    await act(async () => {
      click(readyButton())
      assert.equal(promptCalls, 1, 'prompt chạy đồng bộ trong thao tác bấm')
      click(button())
    })
    assert.equal(promptCalls, 1, 'Bấm liên tục chỉ mở một prompt')
    assert.equal(dialog().open, false)
    assert.equal(document.querySelector('[aria-busy="true"]').disabled, true)
    await act(async () => resolveChoice({ outcome: 'dismissed' }))
    assert.ok(button())
    assert.equal(button().disabled, false)
    await act(async () => click(button()))
    assert.equal(promptCalls, 1, 'Không tái dùng event đã tiêu thụ')
    // Event mới cho phép thử lại; lỗi đồng bộ hoặc Promise đều trả về hướng dẫn.
    await act(async () => installEvent(() => { throw Error('NotAllowed') }, Promise.resolve({ outcome: 'dismissed' })))
    await act(async () => click(readyButton()))
    assert.equal(dialog().open, true)
    assert.match(document.querySelector('[role="alert"]').textContent, /Chưa mở được/)
    assert.equal(button().disabled, false)
    await act(async () => installEvent(() => Promise.reject(Error('Denied')), Promise.resolve({ outcome: 'dismissed' })))
    await act(async () => click(readyButton()))
    assert.equal(dialog().open, true)
    assert.ok(document.querySelector('[role="alert"]'))
    await act(async () => installEvent(() => { promptCalls++; return Promise.resolve() }, Promise.resolve({ outcome: 'accepted' })))
    await act(async () => click(readyButton()))
    await act(async () => window.dispatchEvent(new window.Event('appinstalled')))
    assert.equal(button(), undefined)
    assert.equal(dialog().open, false)
    await act(async () => root.unmount())
    // iPhone và Zalo có hướng dẫn phù hợp; standalone không hiện nút cài.
    const second = createRoot(document.getElementById('root'))
    Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'iPhone Zalo' })
    await act(async () => second.render(React.createElement(pwa.default, null, React.createElement(pwa.InstallAppButton))))
    await act(async () => click(button()))
    assert.match(dialog().textContent, /Safari/)
    assert.match(dialog().textContent, /Thêm vào Màn hình chính/)
    assert.match(dialog().textContent, /Mở bằng trình duyệt/)
    await act(async () => { standalone = true; displayListener() })
    assert.equal(button(), undefined)
    await act(async () => second.unmount())
  } finally { dom.window.close() }
  console.log('PWA install: valid WI300/MFC manifests and icon binaries; late readiness, synchronous prompt, double click, dismissal, retry, errors, installed state, iPhone/Zalo and admin 0 passed.')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
