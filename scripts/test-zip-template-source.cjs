const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const ts = require('typescript')
const root = path.resolve(__dirname, '..')
function load(file) {
  const module = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  new Function('require', 'exports', 'module', code)(name =>
    name.startsWith('@/lib/course-page/importer/') ? load(name.replace('@/', '') + '.ts') : require(name),
  module.exports, module)
  return module.exports
}
async function run() {
  const { resolveZipStorageSource, zipFrameSource, zipSelectedBlockKeys } = load('lib/course-page/importer/source-url.ts')
  const { analyzeWebsiteHtml } = load('lib/course-page/importer/html-analyzer.ts')
  const fixture = analyzeWebsiteHtml({ sourceType: 'zip', html: '<header data-mfc-block="hero"><h1>Hero</h1></header><section data-mfc-block="details"><h2>Details</h2></section><footer data-mfc-block="footer">Footer</footer>' })
  assert.deepEqual(fixture.sections.map(section => section.id), ['hero', 'details', 'footer'])
  assert.equal(zipSelectedBlockKeys(['imported-1']), null, 'Legacy full-page selections remain visible')
  assert.deepEqual(zipSelectedBlockKeys([]), [], 'An explicitly empty selection stays empty')
  const { JSDOM: NavigationDOM } = require('jsdom')
  const { BRIDGE, upgradeZipBridge: upgradeBridge } = load('lib/course-page/importer/zip-browser.ts')
  const { zipCourseLinks: courseLinks } = load('lib/course-page/importer/source-url.ts')
  const navigation = new NavigationDOM('<a data-course="2" href="#dang-ky">Option 1</a><a data-course="21" href="#dang-ky">Option 2</a><a href="#details">Details</a><section id="details"></section>' + BRIDGE, { runScripts: 'outside-only', url: 'https://app.invalid/api/course-template-source' })
  navigation.window.eval(navigation.window.document.querySelector('[data-mfc-zip-bridge]').textContent)
  const navigationMessages = []
  navigation.window.postMessage = msg => navigationMessages.push(msg)
  const navigationPath = '/khoa-hoc/BAN_DO_TAI_CHINH'
  navigation.window.dispatchEvent(new navigation.window.MessageEvent('message', { source: navigation.window, data: { source: 'mfc-zip-parent', type: 'configure', pageUrl: 'https://app.invalid' + navigationPath, courseLinks: courseLinks(navigationPath) } }))
  const navigationAnchors = [...navigation.window.document.querySelectorAll('a')]
  assert.deepEqual(navigationAnchors.map(el => el.href), ['https://app.invalid/khoa-hoc/KICH_HOAT_DONG_TIEN', 'https://app.invalid' + navigationPath + '#dang-ky', 'https://app.invalid' + navigationPath + '#details'])
  navigationAnchors.forEach(el => el.click())
  assert.ok(navigationMessages.some(msg => msg.actionType === 'course_link'))
  assert.ok(navigationMessages.some(msg => msg.actionType === 'open_registration' && msg.anchor === 'dang-ky'))
  assert.ok(navigationMessages.some(msg => msg.type === 'scroll' && msg.anchor === 'details'))
  assert.ok(upgradeBridge('<script data-mfc-zip-bridge>old</script>').includes('configureLinks'))
  assert.deepEqual(courseLinks('/khoa-hoc/OTHER'), {}, 'Course-specific mapping never changes another course')
  navigation.window.dispatchEvent(new navigation.window.MessageEvent('message', { source: navigation.window, data: { source: 'mfc-zip-parent', type: 'configure', pageUrl: 'https://app.invalid/khoa-hoc/KICH_HOAT_DONG_TIEN', courseLinks: courseLinks('/khoa-hoc/KICH_HOAT_DONG_TIEN') } }))
  assert.equal(navigationAnchors[0].href, 'https://app.invalid/khoa-hoc/KICH_HOAT_DONG_TIEN#dang-ky')
  assert.equal(navigationAnchors[1].href, 'https://app.invalid/khoa-hoc/BAN_DO_TAI_CHINH', 'The shared template routes the 21-day option back to its correct course')
  navigation.window.close()
  const { GET } = load('app/api/course-template-source/route.ts')
  const { NextRequest } = require('next/server')
  const storage = 'https://project.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_URL = storage
  const source = storage + '/storage/v1/object/public/uploads/course-template-sources/example-123.html'
  assert.equal(resolveZipStorageSource(source, storage).href, source)
  assert.equal(zipFrameSource(source, storage), '/api/course-template-source?source=' + encodeURIComponent(source))
  assert.equal(zipFrameSource('/course-template-sources/legacy/index.html', storage), '/course-template-sources/legacy/index.html')
  for (const bad of [
    'https://attacker.invalid/a.html', source.replace('project.', 'other.'),
    source.replace('/course-template-sources/', '/other/'), source + '?download=1',
    source + '#hash', source.replace('example-123.html', '../secret.html'),
    source.replace('example-123.html', '%2e%2e%2fsecret.html'),
    source.replace('https://', 'https://user:password@'), 'http://127.0.0.1/a.html',
  ]) assert.equal(resolveZipStorageSource(bad, storage), null, bad)

  const request = value => new NextRequest('https://app.invalid/api/course-template-source?source=' + encodeURIComponent(value))
  let calls = 0
  let body = '<!doctype html><html><body><h1>Bản Đồ Tài Chính</h1><script>/* bridge */</script></body></html>'
  global.fetch = async (url, options) => {
    calls++
    assert.equal(url.href, source)
    assert.equal(options.redirect, 'error')
    assert.equal(options.credentials, 'omit')
    return new Response(body, { headers: { 'Content-Type': 'text/plain', 'Content-Security-Policy': "default-src 'none'", 'Set-Cookie': 'unsafe=1' } })
  }
  assert.equal((await GET(request('http://127.0.0.1/a.html'))).status, 400)
  assert.equal(calls, 0, 'Invalid origins never reach fetch')
  const result = await GET(request(source))
  assert.equal(result.status, 200)
  assert.equal(await result.text(), body)
  assert.equal(result.headers.get('content-type'), 'text/html; charset=utf-8')
  const csp = result.headers.get('content-security-policy')
  assert.ok(csp.includes('sandbox allow-scripts'))
  assert.ok(!csp.includes('allow-same-origin'))
  assert.ok(csp.includes("connect-src 'none'") && csp.includes("form-action 'none'"))
  assert.equal(result.headers.get('set-cookie'), null)

  global.fetch = async () => new Response('missing', { status: 404 })
  assert.equal((await GET(request(source))).status, 404)
  global.fetch = async () => { throw new Error('network or redirect failure') }
  assert.equal((await GET(request(source))).status, 502)
  global.fetch = async () => new Response('x', { headers: { 'Content-Length': String(8 * 1024 * 1024 + 1) } })
  assert.equal((await GET(request(source))).status, 413)
  body = 'x'.repeat(8 * 1024 * 1024 + 1)
  global.fetch = async () => new Response(body)
  assert.equal((await GET(request(source))).status, 413, 'Streaming limit works without Content-Length')
  if (process.argv[2]) {
    const { JSDOM } = require('jsdom')
    const dom = new JSDOM('')
    global.DOMParser = dom.window.DOMParser
    const zip = fs.readFileSync(process.argv[2])
    const prepared = await load('lib/course-page/importer/zip-browser.ts').prepareWebsiteZip({
      name: path.basename(process.argv[2]),
      size: zip.byteLength,
      arrayBuffer: async () => zip.buffer.slice(zip.byteOffset, zip.byteOffset + zip.byteLength),
    })
    assert.ok(prepared.html.includes('Bản Đồ Tài Chính'))
    const page = new JSDOM(prepared.html).window.document
    assert.ok([...page.querySelectorAll('img')].some(img => img.src.startsWith('data:')))
    assert.ok(prepared.html.includes('mfc-zip-source'))
    const analysis = analyzeWebsiteHtml({ html: prepared.analysisHtml, sourceType: 'zip' })
    const actualKeys = [...page.querySelectorAll('[data-mfc-block]')].map(el => el.getAttribute('data-mfc-block'))
    assert.ok(analysis.sections.length > 1, 'Actual landing is split into its structural sections')
    assert.deepEqual(analysis.sections.map(section => section.id), actualKeys, 'Analyzer IDs match rendered ZIP blocks')
    const preview = new JSDOM(prepared.html, { runScripts: 'outside-only', url: 'https://app.invalid/api/course-template-source' })
    preview.window.eval(preview.window.document.querySelector('[data-mfc-zip-bridge]').textContent)
    const configure = keys => preview.window.dispatchEvent(new preview.window.MessageEvent('message', {
      source: preview.window,
      data: { source: 'mfc-zip-parent', type: 'configure', selectedBlockKeys: keys, registrationBlockKeys: [] },
    }))
    configure(['imported-1'])
    assert.ok([...preview.window.document.querySelectorAll('[data-mfc-block]')].every(el => el.hidden), 'Reproduce the previous blank preview')
    configure(zipSelectedBlockKeys(['imported-1']))
    assert.ok([...preview.window.document.querySelectorAll('[data-mfc-block]')].some(el => !el.hidden && el.querySelector('h1')), 'Legacy template keeps its hero visible after configuration')
    configure(analysis.sections.map(section => section.id))
    assert.ok([...preview.window.document.querySelectorAll('[data-mfc-block]')].some(el => !el.hidden && el.querySelector('h1')), 'New import keeps its hero visible after configuration')
    configure([])
    assert.ok([...preview.window.document.querySelectorAll('[data-mfc-block]')].every(el => el.hidden), 'Deselecting every block hides every block')
    const { zipCourseLinks } = load('lib/course-page/importer/source-url.ts')
    const { upgradeZipBridge } = load('lib/course-page/importer/zip-browser.ts')
    const coursePath = '/khoa-hoc/BAN_DO_TAI_CHINH'
    const messages = []
    preview.window.postMessage = payload => messages.push(payload)
    preview.window.dispatchEvent(new preview.window.MessageEvent('message', {
      source: preview.window,
      data: { source: 'mfc-zip-parent', type: 'configure', selectedBlockKeys: null, pageUrl: 'https://app.invalid' + coursePath, courseLinks: zipCourseLinks(coursePath) },
    }))
    const optionOne = preview.window.document.querySelector('a[data-course="2"]')
    const optionTwo = preview.window.document.querySelector('a[data-course="21"]')
    assert.equal(optionOne.href, 'https://app.invalid/khoa-hoc/KICH_HOAT_DONG_TIEN')
    assert.equal(optionTwo.href, 'https://app.invalid' + coursePath + '#dang-ky')
    optionOne.click()
    assert.ok(messages.some(msg => msg.actionType === 'course_link' && msg.target === '/khoa-hoc/KICH_HOAT_DONG_TIEN'))
    messages.length = 0
    optionTwo.click()
    assert.ok(messages.some(msg => msg.actionType === 'open_registration' && msg.anchor === 'dang-ky'))
    assert.ok(!messages.some(msg => msg.actionType === 'external_link'), 'Canonical anchor opens current registration rather than another tab')
    const legacy = prepared.html.replace(/<script data-mfc-zip-bridge>[\s\S]*?<\/script>/, '<script data-mfc-zip-bridge>/* old bridge */</script>')
    assert.ok(upgradeZipBridge(legacy).includes('configureLinks'))
    assert.equal(upgradeZipBridge(upgradeZipBridge(legacy)), upgradeZipBridge(legacy), 'Bridge upgrade is idempotent')
    global.fetch = async () => new Response(legacy)
    assert.equal(await (await GET(request(source))).text(), upgradeZipBridge(legacy), 'Saved sources receive the updated bridge')
    preview.window.close()
    global.fetch = async () => new Response(prepared.html, { headers: { 'Content-Type': 'text/plain' } })
    const served = await (await GET(request(source))).text()
    const withoutBridge = html => html.replace(/<script\b[^>]*data-mfc-zip-bridge[^>]*>[\s\S]*?<\/script>/, '')
    assert.ok(withoutBridge(served) === withoutBridge(prepared.html), 'Actual ZIP content and assets survive the bridge upgrade unchanged')
    console.log(`Actual ZIP: ${prepared.entryPath}, ${prepared.fileCount} files, ${prepared.inlinedAssetCount} embedded assets passed.`)
    dom.window.close()
  }
  console.log('ZIP source: URL boundaries, legacy sources, HTML response, sandbox, errors and size limits passed.')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
