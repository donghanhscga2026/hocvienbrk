const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), ts = require('typescript')
const root = path.resolve(__dirname, '..')
function load(file, overrides = {}) {
  const mod = { exports: {} }, code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
  new Function('require', 'module', 'exports', code)(name => name in overrides ? overrides[name] : require(name), mod, mod.exports)
  return mod.exports
}
class CrmError extends Error { constructor(message, status = 400) { super(message); this.status = status } }
async function run() {
  const visibility = load('lib/wi300/course-visibility.ts'), config = new Map()
  let sharedWrites = 0, snapshots = 0
  const sourceCourses = [{ id: 1, status: true }, { id: 2, status: false }, { id: 3, status: true }, { id: 5, status: false }]
  config.set(visibility.WI300_COURSE_PREFIX + 2, true)
  const db = { course: { findMany: async () => { snapshots++; return sourceCourses }, updateMany: async () => { sharedWrites++ } }, systemConfig: {
    findUnique: async ({ where }) => config.has(where.key) ? { value: config.get(where.key) } : null,
    createMany: async ({ data }) => { for (const row of data) if (!config.has(row.key)) config.set(row.key, row.value) },
    findMany: async ({ where }) => [...config].filter(([key]) => key.startsWith(where.key.startsWith)).map(([key, value]) => ({ key, value })),
    upsert: async ({ where, create, update }) => { config.set(where.key, config.has(where.key) ? update.value : create.value) },
  }, $executeRaw: async () => {}, $transaction: async operation => typeof operation === 'function' ? operation(db) : Promise.all(operation) }
  let initial = await visibility.wi300CoursePreferences(db)
  assert.deepEqual([...initial].sort((a,b) => a[0]-b[0]), [[1,true],[2,true],[3,true],[5,false]], 'Snapshot preserves the existing catalog and explicit WI300 choices')
  sourceCourses[0].status = false; sourceCourses[1].status = true; sourceCourses[3].status = true; sourceCourses.push({ id: 4, status: true })
  initial = await visibility.wi300CoursePreferences(db)
  assert.equal(initial.get(1), true, 'Original-site hide cannot hide WI300')
  assert.equal(initial.get(5), false, 'Original-site show cannot publish a previously unset hidden WI300 course')
  assert.equal(initial.has(4), false, 'New shared courses are not automatically published on WI300')
  assert.equal(snapshots, 1, 'Initialization only copies once')
  await visibility.setWi300CourseVisibility(db, [1, 2], false)
  assert.deepEqual([...await visibility.wi300HiddenCourses(db)].sort((a,b) => a-b), [1, 2, 5]); assert.equal(sharedWrites, 0)
  await visibility.setWi300CourseVisibility(db, [2], true)
  const preferences = await visibility.wi300CoursePreferences(db)
  const scope = { status: true, teacherId: { in: [3] } }
  const catalog = visibility.wi300CourseWhere(scope, preferences)
  assert.deepEqual(catalog.AND[0], { teacherId: { in: [3] } }, 'Teacher/category/site isolation is preserved')
  assert.deepEqual(catalog.AND[1], { id: { in: [2, 3] } }, 'Catalog has no fallback to shared status')
  assert.deepEqual(visibility.wi300CourseWhere(scope, preferences, false, [1]).AND[1], { id: { in: [2, 3, 1] } }, 'Verified enrollment retains access to hidden courses')
  assert.deepEqual(visibility.wi300CourseWhere(scope, preferences, false).AND[1], catalog.AND[1], 'Unenrolled users cannot bypass catalog hiding')
  sourceCourses[0].status = true
  assert.equal((await visibility.wi300CoursePreferences(db)).get(1), false, 'Original-site show cannot show WI300')
  assert.deepEqual(scope, { status: true, teacherId: { in: [3] } }, 'Original site scope is not mutated')
  config.set('wi300:learning-hidden:0:7', true); config.set('wi300:learning-hidden:8:9', true)
  assert.deepEqual([...await visibility.wi300HiddenLearning(db, 0)], [7], 'Personal visibility is per account, including admin zero')
  await assert.rejects(() => visibility.setWi300CourseVisibility(db, [-1], false))

  // Execute actual Server Action bodies from their AST with isolated dependencies.
  // This checks routing/permissions in addition to the storage helper.
  function actions(file, names, bindings) {
    const source = fs.readFileSync(path.join(root, file), 'utf8'), ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
    const selected = ast.statements.filter(node => ts.isFunctionDeclaration(node) && names.includes(node.name?.text)).map(node => node.getFullText(ast)).join('\n')
    const mod = { exports: {} }, code = ts.transpileModule(selected, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
    new Function(...Object.keys(bindings), 'module', 'exports', code)(...Object.values(bindings), mod, mod.exports)
    return mod.exports
  }
  let brand = {}, role = 'ADMIN', session = { user: { id: '0', role: 'ADMIN' } }
  db.user = { findUnique: async () => ({ role }) }
  db.course.findMany = async () => [{ id: 1, status: true }, { id: 2, status: false }, { id: 4, status: true }]
  const admin = actions('app/actions/admin-actions.ts', ['getAdminCoursesAction', 'bulkToggleCourseStatusAction', 'bulkUpdateCoursesOptionsAction'], {
    auth: async () => session, prisma: db, Role: { ADMIN: 'ADMIN', TEACHER: 'TEACHER', INSTRUCTOR: 'INSTRUCTOR' },
    getCurrentDeploymentBrand: async () => brand, setWi300CourseVisibility: visibility.setWi300CourseVisibility, wi300CoursePreferences: visibility.wi300CoursePreferences,
    revalidateTag() {}, resolveCourseCategoryName: async () => 'Category',
  })
  assert.equal((await admin.bulkToggleCourseStatusAction([1], false)).success, true)
  assert.equal(sharedWrites, 0, 'Real WI300 bulk action never writes shared Course.status')
  assert.equal((await admin.bulkUpdateCoursesOptionsAction([2], { status: true })).success, true)
  assert.equal(sharedWrites, 0, 'Bulk options also use separate WI300 configuration')
  let management = await admin.getAdminCoursesAction({ teacherId: 'ALL' })
  assert.equal(management.courses[0].status, false); assert.equal(management.courses[1].status, true)
  assert.equal(management.visibilityScope, 'wi300')
  assert.equal(management.courses[2].status, false, 'Management shows unconfigured new courses as hidden on WI300')
  brand = null; await admin.bulkToggleCourseStatusAction([1], true)
  assert.equal(sharedWrites, 1, 'Original website retains its existing status action')
  management = await admin.getAdminCoursesAction({ teacherId: 'ALL' })
  assert.equal(management.courses[2].status, true, 'Original-site management still reads shared status')
  role = 'STUDENT'; brand = {}; const deniedAction = await admin.bulkToggleCourseStatusAction([1], false)
  assert.equal(deniedAction.success, false, 'Revoked role in DB overrides stale admin session')
  role = 'ADMIN'
  const workflow = load('lib/crm/request-workflow.ts')
  const requestScope = actor => actor.role === 'ADMIN' ? {} : { ownerId: actor.id, OR: [{ course: { teacherId: actor.id } }, { courseId: null }] }
  const partners = load('lib/crm/partners.ts', { './service': { CrmError }, './requests': { requestScope }, './request-workflow': workflow, './partner-details': load('lib/crm/partner-details.ts') })
  const intake = (kind, organization) => [{ action: 'PARTNER_INTAKE', changedBy: 3, changedAt: new Date().toISOString(), partner: { kind, organization, expertise: 'AI', proposal: 'Hợp tác đào tạo', portfolio: '' } }]
  assert.equal(partners.partnerDetails('Đăng ký: Doanh nghiệp\nDoanh nghiệp: Wi.Tech', []).organization, 'Wi.Tech')
  assert.equal(partners.partnerDetails('Đăng ký: Doanh nghiệp\nĐăng ký: Giảng viên', []).kind, 'BUSINESS', 'Legacy classification cannot be overridden by multiline answers')
  assert.equal(partners.partnerDetails('Ambiguous old content', []).kind, 'UNKNOWN')
  assert.equal(partners.partnerDetails('Legacy', intake('BOTH', 'Wi.Tech')).kind, 'BOTH')
  const rows = Array.from({ length: 523 }, (_, i) => ({ id: String(i).padStart(5, '0'), source: workflow.PARTNER_SOURCE, name: 'Partner ' + i, email: 'partner@example.com', phone: '+84912345678', userId: 3, content: 'Raw original', ownerId: i % 2 ? 8 : 0, status: 'NEW', resolution: '', history: [...intake('BUSINESS', 'Wi.Tech'), ...(i === 522 ? [{ action: 'UPDATE', changedBy: 0, changedAt: new Date().toISOString(), outcome: 'ACCEPTED' }] : [])], createdAt: new Date(i * 1000), updatedAt: new Date(i * 1000) }))
  let calls = 0
  db.crmRequest = { findMany: async query => { calls++; assert.equal(query.take, 500); const scope = query.where.AND[0]; let filtered = rows.filter(row => scope.ownerId === undefined || row.ownerId === scope.ownerId); if (query.where.ownerId !== undefined) filtered = filtered.filter(row => row.ownerId === query.where.ownerId); if (query.cursor) filtered = filtered.filter(row => row.id > query.cursor.id); return filtered.slice(0, query.take) } }
  const actor = { id: 0, role: 'ADMIN', name: 'Admin' }, query = partners.partnerQuery.parse({ kind: 'BUSINESS' })
  let result = await partners.readCrmPartners(db, actor, query)
  assert.equal(result.total, 523); assert.equal(result.partners.length, 20); assert.equal(result.stats.accepted, 1); assert.ok(calls > 1, 'Counts span DB batches')
  assert.equal('history' in result.partners[0], false)
  result = await partners.readCrmPartners(db, actor, { ...query, export: 'xlsx', page: 9 })
  assert.equal(result.partners.length, 523, 'Export includes all filtered records, not current page')
  await assert.rejects(() => partners.readCrmPartners(db, { id: 8, role: 'TEACHER', name: 'Teacher' }, query), error => error.status === 403)
  await assert.rejects(() => partners.readCrmPartners(db, { id: 8, role: 'TEACHER', name: 'Teacher' }, { ...query, export: 'xlsx' }), error => error.status === 403)
  result = await partners.readCrmPartners(db, actor, { ...query, outcome: 'ACCEPTED', q: 'wi.tech' })
  assert.equal(result.total, 1); assert.equal(result.partners[0].id, '00522')
  assert.equal(partners.partnerQuery.safeParse({ owner: '0' }).success, true)
  assert.equal(partners.partnerQuery.safeParse({ owner: '-1' }).success, false)

  const xlsx = load('lib/crm/xlsx.ts'), file = xlsx.textWorkbook(['Tên', 'Điện thoại'], [['=HYPERLINK("bad")', '+84901234567'], ['Wi & <Tech>', '00123']])
  assert.equal(file.readUInt32LE(0), 0x04034b50)
  assert.ok(file.includes(Buffer.from('t="inlineStr"'))); assert.ok(!file.includes(Buffer.from('<f>')))
  assert.ok(file.includes(Buffer.from('Wi &amp; &lt;Tech&gt;')))
  const output = process.env.CRM_XLSX_QA_PATH
  if (output) fs.writeFileSync(output, file)
  // Test the real export route: auth first, no identity/hash fields, no-store.
  let denied = false
  const api = load('app/api/crm/partners/route.ts', {
    '@/lib/prisma': { __esModule: true, default: { ...db, user: { findMany: async () => [{ id: 0, name: 'Admin' }, { id: 8, name: 'Teacher' }] } } },
    '@/lib/crm/auth': { getCrmActor: async () => { if (denied) throw new CrmError('Forbidden', 403); return actor } },
    '@/lib/crm/http': { crmFailure: e => new Response('', { status: e.status || 400 }), crmResponse: data => Response.json(data) },
    '@/lib/crm/partners': partners, '@/lib/crm/request-workflow': workflow,
    '@/lib/crm/shared': { REQUEST_STATUSES: { NEW: 'Mới' }, formatCrmDate: date => date.toISOString() }, '@/lib/crm/xlsx': xlsx,
  })
  const response = await api.GET(new Request('https://test.invalid/api/crm/partners?export=xlsx&kind=BUSINESS'))
  assert.equal(response.status, 200); assert.match(response.headers.get('content-type'), /spreadsheetml/); assert.match(response.headers.get('cache-control'), /no-store/)
  const bytes = Buffer.from(await response.arrayBuffer()); assert.ok(bytes.includes(Buffer.from('Partner 522'))); assert.ok(!bytes.includes(Buffer.from('changedBy')))
  denied = true; assert.equal((await api.GET(new Request('https://test.invalid/api/crm/partners?export=xlsx'))).status, 403)
  console.log('WI300 catalog & partners: independent visibility, learning preservation, account zero, structured/legacy intake, batch counts, scoped full export, typed XLSX and route permission passed (isolated DB).')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
