const assert = require('node:assert/strict')
const fs = require('node:fs')
const { JSDOM, VirtualConsole } = require('jsdom')
const load = require('./helpers/load-ts.cjs')
const { prepareCourseCode } = load('lib/course-page/course-code-server.ts')
const { isAosAsset } = load('lib/course-page/course-code-libraries-server.ts')
const { needsCourseCodePreparation } = load('lib/course-page/course-code.ts')
const vc = new VirtualConsole()
const errors = []
vc.on('jsdomError', error => { if (error.type !== 'css parsing') errors.push(error.message) })
const source = '<link href="https://unpkg.com/aos@2.3.1/dist/aos.css" rel="stylesheet"><h1 data-aos="fade-up">Visible content</h1><img src="https://i.postimg.cc/demo/cover.jpg"><script src="https://unpkg.com/aos@2.3.1/dist/aos.js"></script><script>AOS.init({once:true,duration:800});window.afterAos=true</script>'
async function check(html, expectedCount) {
  errors.length = 0
  const dom = new JSDOM(html, { runScripts: 'dangerously', virtualConsole: vc })
  await new Promise(resolve => dom.window.addEventListener('load', resolve, { once: true }))
  const doc = dom.window.document
  assert.equal(typeof dom.window.AOS?.init, 'function')
  assert.equal(doc.querySelectorAll('.aos-init').length, expectedCount)
  assert.equal(doc.querySelectorAll('.aos-animate').length, expectedCount)
  assert.deepEqual(errors, [])
  assert.equal(doc.querySelectorAll('script[src]').length, 0)
  assert.equal(doc.querySelectorAll('[data-course-library="aos-2.3.4"]').length, 1)
  assert.equal(doc.querySelectorAll('[data-course-library-style="aos-2.3.4"]').length, 1)
  assert.match(doc.querySelector('[data-course-library]').textContent, /Copyright \(c\) 2015/)
  assert.ok(doc.querySelector('meta[http-equiv]').content.includes("connect-src 'none'"))
  return dom
}
async function run() {
  const originalFetch = global.fetch
  global.fetch = () => { throw Error('Must not fetch a CDN or mirror images') }
  try {
    assert.ok(needsCourseCodePreparation(source))
    for (const host of ['https://unpkg.com/aos@2.3.1/dist/aos.js', 'https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.js', 'https://cdnjs.cloudflare.com/ajax/libs/aos/2.3.4/aos.js']) assert.equal(isAosAsset(host, 'js'), true)
    for (const host of ['http://unpkg.com/aos@2.3.1/dist/aos.js', 'https://unpkg.com.evil.invalid/aos@2.3.1/dist/aos.js', 'https://unpkg.com/aos@3.0.0/dist/aos.js', 'https://unpkg.com/evil/dist/aos.js', 'https://unpkg.com/aos@2.3.1/dist/aos.js?redirect=evil', 'https://user:pass@unpkg.com/aos@2.3.1/dist/aos.js']) assert.equal(isAosAsset(host, 'js'), false)
    const out = await prepareCourseCode(source)
    assert.equal(global.AOS, undefined, 'Do not execute library or author JS on the server')
    const dom = await check(out.html, 1)
    assert.equal(dom.window.afterAos, true, 'Remaining author scripts continue after AOS.init')
    assert.equal(dom.window.document.querySelector('img').getAttribute('src'), 'https://i.postimg.cc/demo/cover.jpg')
    dom.window.close()
    const reopened = await prepareCourseCode(out.html)
    ;(await check(reopened.html, 1)).window.close()
    // Nguồn đã lưu trước đây có CSS/init nhưng bị mất loader vẫn được phục hồi khi lưu lại.
    const withoutLoader = source.replace('<script src="https://unpkg.com/aos@2.3.1/dist/aos.js"></script>', '')
    ;(await check((await prepareCourseCode(withoutLoader)).html, 1)).window.close()
    const unknown = await prepareCourseCode('<script src="https://evil.invalid/aos.js"></script><h1>Unknown library</h1>')
    assert.ok(!unknown.html.includes('data-course-library='))
    if (process.env.AOS_SAMPLE_PATH) {
      const raw = fs.readFileSync(process.env.AOS_SAMPLE_PATH, 'utf8')
      const parsed = new JSDOM(raw, { virtualConsole: vc }).window.document
      const actual = await prepareCourseCode(raw)
      const checked = await check(actual.html, parsed.querySelectorAll('[data-aos]').length)
      assert.deepEqual([...checked.window.document.images].map(image => image.getAttribute('src')), [...parsed.images].map(image => image.getAttribute('src')))
      assert.equal(checked.window.document.title, parsed.title)
      checked.window.close()
      console.log('PASS original AOS sample:', parsed.querySelectorAll('[data-aos]').length, 'animated blocks;', Buffer.byteLength(actual.html), 'bytes; image URLs unchanged')
    }
    console.log('PASS AOS: actual bundled runtime/CSS, init and subsequent scripts, save/reopen, old missing loader, exact CDN recognition, licence, sandbox and no external fetch')
  } finally { global.fetch = originalFetch }
}
run().catch(error => { console.error(error); process.exitCode = 1 })
