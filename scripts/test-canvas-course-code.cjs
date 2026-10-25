// Biên dịch thật, không tải CDN/ảnh hoặc ghi dữ liệu trực tuyến.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { JSDOM, VirtualConsole } = require('jsdom')
const load = require('./helpers/load-ts.cjs')
// JSDOM không hiểu toàn bộ CSS hiện đại của Tailwind; vẫn báo lỗi JS thực.
const virtualConsole = new VirtualConsole()
virtualConsole.on('jsdomError', error => { if (error.type !== 'css parsing') throw error })
const domOf = (html, options = {}) => new JSDOM(html, { virtualConsole, ...options })
const { prepareCourseCode } = load('lib/course-page/course-code-server.ts')
const { compileCourseCode } = load('lib/course-page/course-code.ts')
const svg = text => 'data:image/svg+xml;base64,' + Buffer.from(text).toString('base64')
const pattern = svg('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="2" cy="2" r="1" fill="rgba(255,215,0,0.1)"/></svg>')
// Không để bộ quét CSS của ứng dụng hiểu biến fixture là đường dẫn ảnh thật.
const patternClass = 'bg-' + "[url('" + pattern + "')]"
const sample = `<!doctype html><html><head><script src="https://cdn.tailwindcss.com"></script><script>tailwind.config={theme:{extend:{colors:{luxury:{gold:'#FFD700'}},fontFamily:{serif:['Cinzel','serif']}}}}</script><link href="https://fonts.googleapis.com/css2?family=Cinzel" rel="stylesheet"><style>.reveal-up{opacity:0}.reveal-up.active{opacity:1}</style></head><body><section class="bg-luxury-gold md:grid-cols-3"><h1 class="reveal-up font-serif">The Top 1%</h1><div class="${patternClass}"></div><img src="https://i.postimg.cc/example/cover.jpg"><img src="https://i.ibb.co/example/avatar.png"><a href="#register">Join</a><form onsubmit="window.fakeSubmit=true"><input name="email"><button>Join</button></form></section><script>window.canvasScriptRan=true;document.querySelector('h1').classList.add('active');document.body.classList.add('py-4')</script></body></html>`
async function run() {
  const fetch = global.fetch
  global.fetch = () => { throw Error('Must not download assets') }
  try {
    const out = await prepareCourseCode(sample)
    const dom = domOf(out.html, { runScripts: 'dangerously', url: 'https://test.invalid' })
    const doc = dom.window.document, css = doc.querySelector('[data-course-tailwind-css]').textContent
    assert.match(css, /\.bg-luxury-gold/); assert.match(css, /#FFD700|255 215 0/i)
    assert.match(css, /\.md\\:grid-cols-3/); assert.match(css, /\.py-4/)
    assert.equal(doc.querySelector('script[src]'), null)
    assert.equal(doc.querySelectorAll('[data-course-tailwind-config]').length, 1)
    assert.equal(dom.window.canvasScriptRan, true); assert.equal(dom.window.tailwind, undefined)
    assert.ok(doc.querySelector('h1').classList.contains('active'))
    assert.equal(doc.querySelector('img').getAttribute('src'), 'https://i.postimg.cc/example/cover.jpg')
    assert.ok(doc.querySelector('meta[http-equiv]').content.includes("connect-src 'none'"))
    const events = []; dom.window.parent.postMessage = event => events.push(event)
    doc.querySelector('a').click()
    doc.querySelector('form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }))
    assert.equal(dom.window.fakeSubmit, undefined, 'Fake form handler cannot replace real registration')
    assert.equal(events.filter(event => event.actionType === 'open_registration').length, 2)
    dom.window.close()
    const reopened = await prepareCourseCode(out.html.replace('md:grid-cols-3', 'md:grid-cols-3 text-6xl'))
    const again = domOf(reopened.html)
    assert.equal(again.window.document.querySelectorAll('[data-course-tailwind-css]').length, 1)
    assert.match(again.window.document.querySelector('[data-course-tailwind-css]').textContent, /\.text-6xl/)
    again.window.close()
    const directive = await prepareCourseCode(sample.replace('</head>', '<style type="text/tailwindcss">.custom{@apply text-2xl;}</style></head>'))
    const repeated = await prepareCourseCode(directive.html)
    assert.equal(domOf(repeated.html).window.document.querySelectorAll('[data-course-tailwind-input]').length, 1)
    for (const unsafe of [
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://evil.invalid/a"/></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><div>HTML</div></foreignObject></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><circle style="fill:red"/></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><circle fill="url(https://evil.invalid/a)"/></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg">' + ' '.repeat(4096) + '</svg>',
    ]) assert.throws(() => compileCourseCode(`<div style="background:url('${svg(unsafe)}')"></div>`), /SVG|Base64/)
    assert.throws(() => compileCourseCode('<img src="data:image/png;base64,aGVsbG8=">'), /Base64/)
    await assert.rejects(prepareCourseCode(sample.replace("{theme:{", "{plugins:[require('evil')],theme:{")), /plugin|hỗ trợ/)
    global.__tailwindMustNotExecute = false
    await assert.rejects(prepareCourseCode(sample.replace("{theme:{", "{theme:(global.__tailwindMustNotExecute=true),unused:{")), /hỗ trợ/)
    assert.equal(global.__tailwindMustNotExecute, false)
    await assert.rejects(prepareCourseCode(sample.replace('https://cdn.tailwindcss.com', 'https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4')), /v4/)
    if (process.env.CANVAS_SAMPLE_PATH) {
      const actual = await prepareCourseCode(fs.readFileSync(process.env.CANVAS_SAMPLE_PATH, 'utf8'))
      const parsed = domOf(actual.html)
      assert.equal(parsed.window.document.querySelectorAll('img[src^="https://images.unsplash.com/"]').length, 3)
      assert.match(parsed.window.document.querySelector('[data-course-tailwind-css]').textContent, /pulseGlow|shimmerText/)
      console.log('PASS original uploaded sample:', Buffer.byteLength(actual.html), 'bytes; all 3 remote images retained')
    }
    console.log('PASS Canvas: Tailwind theme/responsive/JS classes, safe SVG, unchanged external assets, isolated scripts, checkout interception, re-edit without CSS duplication, no network or config execution')
  } finally { global.fetch = fetch }
}
run().catch(error => { console.error(error); process.exitCode = 1 })
