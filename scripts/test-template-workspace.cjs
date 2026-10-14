// Real compiler and API with fake storage/database: no live data is written.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), ts = require('typescript'), zlib = require('node:zlib')
const { JSDOM } = require('jsdom'), repo = path.resolve(__dirname, '..')
class CrmError extends Error { constructor(message, status = 400) { super(message); this.status = status } }
function load(file, mocks = {}, cache = new Map()) {
  if (cache.has(file)) return cache.get(file)
  const mod = { exports: {} }, code = ts.transpileModule(fs.readFileSync(path.join(repo, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
  new Function('require', 'module', 'exports', code)(name => name in mocks ? mocks[name] : name === '@/lib/crm/service' ? { CrmError } : name.startsWith('@/') || name.startsWith('./') || name.startsWith('../') ? load(name.startsWith('@/') ? name.slice(2) + '.ts' : path.posix.join(path.posix.dirname(file), name + '.ts'), mocks, cache) : require(name), mod, mod.exports)
  cache.set(file, mod.exports); return mod.exports
}
async function run() {
  const sourceLib = load('lib/course-page/template-source.ts')
  const source = { entryPath: 'site/index.html', files: [
    { path: 'site/index.html', kind: 'html', content: '<html><head><link rel="stylesheet" href="css/main.css"><script defer src="js/main.js"></script></head><body><section id="hero"><h1>Original</h1><img src="img/a.png"></section><section id="more">More</section><iframe src="https://evil.invalid"></iframe><form action="https://evil.invalid"><input></form></body></html>' },
    { path: 'site/css/main.css', kind: 'css', content: '@import "extra.css"; h1{color:red;background:url(../img/a.png)}' },
    { path: 'site/css/extra.css', kind: 'css', content: 'body{margin:0}' },
    { path: 'site/js/main.js', kind: 'js', content: 'window.authorRan=true; document.querySelector("h1").textContent="Changed";' },
    { path: 'site/img/a.png', kind: 'asset', content: 'data:image/png;base64,aGVsbG8=' },
  ] }
  const compiled = sourceLib.compileTemplateSource(source)
  assert.match(compiled.html, /color:red/); assert.match(compiled.html, /body\{margin:0\}/); assert.match(compiled.html, /data:image\/png;base64,aGVsbG8=/)
  const dom = new JSDOM(compiled.html, { runScripts: 'dangerously', url: 'https://test.invalid' })
  assert.equal(dom.window.authorRan, true); assert.equal(dom.window.document.querySelector('h1').textContent, 'Changed')
  assert.equal(dom.window.document.querySelector('iframe'), null); assert.equal(dom.window.document.querySelector('form').hasAttribute('action'), false)
  assert.match(dom.window.document.querySelector('meta[http-equiv]').content, /connect-src 'none'/)
  assert.deepEqual([...dom.window.document.querySelectorAll('[data-mfc-block]')].map(node => node.dataset.mfcBlock), ['hero', 'more'])
  dom.window.close()
  const restored = sourceLib.sourceFromHtml(compiled.html, ['hero'])
  assert.ok(restored.files.some(file => file.path === 'site/css/main.css')); assert.ok(restored.files.some(file => file.kind === 'js'))
  assert.ok(!restored.files[0].content.includes('id="more"'), 'Legacy block selection survives edit')
  assert.throws(() => sourceLib.compileTemplateSource({ ...source, files: source.files.filter(file => file.kind !== 'asset') }), /Thiếu file/)
  assert.throws(() => sourceLib.compileTemplateSource({ ...source, files: [...source.files, source.files[0]] }), /trùng/)
  assert.throws(() => sourceLib.compileTemplateSource({ ...source, files: [{ path: '../index.html', kind: 'html', content: '' }] }))
  const cycle = structuredClone(source); cycle.files.find(file => file.path.endsWith('extra.css')).content = '@import "main.css";'
  assert.throws(() => sourceLib.compileTemplateSource(cycle), /vòng lặp/)
  const external = sourceLib.compileTemplateSource(sourceLib.sourceFromHtml('<section>Content</section><script src="https://cdn.invalid/main.js"></script>'))
  assert.ok(external.warnings.length); assert.ok(!external.html.includes('https://cdn.invalid/main.js'))
  let session = { user: { id: '0' } }, role = 'ADMIN', domain = null, uploads = [], saved = null, conflict = false
  const now = new Date('2026-10-14T00:00:00Z'), records = new Map()
  const db = { user: { findUnique: async () => ({ role }) }, coursePageTemplate: {
    findMany: async () => [...records.values()], findUnique: async ({ where }) => records.get(where.id) || null,
    create: async ({ data }) => { saved = { ...data, id: 'new-template', updatedAt: now }; records.set(saved.id, saved); return saved },
    updateMany: async ({ data }) => { if (conflict) return { count: 0 }; saved = { ...records.get('new-template'), ...data, updatedAt: now }; records.set(saved.id, saved); return { count: 1 } },
    findUniqueOrThrow: async ({ where }) => records.get(where.id),
  }, $transaction: async fn => fn(db) }
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co'
  const storage = { upload: async (name, bytes, options) => { assert.equal(options.upsert, false); uploads.push({ name, text: bytes.toString() }); return { error: null } }, getPublicUrl: name => ({ data: { publicUrl: 'https://project.supabase.co/storage/v1/object/public/uploads/' + name } }) }
  const mocks = { './service': { CrmError }, '@/auth': { auth: async () => session }, '@/lib/prisma': { __esModule: true, default: db }, '@/lib/supabase': { supabase: { storage: { from: () => storage } } }, '@/lib/website/domain-context': { domainContext: async () => domain }, '@/lib/api-auth': { requireAdminAction: async () => null }, 'next/cache': { revalidatePath: () => {} }, '@/lib/course-page/importer/image-mirror': { mirrorAnalysisImages: async value => value }, '@/lib/course-page/importer/fetch-html': { fetchRemoteHtml: async () => { throw new Error('not called') } } }
  const api = load('app/api/admin/course-page-templates/workspace/route.ts', mocks)
  const input = { action: 'save', name: 'Editable', sourceType: 'zip', source }
  const request = (body = input, origin = 'https://test.invalid', gzip = false) => new Request('https://test.invalid/api/admin/course-page-templates/workspace', { method: 'POST', headers: { origin, 'content-type': gzip ? 'application/gzip' : 'application/json' }, body: gzip ? zlib.gzipSync(JSON.stringify(body)) : JSON.stringify(body) })
  assert.equal((await api.POST(request(input, 'https://other.invalid'))).status, 403); assert.equal(uploads.length, 0)
  role = 'TEACHER'; assert.equal((await api.POST(request())).status, 403); role = 'ADMIN'
  session = null; assert.equal((await api.POST(request())).status, 401); session = { user: { id: '0' } }
  domain = {}; assert.equal((await api.POST(request())).status, 403); domain = null
  assert.equal((await api.POST(request(input, undefined, true))).status, 200)
  assert.equal(uploads.length, 2); assert.match(saved.analysis.editorSourceUrl, /\.json$/); assert.equal(saved.snapshot.sections[0].variant, 'zip-source-v1')
  assert.match(uploads.find(file => file.name.endsWith('.json')).text, /site\/js\/main.js/)
  assert.equal((await api.POST(request({ ...input, id: saved.id }))).status, 409)
  const priorUploadCount = uploads.length
  assert.equal((await api.POST(request({ ...input, id: saved.id, expectedUpdatedAt: '2026-10-13T00:00:00.000Z' }))).status, 409)
  assert.equal(uploads.length, priorUploadCount, 'Stale revision fails before upload')
  conflict = true; assert.equal((await api.POST(request({ ...input, id: saved.id, expectedUpdatedAt: now.toISOString() }))).status, 409); conflict = false
  const originalFetch = global.fetch
  try {
    global.fetch = async url => { const name = new URL(url).pathname.split('/').at(-1); return new Response(uploads.find(file => file.name.endsWith(name)).text) }
    const opened = await (await api.GET(new Request('https://test.invalid/api/admin/course-page-templates/workspace?id=new-template'))).json()
    assert.deepEqual(opened.source, source, 'Raw file tree round trips unchanged')
    records.set('bad', { ...saved, analysis: { editorSourceUrl: 'https://evil.invalid/source.json' } })
    assert.equal((await api.GET(new Request('https://test.invalid/api/admin/course-page-templates/workspace?id=bad'))).status, 400)
  } finally { global.fetch = originalFetch }
  const badGzip = new Request('https://test.invalid/api/admin/course-page-templates/workspace', { method: 'POST', headers: { origin: 'https://test.invalid', 'content-type': 'application/gzip' }, body: 'broken' })
  assert.equal((await api.POST(badGzip)).status, 400)
  console.log('PASS template workspace: HTML/CSS/JS execution, asset packaging, block preservation, malformed sources, fresh roles, origin/domain guards, immutable storage, raw source round trip and optimistic updates')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
