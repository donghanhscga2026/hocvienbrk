// Transaction giả: kiểm chứng đổi mẫu, snapshot công khai và rollback, không dùng DB thật.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), ts = require('typescript')
const repo = path.resolve(__dirname, '..'), cache = new Map()
let denied = null, failVersion = false, transactions = 0
let page = { id: 'page-1', slug: 'GIFT', name: 'Mẫu cũ', status: 'published', useTemplate: true }
let sections = [], versions = [{ id: 'old-version', coursePageId: 'page-1', versionNumber: 1, snapshot: { kind: 'published', name: 'Mẫu cũ', sections: [] } }]
const db = {
  coursePage: {
    findUnique: async () => ({ ...page, sections }),
    update: async ({ data }) => (page = { ...page, ...data }),
    create: async ({ data }) => (page = { id: 'page-1', ...data }),
  },
  courseSection: { deleteMany: async () => { sections = [] }, createMany: async ({ data }) => { sections = data } },
  coursePageVersion: {
    findFirst: async () => versions.at(-1),
    create: async ({ data }) => { if (failVersion) throw new Error('Snapshot failed'); const version = { id: 'version-' + data.versionNumber, ...data }; versions.push(version); return version },
  },
  $transaction: async fn => { transactions++; const before = structuredClone({ page, sections, versions }); try { return await fn(db) } catch (error) { ({ page, sections, versions } = before); throw error } },
}
function load(file) {
  if (cache.has(file)) return cache.get(file)
  const mod = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(path.join(repo, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
  new Function('require', 'module', 'exports', code)(name => {
    if (name === '@/lib/prisma') return { __esModule: true, default: db }
    if (name === '@/lib/course-page/permissions') return { coursePageActionAccess: async () => denied, courseEditorActor: async () => ({ id: 0, role: 'ADMIN' }), assertCourseEditor: async () => {} }
    if (name === '@/lib/api-auth') return { requireAdminAction: async () => denied }
    if (name === 'next/cache') return { revalidatePath() {} }
    if (!name.startsWith('@/') && !name.startsWith('.')) return require(name)
    const base = name.startsWith('@/') ? name.slice(2) : path.posix.join(path.posix.dirname(file), name)
    return load(fs.existsSync(path.join(repo, base + '.ts')) ? base + '.ts' : base + '/index.ts')
  }, mod, mod.exports)
  cache.set(file, mod.exports); return mod.exports
}
async function run() {
  const actions = load('app/actions/course-page-actions.ts')
  denied = { success: false, error: 'Admin required' }
  assert.equal((await actions.applyCoursePageTemplate('GIFT', 'Khóa của tôi', 'wi300-gift')).success, false); assert.equal(transactions, 0)
  denied = null
  assert.equal((await actions.applyCoursePageTemplate('GIFT', 'Khóa của tôi', 'wi300-gift')).success, true)
  const published = await actions.getPublishedCoursePageBySlug('GIFT')
  assert.equal(published.name, 'Khóa của tôi'); assert.equal(published.seo.templateKey, 'wi300-gift')
  assert.equal(published.sections[0].content.title, 'Khóa của tôi')
  assert.equal(published.sections[0].variant, 'wi300-gift'); assert.equal(versions.length, 2)
  // Chỉnh bản nháp không thay snapshot đang công khai.
  sections[0].content = { ...sections[0].content, title: 'Chưa xuất bản' }
  assert.equal((await actions.getPublishedCoursePageBySlug('GIFT')).sections[0].content.title, 'Khóa của tôi')
  const before = structuredClone({ page, sections, versions })
  failVersion = true
  const savedError = console.error; console.error = () => {}
  try { assert.equal((await actions.applyCoursePageTemplate('GIFT', 'Không được lưu', 'wi300-gift')).success, false) } finally { console.error = savedError }
  assert.deepEqual({ page, sections, versions }, before, 'Snapshot failure rolls back metadata and sections')
  console.log('PASS template publish: admin guard, named preset, newest public snapshot, isolated draft edits and atomic rollback')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
