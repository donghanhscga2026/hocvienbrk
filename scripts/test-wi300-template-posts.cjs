const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const ts = require('typescript')
const { JSDOM } = require('jsdom')
const React = require('react')
function load(file, mocks = {}) {
  const module = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }
  }).outputText
  new Function('require', 'module', 'exports', code)(name => name in mocks ? mocks[name] : require(name), module, module.exports)
  return module.exports
}
async function run() {
  const { BRIDGE } = load('lib/course-page/importer/zip-browser.ts')
  const dom = new JSDOM('<header style="position:sticky;top:5px"><div><nav><a href="#first">First</a><a href="#second">Second</a><a href="#dang-ky" data-course="21">Register</a></nav></div></header><section id="first"></section><section id="second"></section>' + BRIDGE, { runScripts: 'outside-only', url: 'https://app.invalid/api/course-template-source' })
  const w = dom.window
  const header = w.document.querySelector('header')
  header.getBoundingClientRect = () => ({ height: 100 })
  const messages = []
  w.postMessage = message => messages.push(message)
  w.eval(w.document.querySelector('[data-mfc-zip-bridge]').textContent)
  const send = data => w.dispatchEvent(new w.MessageEvent('message', { source: w, data: { source: 'mfc-zip-parent', ...data } }))
  send({ type: 'configure', syncStickyNavigation: false })
  send({ type: 'viewport', top: 450 })
  assert.equal(header.style.top, '5px', 'Other deployments retain native header behavior')
  send({ type: 'configure', syncStickyNavigation: true })
  send({ type: 'viewport', top: 450 })
  assert.equal(header.style.top, '455px', 'Menu receives virtual viewport offset without replacing template markup')
  assert.ok(messages.some(message => message.type === 'navigation_metrics' && message.height === 105))
  send({ type: 'viewport', top: 800 })
  assert.equal(header.style.top, '805px')
  w.dispatchEvent(new w.Event('resize'))
  assert.equal(header.style.top, '805px', 'Resize must not add the virtual offset twice')
  send({ type: 'viewport', top: 0 })
  assert.equal(header.style.top, '5px', 'Scrolling to top restores original position')
  let clicks = 0
  w.document.addEventListener('click', () => clicks++)
  const anchors = [...w.document.querySelectorAll('a')]
  anchors[0].click(); anchors[1].click(); anchors[0].click()
  assert.equal(clicks, 3, 'Repeated section clicks reach template menu close handlers')
  assert.equal(messages.filter(message => message.type === 'scroll').length, 3)
  anchors[2].click()
  assert.equal(clicks, 3, 'Registration is still intercepted before the template payment handler')
  assert.ok(messages.some(message => message.actionType === 'open_registration'))
  send({ type: 'configure', syncStickyNavigation: false })
  assert.equal(header.style.top, '5px')
  dom.window.close()

  let session = null, reads = 0, updates = [], imageCalls = [], revalidated = []
  const existing = { id: 'post-1', title: 'Old', content: 'Old content', image: '/stored.png', authorId: 7, createdAt: '2026-01-01', pin: 2 }
  const actions = load('app/actions/post-actions.ts', {
    '@/auth': { auth: async () => session },
    '@/lib/prisma': { __esModule: true, default: { post: { findUnique: async () => { reads++; return existing }, update: async args => { updates.push(args); return { ...existing, ...args.data } } } } },
    'next/cache': { revalidatePath: value => revalidated.push(value) },
    '@/lib/image-utils': { resolveImageUrl: async value => { imageCalls.push(value); return value } }
  })
  const data = { title: ' New title ', content: ' New content ', image: '/stored.png' }
  assert.equal((await actions.updatePostAction('post-1', data)).success, false)
  session = { user: { id: '9', role: 'STUDENT' } }
  assert.equal((await actions.updatePostAction('post-1', data)).success, false)
  assert.equal(reads, 0); assert.equal(updates.length, 0)
  session = { user: { id: '9', role: 'ADMIN' } }
  assert.equal((await actions.updatePostAction('post-1', { ...data, title: ' ' })).success, false)
  assert.equal((await actions.updatePostAction('post-1', { ...data, image: 'javascript:alert(1)' })).success, false)
  assert.equal(updates.length, 0)
  const saved = await actions.updatePostAction('post-1', data)
  assert.equal(saved.success, true)
  assert.deepEqual(updates[0], { where: { id: 'post-1' }, data: { title: 'New title', content: 'New content', image: '/stored.png' } })
  assert.equal(saved.post.authorId, existing.authorId); assert.equal(saved.post.createdAt, existing.createdAt); assert.equal(saved.post.pin, 2)
  assert.equal(imageCalls.length, 0, 'Editing text does not upload the image again')
  await actions.updatePostAction('post-1', { ...data, image: '' })
  assert.equal(updates[1].data.image, null)
  assert.deepEqual(imageCalls, [null])
  assert.ok(revalidated.includes('/tools/posts'))

  const uiDom = new JSDOM('<div id="root"></div>', { url: 'https://wi300.vn/tools/posts?edit=post-1' })
  global.window = uiDom.window; global.document = uiDom.window.document; global.IS_REACT_ACT_ENVIRONMENT = true
  const { createRoot } = require('react-dom/client')
  const { act } = React
  const root = createRoot(document.getElementById('root'))
  const page = load('app/tools/posts/page.tsx', {
    'next-auth/react': { useSession: () => ({ data: session, status: 'authenticated' }) },
    'next/link': { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) },
    '@/components/layout/MainHeader': { __esModule: true, default: () => null },
    '@/app/actions/post-actions': {
      getPostsAction: async () => ({ success: true, posts: [existing], totalPages: 1 }),
      getPostDetailAction: async () => ({ success: true, post: existing }),
      updatePostAction: actions.updatePostAction,
      createPostAction: async () => { throw Error('Edit must not create a new post') }
    }
  }).default
  await act(async () => root.render(React.createElement(page)))
  assert.equal(document.getElementById('post-title').value, 'Old', 'Deep link opens the existing post form')
  await act(async () => document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })))
  assert.match(document.body.textContent, /Đã cập nhật bài viết/)
  session = { user: { role: 'STUDENT' } }
  await act(async () => root.render(React.createElement(page)))
  assert.equal(document.querySelector('form'), null)
  assert.equal(document.querySelector('button[aria-label^="Sửa"]'), null)
  await act(async () => root.unmount())
  uiDom.window.close()

  const Business = load('components/wi300/Wi300Businesses.tsx', {
    './Wi300Businesses.module.css': { __esModule: true, default: { viewport: 'viewport', track: 'track', group: 'group', copy: 'copy', paused: 'paused' } },
    'next/image': { __esModule: true, default: props => React.createElement('img', props) }
  }).default
  const html = require('react-dom/server').renderToStaticMarkup(React.createElement(Business))
  const businessDoc = new JSDOM(html).window.document
  assert.equal(businessDoc.querySelectorAll('ul[aria-label] li').length, 6)
  assert.equal(businessDoc.querySelectorAll('ul[aria-label] [role="img"]').length, 5)
  assert.equal(businessDoc.querySelectorAll('ul[aria-hidden="true"] li').length, 6)
  assert.match(businessDoc.querySelector('img').src, /wi-grow.png/)
  assert.equal(businessDoc.querySelectorAll('a').length, 0, 'No invented company URLs')
  console.log('WI300 template viewport, repeated menu navigation, registration isolation, post edit authorization/UI and business identities passed.')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
