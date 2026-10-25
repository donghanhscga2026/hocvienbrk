// API + transaction thật với DB giả: không kết nối hoặc ghi dữ liệu production.
const assert = require('node:assert/strict')
const { gzipSync } = require('node:zlib')
const { JSDOM } = require('jsdom')
const load = require('./helpers/load-ts.cjs')
class CrmError extends Error { constructor(message, status = 400) { super(message); this.status = status } }
let actor = { id: 1, role: 'TEACHER' }, denied = false, failSections = false, writes = 0, versionCounter = 0
let page = { id: 'page-1', slug: 'OWN', name: 'Existing name', updatedAt: new Date('2026-10-17T00:00:00Z'), status: 'published', useTemplate: true, seo: { title: 'Existing SEO' }, theme: { primaryColor: '#123456' }, navigation: { ctaText: 'Join' }, checkoutConfig: { bankAccountId: 'keep-bank' } }
let sections = [{ sectionKey: 'old', sectionType: 'hero', content: { title: 'Public original' } }], versions = []
const db = {
  course: { findUnique: async ({ where }) => ({ teacherId: where.id_khoa === 'OWN' ? 1 : 2 }) },
  coursePage: {
    findUnique: async () => page ? { ...page, sections } : null,
    update: async ({ data }) => { writes++; page = { ...page, ...data, updatedAt: new Date(page.updatedAt.getTime() + 1) }; return page },
    create: async ({ data }) => { writes++; page = { id: 'page-new', ...data, updatedAt: new Date() }; return page },
  },
  courseSection: { deleteMany: async () => { sections = [] }, createMany: async ({ data }) => { if (failSections) throw Error('Isolated failure'); sections = data } },
  coursePageVersion: {
    findFirst: async ({ where }) => where.snapshot ? versions.find(v => v.snapshot.kind === 'published') : versions.at(-1),
    create: async ({ data }) => { const row = { id: 'v' + ++versionCounter, ...data }; versions.push(row); return row },
  },
  systemConfig: { findMany: async () => { throw Error('No library queries allowed') }, upsert: async () => { throw Error('No library writes allowed') } },
  $executeRaw: async () => {},
  $transaction: async fn => { const snapshot = structuredClone({ page, sections, versions }); try { return await fn(db) } catch (error) { ({ page, sections, versions } = snapshot); throw error } },
}
const permissions = load('lib/course-page/permissions.ts', { '@/lib/crm/service': { CrmError }, '@/auth': { auth: async () => null }, '@/lib/prisma': { __esModule: true, default: db }, '@/lib/website/domain-context': { domainContext: async () => null } })
const auth = { courseEditorActor: async () => { if (denied) throw new CrmError('Denied', 401); return actor }, assertCourseEditor: permissions.assertCourseEditor }
const stage = load('lib/course-page/stage-template.ts', { '@/lib/course-page/permissions': auth, '@/lib/crm/service': { CrmError } }).stageTemplate
const api = load('app/api/course-templates/route.ts', {
  '@/lib/prisma': { __esModule: true, default: db }, '@/lib/course-page/permissions': auth,
  '@/lib/course-page/stage-template': { stageTemplate: stage }, '@/lib/crm/service': { CrmError },
  '@/lib/rate-limit': { checkRateLimit: async () => ({ allowed: true }) }, 'next/cache': { revalidatePath() {} },
})
const codeLib = load('lib/course-page/course-code.ts')
const html = '<!doctype html><html><head><style>h1{color:red}</style></head><body><section id="hero"><h1>Draft title</h1><a href="#dang-ky">Register</a></section><script>window.codeRan=true</script></body></html>'
const revision = () => ({ id: page?.id ?? null, updatedAt: page?.updatedAt.toISOString() ?? null })
const input = () => ({ action: 'save-course-code', slug: 'OWN', name: 'Course name', html, revision: revision() })
const request = (body = input(), origin = 'https://test.invalid') => new Request('https://test.invalid/api/course-templates', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/gzip' }, body: gzipSync(JSON.stringify(body)) })
async function run() {
  const originalFetch = global.fetch
  global.fetch = async () => { throw Error('New code must not fetch Storage') }
  try {
    const listed = await (await api.GET(new Request('https://test.invalid/api/course-templates'))).json()
    assert.deepEqual(listed.templates, [], 'No private template metadata transferred')
    assert.deepEqual((await (await api.GET(new Request('https://test.invalid/api/course-templates?course=OWN'))).json()).revision, revision())
    const before = writes
    const previewResponse = await api.POST(request({ action: 'preview-course-code', slug: 'OWN', html: '<script src="https://cdn.tailwindcss.com"></script><h1 class="text-3xl">Preview only</h1>' }))
    assert.equal(previewResponse.status, 200)
    assert.match((await previewResponse.json()).html, /data-course-tailwind-css/)
    assert.equal(writes, before, 'Preparing a Canvas preview must never create or update a draft')
    assert.equal((await api.POST(request({ action: 'preview-course-code', slug: 'OTHER', html }))).status, 403)
    assert.equal((await api.POST(request(input(), 'https://evil.invalid'))).status, 403)
    denied = true; assert.equal((await api.POST(request())).status, 401); denied = false
    actor = { id: 2, role: 'TEACHER' }; assert.equal((await api.POST(request())).status, 403)
    actor = { id: 1, role: 'TEACHER' }
    for (const action of ['save', 'import-url', 'prepare-html', 'policy']) {
      const bodies = { save: { action, name: 'Private', source: { entryPath: 'index.html', files: [{ path: 'index.html', kind: 'html', content: html }] } }, 'import-url': { action, url: 'https://example.com' }, 'prepare-html': { action, html }, policy: { action, policy: {} } }
      assert.equal((await api.POST(request(bodies[action]))).status, 410)
    }
    assert.equal((await api.POST(request({ ...input(), html: '<img src="data:image/png;base64,aGVsbG8=">' }))).status, 400)
    assert.equal((await api.POST(request({ ...input(), html: '<p>' + 'ắ'.repeat(400000) + '</p>' }))).status, 413, 'Limit is UTF-8 bytes, not characters')
    assert.equal(writes, before)
    const oldRevision = revision()
    const response = await api.POST(request()); assert.equal(response.status, 200)
    assert.deepEqual((await response.json()).revision, revision())
    assert.equal(versions.length, 1, 'Only preserve original public snapshot, no duplicate manual HTML snapshot')
    assert.equal(versions[0].snapshot.sections[0].content.title, 'Public original')
    assert.equal(page.status, 'published'); assert.equal(page.name, 'Existing name')
    assert.deepEqual(page.checkoutConfig, { bankAccountId: 'keep-bank' }); assert.equal(page.seo.title, 'Existing SEO')
    assert.equal(sections.length, 1); assert.match(sections[0].content.exactSource.html, /Draft title/)
    const read = await (await api.GET(new Request('https://test.invalid/api/course-templates?page=page-1'))).json()
    assert.deepEqual(read.revision, revision()); assert.match(read.source.files[0].content, /Draft title/)
    assert.equal((await api.POST(request({ ...input(), revision: oldRevision }))).status, 409, 'Stale tabs cannot overwrite a newer draft')
    assert.equal((await api.POST(request({ ...input(), html: html.replace('Draft title', 'Second draft') }))).status, 200)
    assert.equal(versions.length, 1, 'Repeated saves do not accumulate HTML copies')
    const beforeFailure = structuredClone({ page, sections, versions })
    failSections = true; assert.equal((await api.POST(request())).status, 400); failSections = false
    assert.deepEqual({ page, sections, versions }, beforeFailure, 'Metadata and source roll back atomically')
    const compiled = codeLib.compileCourseCode(html)
    const dom = new JSDOM(compiled.html, { runScripts: 'dangerously', url: 'https://test.invalid' })
    assert.equal(dom.window.codeRan, true)
    assert.match(dom.window.document.querySelector('meta[http-equiv]').content, /connect-src 'none'/)
    const events = []; dom.window.parent.postMessage = payload => events.push(payload)
    dom.window.document.querySelector('a').click()
    assert.ok(events.some(e => e.type === 'action' && e.actionType === 'open_registration'), '#dang-ky retains checkout bridge')
    dom.window.close()
    const { COURSE_TEMPLATE_LIBRARY } = load('lib/course-page/templates/index.ts')
    assert.equal(COURSE_TEMPLATE_LIBRARY.length, 2)
    actor = { id: 26, role: 'ADMIN' }
    assert.equal((await api.POST(request())).status, 200, 'Admin can edit code too')
    page = null; sections = []; versions = []
    actor = { id: 1, role: 'TEACHER' }
    assert.equal((await api.POST(request())).status, 200)
    assert.equal(page.status, 'draft'); assert.equal(versions.length, 0, 'New course code is a draft without a library or duplicate snapshot')
    console.log('PASS course code: direct DB drafts, fresh ownership, admin 26, CSRF, UTF-8 limit, Base64 rejection, legacy write shutdown, atomic rollback, conflict detection, public snapshot isolation, no repeated HTML history, code execution and checkout bridge')
  } finally { global.fetch = originalFetch }
}
run().catch(error => { console.error(error); process.exitCode = 1 })
