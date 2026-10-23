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
  new Function('require', 'module', 'exports', code)(name => {
    if (name in overrides) return overrides[name]
    if (name.startsWith('@/') || name.startsWith('./')) {
      const base = name.startsWith('@/') ? name.slice(2) : path.posix.join(path.posix.dirname(file), name)
      const resolved = ['.tsx', '.ts'].map(ext => base + ext).find(candidate => fs.existsSync(path.join(__dirname, '..', candidate)))
      if (resolved) return load(resolved, overrides)
    }
    return require(name)
  }, module, module.exports)
  return module.exports
}
async function run() {
  const model = load('lib/wi300/personal-space.ts', { './catalog': load('lib/wi300/catalog.ts') })
  const tools = [
    { id: 1, name: 'CRM', url: '/tools/crm', roles: ['TEACHER'], isActive: true, icon: 'Users' },
    { id: 2, name: 'Sao lưu', url: '/tools/backup', roles: ['ADMIN'], isActive: true },
    { id: 3, name: 'Developer only', url: '/tools/dev-flow', roles: ['DEVELOPER'], isActive: true },
    { id: 4, name: 'Độc hại', url: 'javascript:alert(1)', roles: [], isActive: true },
    { id: 5, name: 'Ẩn', url: '/tools/youtube-tools', roles: [], isActive: false },
    { id: 6, name: 'Lộ trình', url: '/tools/roadmap', roles: ['STUDENT'], isActive: true },
  ]
  for (const role of ['guest', 'STUDENT', 'TEACHER', 'ADMIN']) {
    const groups = model.spaceNavigation(role, tools)
    assert.equal(groups.some(g => g.id === 'teaching'), ['TEACHER', 'ADMIN'].includes(role))
    assert.equal(groups.some(g => g.id === 'admin'), role === 'ADMIN')
    const hrefs = groups.flatMap(g => g.items.map(i => i.href))
    assert.ok(!hrefs.some(h => h.startsWith('javascript:')))
    assert.ok(!hrefs.includes('/tools/dev-flow'))
    assert.ok(!hrefs.includes('/tools/youtube-tools'))
    assert.equal(hrefs.includes('/tools/crm'), ['TEACHER', 'ADMIN'].includes(role))
    assert.ok(hrefs.includes('/my-space?tab=learning&status=completed'))
    assert.equal(hrefs.includes('/tools/backup'), role === 'ADMIN')
  }
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://wi300.example/' })
  global.window = dom.window; global.document = dom.window.document; global.Node = dom.window.Node
  Object.defineProperty(global, 'navigator', { configurable: true, value: dom.window.navigator })
  global.IS_REACT_ACT_ENVIRONMENT = true
  let hover = true, desktop = true
  window.matchMedia = query => ({ matches: query.includes('min-width') ? desktop : hover })
  const link = { __esModule: true, default: ({ children, onNavigate, scroll, onClick, ...props }) => React.createElement('a', { ...props, onClick: e => { e.preventDefault(); onClick?.(e); onNavigate?.() } }, children) }
  const menu = load('components/wi300/Wi300SpaceMenu.tsx', { 'next/link': link, '@/lib/wi300/personal-space': model })
  const { createRoot } = require('react-dom/client')
  const root = createRoot(document.getElementById('root'))
  let requests = 0, fail = false
  const savedFetch = global.fetch
  global.fetch = async () => { requests++; return { ok: !fail, json: async () => ({ tools }) } }
  const click = el => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }))
  const enter = el => el.dispatchEvent(new window.MouseEvent('pointerover', { bubbles: true }))
  const findButton = name => [...document.querySelectorAll('button')].find(b => b.textContent === name || b.getAttribute('aria-label') === name)
  const panel = () => document.querySelector('[aria-label="Lối tắt Không gian của tôi"]')
  const render = (role = 'TEACHER', actorKey = '0', route = '/') => root.render(React.createElement(menu.default, { role, actorKey, route }))
  try {
    await act(async () => render())
    assert.equal(requests, 0, 'Không gọi API trước khi mở menu')
    await act(async () => enter(document.querySelector('a[aria-label="Không gian của tôi"]')))
    assert.ok(panel(), 'Rê chuột mở menu mà không chuyển trang')
    assert.equal(requests, 1)
    await act(async () => enter(findButton('Quản lý & kinh doanh')))
    assert.ok(panel().querySelector('a[href="/tools/crm"]'))
    assert.equal(window.location.pathname, '/')
    await act(async () => panel().dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    assert.equal(panel(), null)
    assert.equal(document.activeElement.getAttribute('aria-label'), 'Mở lối tắt Không gian của tôi')
    await act(async () => click(findButton('Mở lối tắt Không gian của tôi')))
    assert.equal(requests, 1, 'Danh sách lối tắt được dùng lại')
    await act(async () => enter(findButton('Học tập')))
    assert.ok(panel().querySelector('a[href*="status=pending"]'))
    await act(async () => click(panel().querySelector('a[href*="status=completed"]')))
    assert.equal(panel(), null)
    hover = false
    await act(async () => enter(document.querySelector('a[aria-label="Không gian của tôi"]')))
    assert.equal(panel(), null, 'Cảm ứng không giả lập hover')
    await act(async () => click(findButton('Mở lối tắt Không gian của tôi')))
    assert.ok(panel())
    await act(async () => click(findButton('Quản lý & kinh doanh')))
    assert.ok(panel().querySelector('a[href="/tools/crm"]'))
    await act(async () => document.body.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true })))
    assert.equal(panel(), null)
    await act(async () => render('STUDENT', '9', '/my-space'))
    await act(async () => click(findButton('Mở lối tắt Không gian của tôi')))
    assert.equal(findButton('Quản lý & kinh doanh'), undefined)
    assert.equal(findButton('Quản trị hệ thống'), undefined)
    assert.ok(!panel().querySelector('a[href="/tools/crm"]'))
    assert.equal(requests, 2, 'Đổi tài khoản tải lại đúng phạm vi')
    await act(async () => render('STUDENT', '9', '/my-requests'))
    assert.equal(panel(), null, 'Đổi trang đóng menu')
    fail = true
    await act(async () => render('TEACHER', '11', '/'))
    await act(async () => click(findButton('Mở lối tắt Không gian của tôi')))
    assert.match(panel().textContent, /Chưa tải được/)
    assert.ok(panel().querySelector('a[href="/my-space"]'), 'API lỗi vẫn mở được nhóm')
    let navigations = 0
    await act(async () => root.render(React.createElement(menu.SpaceSidebar, { groups: model.spaceNavigation('TEACHER', tools), active: 'learning', route: 'tab=learning', onNavigate: () => navigations++, loading: false, failed: false })))
    await act(async () => click(findButton('Lối tắt Quản lý & kinh doanh')))
    assert.ok(document.querySelector('a[href="/tools/crm"]'))
    await act(async () => click(document.querySelector('a[href="/tools/crm"]')))
    assert.equal(findButton('Lối tắt Quản lý & kinh doanh').getAttribute('aria-expanded'), 'false')
    hover = true
    await act(async () => enter(document.querySelector('a[href="/my-space?tab=learning"]').parentElement))
    assert.equal(findButton('Lối tắt Học tập').getAttribute('aria-expanded'), 'true')
    assert.ok(document.querySelector('a[href*="status=completed"]'))
    assert.equal(navigations, 0)
    const oldRect = window.HTMLElement.prototype.getBoundingClientRect
    const oldHeight = Object.getOwnPropertyDescriptor(window.HTMLElement.prototype, 'scrollHeight')
    let rowTop=300, panelHeight=90
    Object.defineProperty(window,'innerHeight',{configurable:true,value:800})
    window.HTMLElement.prototype.getBoundingClientRect=function(){
      const top=this.getAttribute('aria-label')==='Menu không gian cá nhân'?100:this.parentElement?.hasAttribute('data-space-group')?rowTop:0
      return {top,bottom:top+44,left:0,right:290,width:290,height:44,x:0,y:top,toJSON:()=>({})}
    }
    Object.defineProperty(window.HTMLElement.prototype,'scrollHeight',{configurable:true,get(){return this.style.getPropertyValue('--space-submenu-top')?panelHeight:0}})
    const submenu=()=>document.getElementById(findButton('Lối tắt Quản lý & kinh doanh').getAttribute('aria-controls'))
    await act(async()=>enter(findButton('Lối tắt Quản lý & kinh doanh').parentElement))
    assert.equal(submenu().style.getPropertyValue('--space-submenu-top'),'200px','Menu bắt đầu ngang dòng đang rê chuột')
    rowTop=750;panelHeight=450
    await act(async()=>window.dispatchEvent(new window.Event('resize')))
    assert.equal(submenu().style.getPropertyValue('--space-submenu-top'),'242px','Chỉ đẩy lên khi vượt đáy màn hình')
    assert.equal(submenu().style.getPropertyValue('--space-submenu-max-height'),'520px')
    rowTop=260
    await act(async()=>window.dispatchEvent(new window.Event('scroll')))
    assert.equal(submenu().style.getPropertyValue('--space-submenu-top'),'160px')
    window.HTMLElement.prototype.getBoundingClientRect=oldRect
    if(oldHeight)Object.defineProperty(window.HTMLElement.prototype,'scrollHeight',oldHeight)
    else delete window.HTMLElement.prototype.scrollHeight
    desktop=false;hover=false
    await act(async()=>click(findButton('Học tập')))
    assert.equal(findButton('Học tập').getAttribute('aria-expanded'),'true','Chạm chữ trên điện thoại mở mục con')
    assert.ok(document.querySelector('a[href*="status=pending"]'))
    assert.equal(navigations,0,'Chạm tên nhóm không chuyển trang hoặc cuộn xuống nội dung')
    await act(async()=>click(findButton('Học tập')))
    assert.equal(findButton('Lối tắt Học tập').getAttribute('aria-expanded'),'false')
    await act(async()=>click(findButton('Lối tắt Học tập')))
    assert.equal(findButton('Học tập').getAttribute('aria-expanded'),'true','Nút > và chữ dùng cùng trạng thái')
    await act(async()=>click(document.querySelector('a[href*="status=completed"]')))
    assert.equal(findButton('Học tập').getAttribute('aria-expanded'),'false','Chọn mục con mới điều hướng và đóng')
    desktop=true;hover=true
    await act(async()=>click(document.querySelector('a[href="/my-space?tab=teaching"]')))
    assert.equal(navigations,1,'Link nhóm trên máy tính vẫn mở trực tiếp nội dung')
    await act(async () => root.unmount())
  } finally { global.fetch = savedFetch; dom.window.close() }
  console.log('WI300 space menu: role/URL isolation, lazy cached tools, hover/touch, keyboard/Escape, outside close, account/route reset, API fallback and sidebar direct shortcuts passed.')
}
run().catch(e => { console.error(e); process.exitCode = 1 })
