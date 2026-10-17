// DB giả cách ly: kiểm tra quyền, bảo mật mã nguồn, hạn mức và chọn mẫu vào nháp.
const assert = require('node:assert/strict')
const load = require('./helpers/load-ts.cjs')
process.env.WI300_APPEARANCE_SECRET = 'isolated-library-tests-not-a-real-secret'
class CrmError extends Error { constructor(message, status = 400) { super(message); this.status = status } }
const lib = load('lib/course-page/template-library.ts', { '@/lib/crm/service': { CrmError } })
const records = new Map()
let queue = Promise.resolve()
function matches(key, where) {
  if (where.OR) return where.OR.some(item => matches(key, item))
  if (typeof where.key === 'string') return where.key === key
  const rule = where.key || {}
  return (!rule.startsWith || key.startsWith(rule.startsWith)) && (!rule.endsWith || key.endsWith(rule.endsWith)) && (!rule.in || rule.in.includes(key))
}
const db = { systemConfig: {
  findUnique: async ({ where }) => records.get(where.key) || null,
  findMany: async ({ where }) => [...records.values()].filter(row => matches(row.key, where)),
  upsert: async ({ where, create, update }) => { const row = { ...(records.get(where.key) || create), ...update }; records.set(where.key, structuredClone(row)); return row },
  deleteMany: async ({ where }) => { for (const key of records.keys()) if (matches(key, where)) records.delete(key) },
}, $executeRaw: async () => {}, $transaction: callback => { const next = queue.then(async () => { const snapshot = structuredClone(records); try { return await callback(db) } catch (e) { records.clear(); for (const [key, row] of snapshot) records.set(key, row); throw e } }); queue = next.catch(() => {}); return next } }
const admin = { id: 0, role: 'ADMIN' }, alice = { id: 1, role: 'TEACHER' }, bob = { id: 2, role: 'TEACHER' }
const source = { entryPath: 'index.html', files: [{ path: 'index.html', kind: 'html', content: '<section><h1>Private original</h1><a data-mfc-register href="#dang-ky">Đăng ký khóa học</a></section>' }] }
const input = { name: 'Private name', description: '', scope: 'private', published: false, sourceType: 'html', source }
async function run() {
  const privateTemplate = await lib.saveLibraryTemplate(db, alice, input)
  assert.equal((await lib.listLibrary(db, alice)).length, 1)
  assert.equal((await lib.listLibrary(db, bob)).length, 0)
  for (const actor of [bob, admin]) await assert.rejects(() => lib.readLibraryTemplate(db, actor, privateTemplate.id), /Không tìm thấy/)
  assert.equal(JSON.stringify([...records.values()]).includes('Private original'), false, 'Private source encrypted at rest')
  assert.equal(JSON.stringify([...records.values()]).includes('Private name'), false, 'Private title encrypted too')
  assert.equal((await lib.readLibraryTemplate(db, alice, privateTemplate.id)).source.files[0].content, source.files[0].content)
  await assert.rejects(() => lib.saveLibraryTemplate(db, alice, input), /hạn mức/)
  await assert.rejects(() => lib.saveLibraryTemplate(db, bob, { ...input, scope: 'shared', published: true }), /Chỉ admin/)
  await assert.rejects(() => lib.writeLibraryPolicy(db, alice, { maxPrivateTemplates: 3, maxTemplateMB: 2, maxPrivateMB: 4 }), /Chỉ admin/)
  await lib.writeLibraryPolicy(db, admin, { maxPrivateTemplates: 3, maxTemplateMB: 1, maxPrivateMB: 1 })
  const first = await lib.saveLibraryTemplate(db, bob, { ...input, source: { ...source, files: [{ ...source.files[0], content: '<section>' + 'x'.repeat(650000) + '</section>' }] } })
  await assert.rejects(() => lib.saveLibraryTemplate(db, bob, { ...input, source: { ...source, files: [{ ...source.files[0], content: '<section>' + 'y'.repeat(650000) + '</section>' }] } }), /hạn mức/)
  await lib.deleteLibraryTemplate(db, bob, first.id)
  for (const html of ['<section onclick="alert(1)">Bad</section>', '<section><script data-mfc-zip-bridge>alert(1)</script></section>', '<form><input></form>', '<section><a href="javascript:alert(1)">Bad</a></section>']) await assert.rejects(() => lib.saveLibraryTemplate(db, bob, { ...input, source: { ...source, files: [{ ...source.files[0], content: html }] } }), /không được/)
  const shared = await lib.saveLibraryTemplate(db, admin, { ...input, scope: 'shared', name: 'Admin draft' })
  assert.equal((await lib.listLibrary(db, alice)).some(item => item.id === shared.id), false)
  await assert.rejects(() => lib.readLibraryTemplate(db, alice, shared.id), /Không tìm thấy/)
  const published = await lib.saveLibraryTemplate(db, admin, { ...input, scope: 'shared', id: shared.id, expectedUpdatedAt: shared.updatedAt, published: true })
  assert.ok((await lib.listLibrary(db, alice)).some(item => item.id === published.id))
  await lib.readLibraryTemplate(db, alice, published.id)
  await assert.rejects(() => lib.readLibraryTemplate(db, alice, published.id, true), /Không tìm thấy/)
  await assert.rejects(() => lib.saveLibraryTemplate(db, admin, { ...input, scope: 'shared', id: shared.id, expectedUpdatedAt: '2000-01-01T00:00:00.000Z' }), /thay đổi/)
  const row = records.get('course-template-library:v1:' + privateTemplate.id + ':source')
  assert.throws(() => lib.openLibrary(row.value, 'different-source-context'), undefined, 'Ciphertext cannot be copied to another context')

  let session = { user: { id: '1', role: 'ADMIN' } }, role = 'TEACHER'
  const authDB = { user: { findUnique: async () => ({ role }) }, course: { findUnique: async ({ where }) => where.id_khoa === 'OWN' ? { teacherId: 1 } : { teacherId: 2 } }, coursePage: { findUnique: async ({ where }) => ({ slug: where.id === 'own' ? 'OWN' : 'OTHER' }) } }
  const permissions = load('lib/course-page/permissions.ts', { '@/auth': { auth: async () => session }, '@/lib/prisma': { __esModule: true, default: authDB }, '@/lib/website/domain-context': { domainContext: async () => null }, '@/lib/crm/service': { CrmError } })
  assert.equal((await permissions.courseEditorActor()).role, 'TEACHER', 'Role comes from DB, not session')
  assert.equal(await permissions.coursePageActionAccess({ pageId: 'own' }), null)
  assert.equal((await permissions.coursePageActionAccess({ pageId: 'other' })).success, false)
  role = 'STUDENT'; await assert.rejects(() => permissions.courseEditorActor(), /quyền/)
  session = null; await assert.rejects(() => permissions.courseEditorActor(), /đăng nhập/)

  let page = { id: 'old', slug: 'OWN', name: 'Live old', status: 'published', useTemplate: true, sections: [{ sectionKey: 'live', sectionType: 'hero', content: { title: 'Live unchanged' } }] }, sections = page.sections, versions = []
  const stageDB = { ...db, course: authDB.course, coursePage: { findUnique: async () => ({ ...page, sections }), update: async ({ data }) => (page = { ...page, ...data }) }, courseSection: { deleteMany: async () => { sections = [] }, createMany: async ({ data }) => { sections = data } }, coursePageVersion: { findFirst: async ({ where }) => where.snapshot ? versions.find(v => v.snapshot.kind === 'published') : versions.at(-1), create: async ({ data }) => { versions.push(data); return data } } }
  stageDB.$transaction = callback => callback(stageDB)
  const stage = load('lib/course-page/stage-template.ts', { '@/lib/course-page/permissions': permissions }).stageTemplate
  await stage(stageDB, alice, 'OWN', 'New draft', { seo: {}, theme: {}, sections: [{ sectionKey: 'new', type: 'rich_content', content: { title: 'Draft only' } }] }, 'expert-course')
  assert.equal(page.status, 'published', 'Existing live page stays enabled')
  assert.equal(versions.find(v => v.snapshot.kind === 'published').snapshot.sections[0].content.title, 'Live unchanged')
  assert.equal(sections[0].content.title, 'Draft only')
  assert.equal(versions.at(-1).snapshot.kind, 'manual', 'Selection does not create a new published snapshot')
  // API thật: chống CSRF, không lộ mã riêng và không bỏ qua quyền khi áp dụng.
  let requestActor = alice
  const api = load('app/api/course-templates/route.ts', {
    '@/lib/prisma': { __esModule: true, default: stageDB },
    '@/lib/course-page/permissions': { courseEditorActor: async () => requestActor, assertCourseEditor: permissions.assertCourseEditor },
    '@/lib/course-page/template-library': lib,
    '@/lib/course-page/stage-template': { stageTemplate: stage },
    '@/lib/crm/service': { CrmError },
    '@/lib/rate-limit': { checkRateLimit: async () => ({ allowed: true }) },
    'next/cache': { revalidatePath() {} },
  })
  const request = (body, origin = 'https://test.invalid') => new Request('https://test.invalid/api/course-templates', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  assert.equal((await api.POST(request({ action: 'delete', id: privateTemplate.id }, 'https://evil.invalid'))).status, 403)
  requestActor = bob
  assert.equal((await api.GET(new Request('https://test.invalid/api/course-templates?id=' + encodeURIComponent(privateTemplate.id)))).status, 404)
  assert.equal((await api.POST(request({ action: 'apply', id: 'expert-course', system: true, slug: 'OWN', name: 'Unauthorized' }))).status, 403)
  assert.equal((await api.POST(request({ action: 'save', ...input, scope: 'shared' }))).status, 410)
  requestActor = alice
  const ownResponse = await api.GET(new Request('https://test.invalid/api/course-templates?id=' + encodeURIComponent(privateTemplate.id)))
  assert.equal(ownResponse.status, 200); assert.match(ownResponse.headers.get('cache-control'), /no-store/)
  await lib.writeLibraryPolicy(db, admin, { maxPrivateTemplates: 1, maxTemplateMB: 1, maxPrivateMB: 2 })
  const race = await Promise.allSettled([lib.saveLibraryTemplate(db, bob, input), lib.saveLibraryTemplate(db, bob, input)])
  assert.equal(race.filter(result => result.status === 'fulfilled').length, 1, 'Concurrent saves cannot exceed count quota')
  const preset = load('lib/course-page/templates/expert-course.ts').createExpertCoursePage('OWN')
  assert.ok(preset.sections.find(section => section.sectionKey === 'phan-hoi').enabled === false)
  assert.ok(preset.sections.length >= 10)
  console.log('PASS template library: private ownership/encryption, shared publish/edit rights, quota/count/bytes, unsafe user HTML, stale revisions, fresh actor, course ownership and isolated draft staging.')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
