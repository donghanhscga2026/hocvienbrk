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
    name === '@/lib/course-page/importer/source-url' ? load('lib/course-page/importer/source-url.ts') : require(name),
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
    const preview = new JSDOM(prepared.html, { runScripts: 'outside-only' })
    preview.window.eval(preview.window.document.querySelector('[data-mfc-zip-bridge]').textContent)
    const configure = keys => preview.window.dispatchEvent(new preview.window.MessageEvent('message', {
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
    preview.window.close()
    global.fetch = async () => new Response(prepared.html, { headers: { 'Content-Type': 'text/plain' } })
    assert.equal(await (await GET(request(source))).text(), prepared.html, 'Actual ZIP HTML and assets survive serving unchanged')
    console.log(`Actual ZIP: ${prepared.entryPath}, ${prepared.fileCount} files, ${prepared.inlinedAssetCount} embedded assets passed.`)
    dom.window.close()
  }
  console.log('ZIP source: URL boundaries, legacy sources, HTML response, sandbox, errors and size limits passed.')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
