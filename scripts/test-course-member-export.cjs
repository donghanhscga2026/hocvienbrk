// Database và Google API giả; không xuất/chia sẻ dữ liệu thật.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), ts = require('typescript'), zlib = require('node:zlib')
const repo = path.resolve(__dirname, '..')
class CrmError extends Error { constructor(message, status = 400) { super(message); this.status = status } }
function load(file, mocks = {}) {
  const mod = { exports: {} }
  const source = ts.transpileModule(fs.readFileSync(path.join(repo, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
  new Function('require', 'module', 'exports', source)(name => name in mocks ? mocks[name] : name === '@/lib/crm/service' ? { CrmError } : name.startsWith('@/') || name.startsWith('./') ? load(name.startsWith('@/') ? name.slice(2) + '.ts' : path.posix.join(path.posix.dirname(file), name + '.ts'), mocks) : require(name), mod, mod.exports)
  return mod.exports
}
function unzip(buffer) {
  const result = {}; let offset = 0
  while (buffer.readUInt32LE(offset) === 0x04034b50) {
    const method = buffer.readUInt16LE(offset + 8), size = buffer.readUInt32LE(offset + 18), len = buffer.readUInt16LE(offset + 26), extra = buffer.readUInt16LE(offset + 28)
    const name = buffer.subarray(offset + 30, offset + 30 + len).toString(), start = offset + 30 + len + extra
    const payload = buffer.subarray(start, start + size)
    result[name] = (method === 8 ? zlib.inflateRawSync(payload) : payload).toString(); offset = start + size
  }
  return result
}
async function run() {
  const exportService = load('lib/course/member-export.ts'), workbook = load('lib/course/export-workbook.ts')
  const now = new Date('2026-10-13T06:00:00Z'), base = new Date('2026-10-12T00:00:00Z')
  const courses = [{ id: 1, teacherId: 8, id_khoa: 'AI', name_lop: 'Thực hành AI' }, { id: 2, teacherId: 9, id_khoa: 'WEB', name_lop: 'Website' }]
  const lessons = [{ id: 'l1', courseId: 1, order: 1, title: 'Bài một' }, { id: 'l2', courseId: 1, order: 2, title: 'Bài hai' }, { id: 'l3', courseId: 2, order: 1, title: 'Bài web' }]
  const entries = [{ id: 1, courseId: 1, status: 'ACTIVE', createdAt: now, activatedAt: now, startedAt: base, memberRole: 'TV', team: 3, group: 4, user: { id: 101, name: '=1+1', phone: '+84901234567', email: 'one@example.invalid' }, lessonProgress: [{ lessonId: 'l1', status: 'COMPLETED', scores: { timing: 1 }, submittedAt: new Date('2026-10-12T16:59:00Z'), totalScore: 7, assignment: { reflection: 'Dòng 1\nDòng 2', links: ['https://example.invalid/report'], supports: [true, false, true] } }, { lessonId: 'l2', status: 'RESET', submittedAt: now, totalScore: 7 }] }, { id: 2, courseId: 1, status: 'PENDING', createdAt: now, activatedAt: null, startedAt: null, memberRole: 'TV', team: 1, group: 1, user: { id: 102, name: 'Học viên chờ', phone: null, email: 'two@example.invalid' }, lessonProgress: [] }, { id: 3, courseId: 2, status: 'ACTIVE', createdAt: now, activatedAt: now, startedAt: base, memberRole: 'PS', team: 1, group: 1, user: { id: 101, name: '=1+1', phone: '+84901234567', email: 'one@example.invalid' }, lessonProgress: [{ lessonId: 'l3', status: 'COMPLETED', scores: { timing: -1 }, submittedAt: now, totalScore: 5 }] }]
  const filtered = where => entries.filter(e => where.courseId.in.includes(e.courseId) && (!where.status || where.status === e.status) && (!where.userId || where.userId.in.includes(e.user.id)))
  let queries = 0
  const db = { course: { findMany: async ({ where }) => courses.filter(c => where.id.in.includes(c.id) && (where.teacherId == null || c.teacherId === where.teacherId)) }, lesson: { findMany: async ({ where }) => lessons.filter(l => where.courseId.in.includes(l.courseId)) }, enrollment: { count: async ({ where }) => { queries++; return filtered(where).length }, findMany: async ({ where, select }) => { assert.equal(select.user.select.email, true); if (select.lessonProgress) assert.equal(select.lessonProgress.where.status.not, 'RESET'); return filtered(where).map(e => ({ ...e, lessonProgress: select.lessonProgress ? e.lessonProgress.filter(p => p.status !== 'RESET') : undefined })) } } }
  const teacher = { id: 8, role: 'TEACHER' }, admin = { id: 0, role: 'ADMIN' }
  await assert.rejects(() => exportService.memberExportSheets(db, { id: 8, role: 'STUDENT' }, { courseIds: [1] }), e => e.status === 403)
  await assert.rejects(() => exportService.memberExportSheets(db, teacher, { courseIds: [1, 2] }), e => e.status === 403)
  assert.equal(queries, 0, 'Permissions checked before reading contacts')
  const simple = await exportService.memberExportSheets(db, teacher, { courseIds: [1] }, now)
  assert.equal(simple.total, 2, 'Default includes pending registrations'); assert.equal(simple.sheets.length, 2)
  assert.equal(simple.sheets[0].rows[0][3], '0901234567'); assert.equal(simple.sheets[0].rows[1][3], '')
  const active = await exportService.memberExportSheets(db, teacher, { courseIds: [1], status: 'ACTIVE', userIds: [101] }, now); assert.equal(active.total, 1)
  await assert.rejects(() => exportService.memberExportSheets(db, teacher, { courseIds: [1], userIds: [999] }), e => e.status === 400)
  const report = await exportService.memberExportSheets(db, admin, { courseIds: [1, 2], reports: true }, now)
  assert.equal(report.total, 3, 'One row per course registration'); assert.equal(report.sheets.length, 4)
  const summary = report.sheets[1].rows
  assert.deepEqual(summary[0].slice(6, 11), [2, 1, 1, 1, 0]); assert.equal(summary[0].at(-1), '', 'Other course lessons left blank')
  assert.deepEqual(summary[2].slice(6, 11), [1, 1, 1, 0, 1])
  assert.equal(report.sheets[2].rows[0][13], 2); assert.equal(report.sheets[2].rows[1][9], null, 'RESET submission is not exported')
  assert.match(exportService.exportedProgressState({ status: 'IN_PROGRESS', submittedAt: now }, now.getTime() + 1000, now.getTime()), /Đã nộp, chưa hoàn thành/)
  const bytes = workbook.courseWorkbook(report.sheets), xml = unzip(bytes)
  assert.match(xml['xl/worksheets/sheet1.xml'], /t="inlineStr"[^>]*><is><t xml:space="preserve">=1\+1/); assert.ok(!xml['xl/worksheets/sheet1.xml'].includes('<f>'))
  assert.match(xml['xl/worksheets/sheet1.xml'], /0901234567/); assert.match(xml['xl/worksheets/sheet1.xml'], /one@example.invalid/); assert.match(xml['xl/worksheets/sheet1.xml'], /state="frozen"/); assert.match(xml['xl/worksheets/sheet1.xml'], /autoFilter/)
  assert.equal(workbook.exportDate(base, true).value, 46307); assert.ok(Math.abs(workbook.exportDate(now).value - (now.getTime() / 86400000 + 25569 + 7 / 24)) < 0.000001)
  if (process.env.COURSE_EXPORT_TEST_XLSX) fs.writeFileSync(process.env.COURSE_EXPORT_TEST_XLSX, bytes)
  let session = { user: { id: '0' } }, domain = null
  db.user = { findUnique: async () => admin }
  let googleReport, googleRecipient
  const http = load('lib/crm/http.ts', { './service': { CrmError } }), api = load('app/api/courses/member-export/route.ts', { '@/auth': { auth: async () => session }, '@/lib/prisma': { __esModule: true, default: db }, '@/lib/website/domain-context': { domainContext: async () => domain }, '@/lib/course/member-export': exportService, '@/lib/course/export-workbook': workbook, '@/lib/crm/http': http, '@/lib/course/google-export': { createCourseGoogleSheet: async (sheets, title, recipient) => { googleReport = sheets; googleRecipient = recipient; return 'https://docs.google.com/spreadsheets/d/test' } } })
  const request = (origin = 'https://test.invalid', body = { courseIds: [1] }) => new Request('https://test.invalid/api/courses/member-export', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) })
  assert.equal((await api.POST(request('https://other.invalid'))).status, 403)
  assert.equal((await api.POST(request(undefined, { courseIds: [1], admin: true }))).status, 400)
  const response = await api.POST(request()); assert.equal(response.status, 200); assert.match(response.headers.get('content-type'), /spreadsheetml/); assert.equal(response.headers.get('cache-control'), 'private, no-store')
  assert.equal((await api.POST(request(undefined, { courseIds: [1], format: 'GOOGLE' }))).status, 400, 'Google requires a verified recipient')
  db.user.findUnique = async () => ({ ...admin, email: 'requester@example.invalid', emailVerified: now })
  const googleResponse = await api.POST(request(undefined, { courseIds: [1], status: 'ACTIVE', userIds: [101], reports: true, format: 'GOOGLE' }))
  assert.equal(googleResponse.status, 200); assert.equal((await googleResponse.json()).sheetUrl, 'https://docs.google.com/spreadsheets/d/test')
  assert.equal(googleRecipient, 'requester@example.invalid'); assert.equal(googleReport[0].rows.length, 1); assert.equal(googleReport.length, 4, 'Google shares the Excel report filters and detail sheets')
  session = null; assert.equal((await api.POST(request())).status, 401); session = { user: { id: '0' } }; domain = {}; assert.equal((await api.POST(request())).status, 403)
  const priorToken = process.env.GMAIL_REFRESH_TOKEN; process.env.GMAIL_REFRESH_TOKEN = 'fake-only'
  let shared, valueRequest, deleted = 0, denyShare = false
  const google = { sheets: () => ({ spreadsheets: { create: async () => ({ data: { spreadsheetId: 'fake' } }), values: { batchUpdate: async payload => { valueRequest = payload } }, batchUpdate: async () => {} } }), drive: () => ({ permissions: { create: async payload => { if (denyShare) throw { response: { status: 403 } }; shared = payload } }, files: { get: async () => ({ data: { owners: [{ emailAddress: 'system@example.invalid' }] } }), delete: async () => deleted++ } }) }
  try {
    const service = load('lib/course/google-export.ts', { googleapis: { google }, '@/lib/google-auth': { getOAuth2Client: () => ({ setCredentials: () => {} }) } })
    assert.equal(await service.createCourseGoogleSheet(report.sheets, 'Test', 'teacher@example.invalid'), 'https://docs.google.com/spreadsheets/d/fake')
    assert.equal(shared.requestBody.emailAddress, 'teacher@example.invalid'); assert.equal(shared.sendNotificationEmail, false); assert.equal(valueRequest.requestBody.valueInputOption, 'RAW'); assert.equal(valueRequest.requestBody.data.length, 4)
    denyShare = true; await assert.rejects(() => service.createCourseGoogleSheet(report.sheets, 'Test', 'teacher@example.invalid'), e => e.status === 503); assert.equal(deleted, 1, 'Failed share never reports success and cleans incomplete file')
  } finally { if (priorToken == null) delete process.env.GMAIL_REFRESH_TOKEN; else process.env.GMAIL_REFRESH_TOKEN = priorToken }
  console.log('PASS course exports: contacts, pending/active scope, owner/admin permissions, current reports, dates, safe XLSX, origin/domain isolation, Google requester sharing and failure handling')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
