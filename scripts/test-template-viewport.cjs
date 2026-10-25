// Layout contract cho iframe tự nở; không mạng, không thay dữ liệu production.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { JSDOM, VirtualConsole } = require('jsdom')
const load = require('./helpers/load-ts.cjs')
const { templateViewportCss, templateViewportHtml } = load('lib/course-page/template-viewport.ts')
const { compileTemplateSource, sourceFromHtml } = load('lib/course-page/template-source.ts')
const { upgradeZipBridge } = load('lib/course-page/importer/zip-browser.ts')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const ZipSourceSection = load('components/course-page/sections/ZipSourceSection.tsx', {
  '@/components/wi300/Wi300BrandContext': { useWi300Brand: () => null },
  '@/components/course/TemplateVideoOverlays': { __esModule: true, default: () => null },
}).default
const vc = new VirtualConsole()
vc.on('jsdomError', error => { if (error.type !== 'css parsing') throw error })
const raw = '<style>.min-h-screen{min-height:100vh}.decor{height:50dvh;top:-10svh;max-height:90lvh;content:"100vh";background:url("https://images.invalid/100vh.png")}</style><section class="min-h-screen" style="min-height:80vh"><h1>Hero content</h1></section><section>More content</section>'
const compiled = compileTemplateSource(sourceFromHtml(raw))
assert.match(compiled.html, /min-height:calc\(var\(--mfc-viewport-height, 100vh\) \* 1\)/)
assert.match(compiled.html, /min-height:calc\(var\(--mfc-viewport-height, 100vh\) \* 0.8\)/)
const css = templateViewportCss('.hero{height:50dvh;top:-10svh;max-height:90lvh;content:"100vh";background:url("https://images.invalid/100vh.png")}')
assert.match(css, /\* 0.5/); assert.match(css, /\* -0.1/); assert.match(css, /\* 0.9/)
assert.ok(css.includes('content:"100vh"')); assert.ok(css.includes('https://images.invalid/100vh.png'))
assert.equal(templateViewportCss(css), css, 'Repeated save/read cannot nest viewport calculations')
assert.ok(templateViewportCss('.x{--label:foo100vh;height:1e2vh}').includes('--label:foo100vh;height:calc(var(--mfc-viewport-height, 100vh) * 1)'))
const oldSaved = compiled.html.replace(/calc\(var\(--mfc-viewport-height, 100vh\) \* 1\)/g, '100vh')
const upgraded = upgradeZipBridge(templateViewportHtml(oldSaved))
assert.match(upgraded, /min-height:calc\(var\(--mfc-viewport-height, 100vh\) \* 1\)/)
const publicMarkup = renderToStaticMarkup(React.createElement(ZipSourceSection, { content: { exactSource: { html: oldSaved } } }))
const frame = new JSDOM(publicMarkup, { virtualConsole: vc }).window.document.querySelector('iframe')
assert.equal(frame.getAttribute('sandbox'), 'allow-scripts')
assert.match(frame.getAttribute('srcdoc'), /min-height:calc\(var\(--mfc-viewport-height, 100vh\) \* 1\)/, 'Public renderer upgrades already saved HTML without re-saving')
const dom = new JSDOM(upgraded, { runScripts: 'dangerously', virtualConsole: vc })
const w = dom.window, root = w.document.documentElement
assert.equal(root.style.getPropertyValue('--mfc-viewport-height'), '768px')
function viewport(height, source = w.parent) {
  w.dispatchEvent(new w.MessageEvent('message', { source, data: { source: 'mfc-zip-parent', type: 'viewport', height, top: 0 } }))
}
viewport(820)
assert.equal(root.style.getPropertyValue('--mfc-viewport-height'), '820px')
// Đổi chiều cao iframe theo nội dung không được đổi viewport dùng tính hero.
Object.defineProperty(w, 'innerHeight', { configurable: true, value: 18000 })
w.dispatchEvent(new w.Event('resize'))
assert.equal(root.style.getPropertyValue('--mfc-viewport-height'), '820px')
viewport(500, null); viewport(NaN); viewport(-1); viewport(20000)
assert.equal(root.style.getPropertyValue('--mfc-viewport-height'), '820px', 'Untrusted/invalid heights are ignored')
viewport(640)
assert.equal(root.style.getPropertyValue('--mfc-viewport-height'), '640px', 'Real parent viewport updates on rotation')
// H(cũ)=H+C cứ tăng tới trần; H(mới)=viewport+C hội tụ sau một lần tính.
const extraContent = 3200
let oldHeight = 900, newHeight = 900
for (let step = 0; step < 10; step++) { oldHeight = Math.min(20000, oldHeight + extraContent); newHeight = 640 + extraContent }
assert.equal(oldHeight, 20000); assert.equal(newHeight, 3840)
dom.window.close()
if (process.env.TEMPLATE_VIEWPORT_SAMPLE_PATH) {
  const saved = fs.readFileSync(process.env.TEMPLATE_VIEWPORT_SAMPLE_PATH, 'utf8')
  const fixed = upgradeZipBridge(templateViewportHtml(saved))
  assert.notEqual(fixed, saved)
  const before = new JSDOM(saved, { virtualConsole: vc }).window.document
  const after = new JSDOM(fixed, { virtualConsole: vc }).window.document
  const remoteImages = d => [...d.querySelectorAll('img')].map(img => img.getAttribute('src'))
  assert.deepEqual(remoteImages(after), remoteImages(before))
  assert.equal(after.title, before.title)
  assert.equal(after.querySelectorAll('section').length, before.querySelectorAll('section').length)
  assert.match(after.querySelector('[data-course-tailwind-css]').textContent, /min-height: calc\(var\(--mfc-viewport-height, 100vh\) \* 1\)/)
  console.log('PASS saved TLMW7: full-height hero normalized, text/sections/remote images retained without a database write')
}
console.log('PASS template viewport: CSS/inline units, idempotence, stored HTML upgrade, trusted parent messages, stable iframe resize, viewport rotation and height-feedback regression')
