const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const ts = require('typescript')
const { JSDOM } = require('jsdom')
const root = path.resolve(__dirname, '..')
const cache = new Map()
let uploadedHtml = ''
let denied = null
function load(file) {
  if (cache.has(file)) return cache.get(file)
  const module = { exports: {} }
  let source = fs.readFileSync(path.join(root, file), 'utf8')
  if (file.endsWith('course-page-template-actions.ts')) source += '\nexport { buildSnapshot }\n'
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  } }).outputText
  new Function('require', 'exports', 'module', code)(name => {
    if (name === '@/lib/api-auth') return { requireAdmin: async () => denied }
    if (name === '@/lib/image-utils') return { saveUploadedFile: async buffer => { uploadedHtml = buffer.toString(); return 'https://project.supabase.co/storage/v1/object/public/uploads/course-template-sources/test.html' } }
    if (name === '@/lib/prisma') return {}
    if (name === 'next/cache') return {}
    if (name === '@/lib/course-page/importer/image-mirror') return { mirrorAnalysisImages: async value => value }
    if (name.startsWith('@/')) return load(name.slice(2) + '.ts')
    if (name.startsWith('.')) return load(path.posix.join(path.posix.dirname(file), name) + '.ts')
    return require(name)
  }, module.exports, module)
  cache.set(file, module.exports)
  return module.exports
}

const fixture = `<!doctype html><html lang="vi"><head>
<script src="https://cdn.tailwindcss.com"></script>
<script>tailwind.config = { theme: {extend: {colors: {brand: {gold: '#D4AF37'}}, fontFamily: {sans: ['Montserrat', 'sans-serif']}}} };</script>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat">
<style>body{margin:0}.custom{color:red}</style></head>
<body class="font-sans"><main class="max-w-7xl mx-auto"><nav id="menu"><button id="mobile-menu-btn">Menu</button><div id="mobile-menu" class="hidden">Nội dung menu</div></nav>
<section id="hero" class="min-h-[90vh]"><h1 class="gs_reveal opacity-0 text-brand-gold">Khóa học</h1><div class="grid grid-cols-1 md:grid-cols-3"><p>Thông tin</p></div><a id="register" href="#dang-ky">Đăng ký</a></section>
<section id="dang-ky"><h2>Đăng ký</h2><form onsubmit=submitForm(event)><input name="name"><button>Gửi</button></form></section>
</main><footer>Footer</footer><script src="https://cdn.invalid/gsap.js"></script><script>throw new Error('untrusted')</script></body></html>`

async function run() {
  const { prepareStandaloneHtml, readTailwindConfig } = load('lib/course-page/importer/prepare-html.ts')
  const { analyzeWebsiteHtml } = load('lib/course-page/importer/html-analyzer.ts')
  const prepared = await prepareStandaloneHtml(fixture)
  const dom = new JSDOM(prepared.html, { runScripts: 'outside-only' })
  const doc = dom.window.document
  assert.ok(doc.querySelector('body > main > section#hero'), 'Preserve the original parent layout')
  assert.equal(doc.querySelectorAll('script[src]').length, 0)
  assert.equal(doc.querySelector('form').getAttribute('onsubmit'), null)
  const css = doc.querySelector('[data-mfc-compiled-tailwind]').textContent
  assert.ok(css.includes('.text-brand-gold') && css.includes('212 175 55'), 'Compile custom brand colors')
  assert.ok(css.includes('@media (min-width: 768px)') && css.includes('grid-template-columns: repeat(3'), 'Compile responsive layout')
  assert.ok(css.includes('min-height: calc(var(--mfc-viewport-height, 100vh) * 0.9)'), 'Avoid full-page iframe viewport feedback')
  assert.ok(doc.querySelector('link[rel="stylesheet"]').href.includes('fonts.googleapis.com'))
  assert.ok(!doc.querySelector('h1').classList.contains('opacity-0'), 'Reveal content remains readable')
  assert.ok(prepared.warnings.some(w => w.includes('Script nguồn')))
  for (const script of doc.querySelectorAll('script')) dom.window.eval(script.textContent)
  const events = []
  dom.window.parent.postMessage = payload => events.push(payload)
  dom.window.dispatchEvent(new dom.window.MessageEvent('message', { source: dom.window, data: {
    source: 'mfc-zip-parent', type: 'configure', selectedBlockKeys: ['menu', 'hero'], registrationBlockKeys: ['dang-ky'],
  } }))
  assert.equal(doc.getElementById('hero').hidden, false)
  assert.equal(doc.getElementById('dang-ky').hidden, true)
  doc.getElementById('register').click()
  assert.ok(events.some(e => e.type === 'action' && e.actionType === 'open_registration'), 'Use the existing course checkout')
  doc.getElementById('mobile-menu-btn').click()
  assert.equal(doc.getElementById('mobile-menu-btn').getAttribute('aria-expanded'), 'true')
  assert.equal(doc.getElementById('mobile-menu').classList.contains('hidden'), false)
  dom.window.dispatchEvent(new dom.window.MessageEvent('message', { source: dom.window, data: {
    source: 'mfc-zip-parent', type: 'viewport', height: 844,
  } }))
  assert.equal(doc.documentElement.style.getPropertyValue('--mfc-viewport-height'), '844px')
  await assert.rejects(prepareStandaloneHtml('<img src="images/missing.jpg">'), /Thiếu tài nguyên/)
  await assert.rejects(prepareStandaloneHtml('<style>.a{background:url(images/missing.jpg)}</style>'), /Thiếu tài nguyên/)
  await assert.rejects(prepareStandaloneHtml('<link rel="stylesheet" href="styles.css">'), /Thiếu tài nguyên/)
  await assert.rejects(prepareStandaloneHtml('<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>'), /v4/)
  assert.throws(() => readTailwindConfig(['tailwind.config={theme: {extend: {colors: {x: process.exit()}}}}']), /cấu hình động/)
  assert.throws(() => readTailwindConfig(['tailwind.config={plugins: []}']), /chưa hỗ trợ/)
  assert.throws(() => readTailwindConfig(['tailwind.config={__proto__: {bad:true}}']), /không hợp lệ/)
  const resolved = await prepareStandaloneHtml('<img src="image.png"><link rel="stylesheet" href="main.css">', 'https://example.com/course/')
  assert.ok(resolved.html.includes('https://example.com/course/image.png'))
  const analysis = analyzeWebsiteHtml({ html: prepared.analysisHtml, sourceType: 'html' })
  analysis.exactSource = { url: 'https://project.supabase.co/storage/v1/object/public/uploads/course-template-sources/test.html' }
  const { buildSnapshot } = load('app/actions/course-page-template-actions.ts')
  const snapshot = buildSnapshot('HTML', analysis, analysis.sections.map(s => s.id))
  assert.equal(snapshot.sections.length, 1, 'Save one page, not multiple iframe fragments')
  assert.equal(snapshot.sections[0].variant, 'zip-source-v1')
  assert.ok(snapshot.sections[0].content.registrationBlockKeys.includes('dang-ky'))
  const { POST } = load('app/api/admin/course-page-templates/analyze/route.ts')
  const { NextRequest, NextResponse } = require('next/server')
  const url = 'https://app.invalid/api/admin/course-page-templates/analyze'
  const body = require('node:zlib').gzipSync(fixture)
  const response = await POST(new NextRequest(url, { method: 'POST', headers: { 'Content-Type': 'application/gzip' }, body }))
  const result = await response.json()
  assert.equal(response.status, 200)
  assert.ok(result.analysis.exactSource.url)
  assert.ok(uploadedHtml.includes('data-mfc-compiled-tailwind'))
  const multipart = new FormData()
  multipart.append('file', new File([fixture], 'sample.html', { type: 'text/html' }))
  assert.equal((await POST(new NextRequest(url, { method: 'POST', body: multipart }))).status, 200)
  assert.equal((await POST(new NextRequest(url, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({html:fixture}) }))).status, 200)
  denied = NextResponse.json({ error: 'denied' }, {status:403})
  assert.equal((await POST(new NextRequest(url, {method:'POST',body}))).status, 403)
  dom.window.close()
  if (process.argv[2]) {
    const source = fs.readFileSync(process.argv[2], 'utf8')
    const actual = await prepareStandaloneHtml(source)
    const original = new JSDOM(source).window.document
    const output = new JSDOM(actual.html).window.document
    assert.equal(output.querySelectorAll('img').length, original.querySelectorAll('img').length)
    assert.equal(output.querySelectorAll('section').length, original.querySelectorAll('section').length)
    assert.equal(output.querySelector('h1').textContent, original.querySelector('h1').textContent)
    assert.ok(output.querySelector('[data-mfc-compiled-tailwind]').textContent.includes('.bg-brand-gold'))
    if (process.argv[3]) fs.writeFileSync(process.argv[3], actual.html)
    console.log('The Top 1: original content, images, sections and brand CSS passed.')
  }
  console.log('HTML import: CSS compilation, layout, checkout bridge, mobile menu, missing assets, config safety, snapshots and API transports passed.')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
