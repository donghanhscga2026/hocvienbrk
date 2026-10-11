const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const ts = require('typescript')
const React = require('react')
const { act } = React
const { JSDOM } = require('jsdom')
function load(file, overrides = {}) {
  const module = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  new Function('require', 'module', 'exports', code)(name => name in overrides ? overrides[name] : require(name), module, module.exports)
  return module.exports
}
async function run() {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://wi300.example/my-requests' })
  global.window = dom.window; global.document = dom.window.document
  Object.defineProperty(global, 'navigator', { configurable: true, value: dom.window.navigator })
  global.IS_REACT_ACT_ENVIRONMENT = true
  let params = new URLSearchParams()
  const MyRequests = load('components/crm/MyRequests.tsx', {
    'next/navigation': { useSearchParams: () => params },
    '@/lib/crm/request-workflow': { REQUEST_TOPICS: { SUPPORT: 'Hỗ trợ kỹ thuật' } },
    '@/lib/crm/shared': { REQUEST_CATEGORIES: { SUPPORT: 'Hỗ trợ kỹ thuật' }, REQUEST_STATUSES: { NEW: 'Mới gửi', IN_PROGRESS: 'Đang xử lý', RESOLVED: 'Đã xử lý' }, formatCrmDate: date => date },
  }).default
  const { createRoot } = require('react-dom/client')
  const root = createRoot(document.getElementById('root'))
  const source = { id: 'request-1', topic: 'SUPPORT', category: 'SUPPORT', status: 'RESOLVED', version: 7, createdAt: '2026-10-02', updatedAt: '2026-10-03', content: 'Tôi cần hỗ trợ <img src=x onerror=alert(1)>', publicReply: 'Đã hướng dẫn', thread: [{ action: 'SEND_REPLY', content: 'Phản hồi mới nhất', changedAt: '2026-10-03' }], course: { name_lop: '99+ Quà Tặng', id_khoa: '99/GIFT' }, lessonId: 'bài 1' }
  let rows = [source], total = 1, fail = false, resolvePatch
  const calls = []
  const savedFetch = global.fetch
  global.fetch = async (url, options = {}) => {
    calls.push({ url, options })
    if (options.method === 'PATCH') {
      if (resolvePatch === 'defer') await new Promise(resolve => { resolvePatch = resolve })
      return { ok: !fail, json: async () => fail ? { error: 'Dữ liệu đã thay đổi, tải lại trước khi gửi.' } : { success: true } }
    }
    return { ok: !fail, json: async () => fail ? { error: 'Không tải được dữ liệu' } : { requests: rows, total } }
  }
  const render = () => root.render(React.createElement(MyRequests))
  const button = name => [...document.querySelectorAll('button')].find(b => b.textContent === name)
  const click = el => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }))
  try {
    await act(async () => render())
    assert.equal(document.querySelectorAll('article').length, 1)
    assert.equal(document.querySelector('textarea'), null, 'Thẻ gọn, ô nhập đóng mặc định')
    assert.match(document.querySelector('article').textContent, /Phản hồi mới nhất/)
    assert.ok(document.querySelector('details:not([open])'))
    assert.equal(document.querySelector('article img'), null, 'Nội dung người gửi chỉ hiển thị dạng text')
    assert.equal(button('Trước'), undefined, 'Không hiện nút phân trang vô nghĩa khi chỉ có một trang')
    assert.equal(document.querySelector('article a').getAttribute('href'), '/courses/99%2FGIFT/learn?lesson=b%C3%A0i%201')
    await act(async () => click(button('Bổ sung thông tin')))
    const textarea = document.querySelector('textarea')
    assert.equal(document.activeElement, textarea)
    assert.equal(button('Gửi bổ sung').disabled, true)
    assert.match(document.querySelector('form').textContent, /mở lại yêu cầu/)
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(textarea, 'Câu hỏi bổ sung')
      textarea.dispatchEvent(new window.Event('input', { bubbles: true }))
    })
    assert.equal(button('Gửi bổ sung').disabled, false)
    resolvePatch = 'defer'
    await act(async () => { document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })); document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })) })
    const patches = calls.filter(c => c.options.method === 'PATCH')
    assert.equal(patches.length, 1, 'Chặn gửi bổ sung trùng khi bấm nhiều lần')
    assert.deepEqual(JSON.parse(patches[0].options.body), { id: source.id, version: 7, content: 'Câu hỏi bổ sung' })
    assert.equal(document.querySelector('textarea').readOnly, true)
    await act(async () => resolvePatch())
    resolvePatch = null
    assert.equal(document.querySelector('textarea'), null)
    assert.ok(calls.filter(c => !c.options.method).length > 1, 'Gửi thành công tải lại phản hồi')
    await act(async () => click(button('Cần hỗ trợ thêm')))
    assert.deepEqual(JSON.parse(calls.filter(c => c.options.method === 'PATCH').at(-1).options.body), { id: source.id, version: 7 }, 'Giữ thao tác mở lại không cần nhập nội dung')
    fail = true
    await act(async () => click(button('Cần hỗ trợ thêm')))
    assert.match(document.querySelector('[role="alert"]').textContent, /Dữ liệu đã thay đổi/)
    fail = false
    rows = [{ ...source, status: 'NEW', publicReply: '', thread: [] }]
    total = 21
    await act(async () => click(button('Tải lại')))
    assert.equal(button('Cần hỗ trợ thêm'), undefined)
    assert.ok(button('Bổ sung thông tin'))
    assert.match(document.querySelector('article').textContent, /chưa phản hồi/)
    assert.equal(button('Trước').disabled, true)
    await act(async () => click(button('Sau')))
    assert.ok(calls.some(c => String(c.url).includes('page=2')))
    assert.equal(button('Sau').disabled, true)
    params = new URLSearchParams('request=request-1')
    await act(async () => render())
    assert.ok(calls.some(c => String(c.url).includes('request=request-1')))
    await act(async () => click(button('Xem tất cả yêu cầu →')))
    assert.equal(button('Xem tất cả yêu cầu →'), undefined)
    assert.equal(calls.at(-1).url, '/api/my-requests?page=1')
    rows = []; total = 0
    await act(async () => click(button('Tải lại')))
    assert.match(document.body.textContent, /Chưa có yêu cầu phù hợp/)
    assert.equal(document.querySelector('[aria-label="Phân trang yêu cầu"]'), null)
    await act(async () => root.unmount())
  } finally { global.fetch = savedFetch; dom.window.close() }
  console.log('My requests UI: compact cards, full conversation, text escaping, hidden/focused composer, versioned submit, double-send guard, reopen, conflicts, statuses, targeted requests and pagination passed.')
}
run().catch(e => { console.error(e); process.exitCode = 1 })
