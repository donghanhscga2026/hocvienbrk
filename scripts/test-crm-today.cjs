// Kiểm tra mục "Data hôm nay" bằng dữ liệu giả trong bộ nhớ; không đọc hay ghi database thật.
// Bao phủ cả hai chiều biên ngày Việt Nam: đúng 00:00 hôm nay thì tính, đúng 00:00 ngày mai thì không.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const cache = new Map()
function load(file) {
  const absolute = path.resolve(file)
  if (cache.has(absolute)) return cache.get(absolute).exports
  const module = { exports: {} }; cache.set(absolute, module)
  const compiled = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  new Function('require', 'exports', 'module', compiled)(name => name.startsWith('.') ? load(path.resolve(path.dirname(absolute), name + '.ts')) : require(name), module.exports, module)
  return module.exports
}
const root = path.resolve(__dirname, '..')
const { readToday } = load(root + '/lib/crm/today.ts')
const { readCrm, CrmError } = load(root + '/lib/crm/service.ts')
const { crmQuery } = load(root + '/lib/crm/validation.ts')

function matches(row, where) {
  if (!where) return true
  return Object.entries(where).every(([key, value]) => {
    if (value === undefined) return true
    if (key === 'AND') return (Array.isArray(value) ? value : [value]).every(v => matches(row, v))
    if (key === 'OR') return (Array.isArray(value) ? value : [value]).some(v => matches(row, v))
    const current = row?.[key]
    if (value === null || typeof value !== 'object' || value instanceof Date) return current === value
    if ('some' in value) return Array.isArray(current) && current.some(v => matches(v, value.some))
    if ('none' in value) return !(Array.isArray(current) && current.some(v => matches(v, value.none)))
    if ('gte' in value || 'lt' in value || 'gt' in value || 'lte' in value) {
      const t = current instanceof Date ? current.getTime() : current
      const bound = v => v instanceof Date ? v.getTime() : v
      if ('gte' in value && !(t >= bound(value.gte))) return false
      if ('lt' in value && !(t < bound(value.lt))) return false
      if ('gt' in value && !(t > bound(value.gt))) return false
      if ('lte' in value && !(t <= bound(value.lte))) return false
      return true
    }
    if ('not' in value) {
      const not = value.not
      return (not !== null && typeof not === 'object' && !(not instanceof Date)) ? !matches(row, { [key]: not }) : current !== not
    }
    if ('notIn' in value) return !value.notIn.includes(current)
    if ('in' in value) return value.in.includes(current)
    if ('contains' in value) return String(current || '').toLowerCase().includes(String(value.contains).toLowerCase())
    if (current === null || typeof current !== 'object') return false
    return matches(current, value)
  })
}
function sorted(rows, orderBy) {
  const specs = (Array.isArray(orderBy) ? orderBy : [orderBy]).filter(Boolean)
  return [...rows].sort((a, b) => {
    for (const spec of specs) {
      const [field, dir] = Object.entries(spec)[0]
      const av = a[field] instanceof Date ? a[field].getTime() : a[field]
      const bv = b[field] instanceof Date ? b[field].getTime() : b[field]
      if (av !== bv) return (av < bv ? -1 : 1) * (dir === 'desc' ? -1 : 1)
    }
    return 0
  })
}
function model(rows) {
  return {
    count: async ({ where } = {}) => rows.filter(r => matches(r, where)).length,
    findMany: async ({ where, orderBy, take, skip } = {}) => sorted(rows.filter(r => matches(r, where)), orderBy).slice(skip || 0, (skip || 0) + (take ?? rows.length)),
    groupBy: async ({ by, where, take }) => {
      const field = by[0]; const groups = new Map()
      for (const row of rows.filter(r => matches(r, where))) groups.set(row[field], (groups.get(row[field]) || 0) + 1)
      return [...groups.entries()].map(([value, count]) => ({ [field]: value, _count: { _all: count } })).sort((a, b) => b._count._all - a._count._all).slice(0, take ?? 20)
    },
  }
}

// Ngày cố định: 12:00 Việt Nam ngày 25/10/2026. Biên ngày theo UTC: [24/10 17:00Z, 25/10 17:00Z).
const NOW = new Date('2026-10-25T05:00:00.000Z')
const at = iso => new Date(iso)
const owner7 = { id: 7, name: 'Thầy Bảy', email: 'teacher7@test.invalid' }
const contacts = [
  { id: 1, name: 'Landing hôm nay', email: 'a@test.invalid', phone: null, source: 'Landing page: khoa-ai', ownerId: null, owner: null, archived: false, studentProfile: false, studentUser: null, createdAt: at('2026-10-24T18:30:00Z') },
  { id: 2, name: 'Form hôm qua', email: 'b@test.invalid', phone: null, source: 'Form Page: tu-van', ownerId: null, owner: null, archived: false, studentProfile: false, studentUser: null, createdAt: at('2026-10-24T16:30:00Z') },
  { id: 3, name: 'Khách của thầy 7', email: 'c@test.invalid', phone: null, source: 'Form Page: tu-van', ownerId: 7, owner: owner7, archived: false, studentProfile: false, studentUser: null, createdAt: at('2026-10-25T02:00:00Z') },
  { id: 4, name: 'Hồ sơ lưu trữ', email: 'd@test.invalid', phone: null, source: 'Nhập tay', ownerId: null, owner: null, archived: true, studentProfile: false, studentUser: null, createdAt: at('2026-10-25T03:00:00Z') },
  { id: 5, name: 'Học viên thầy 7', email: 'e@test.invalid', phone: null, source: 'Học viên khóa học', ownerId: 7, owner: owner7, archived: false, studentProfile: true, studentUser: { enrollments: [{ course: { teacherId: 7 } }] }, createdAt: at('2026-10-25T04:00:00Z') },
  { id: 6, name: 'Học viên thầy 9', email: 'f@test.invalid', phone: null, source: 'Học viên khóa học', ownerId: 9, owner: null, archived: false, studentProfile: true, studentUser: { enrollments: [{ course: { teacherId: 9 } }] }, createdAt: at('2026-10-25T04:30:00Z') },
  { id: 7, name: 'Học viên đã chuyển lớp', email: 'g@test.invalid', phone: null, source: 'Học viên khóa học', ownerId: 7, owner: owner7, archived: false, studentProfile: true, studentUser: { enrollments: [{ course: { teacherId: 9 } }] }, createdAt: at('2026-10-25T04:45:00Z') },
  { id: 8, name: 'Đúng 0 giờ ngày mai', email: 'h@test.invalid', phone: null, source: 'Landing page: khoa-ai', ownerId: null, owner: null, archived: false, studentProfile: false, studentUser: null, createdAt: at('2026-10-25T17:00:00Z') },
  { id: 9, name: 'Đúng 0 giờ hôm nay', email: 'i@test.invalid', phone: null, source: 'Landing page: khoa-ai', ownerId: null, owner: null, archived: false, studentProfile: false, studentUser: null, createdAt: at('2026-10-24T17:00:00Z') },
]
const requests = [
  { id: 'r1', name: 'Landing hôm nay', email: 'a@test.invalid', phone: null, source: 'Landing page: khoa-ai', status: 'NEW', content: 'Đăng ký tư vấn', contactId: 1, courseId: null, course: null, ownerId: null, createdAt: at('2026-10-24T18:30:00Z') },
  { id: 'r2', name: 'Yêu cầu của thầy 7', email: 'c@test.invalid', phone: null, source: 'Yêu cầu thành viên', status: 'NEW', content: 'Cần tư vấn', contactId: 3, courseId: null, course: null, ownerId: 7, createdAt: at('2026-10-25T02:05:00Z') },
  { id: 'r3', name: 'Đăng ký đối tác', email: 'p@test.invalid', phone: null, source: 'Wi300: Đăng ký đối tác', status: 'NEW', content: 'Hợp tác', contactId: null, courseId: null, course: null, ownerId: 7, createdAt: at('2026-10-25T02:10:00Z') },
  { id: 'r4', name: 'Yêu cầu hôm qua', email: 'b@test.invalid', phone: null, source: 'Yêu cầu thành viên', status: 'NEW', content: 'Hôm qua', contactId: 2, courseId: null, course: null, ownerId: null, createdAt: at('2026-10-24T16:00:00Z') },
  { id: 'r5', name: 'Yêu cầu khóa thầy 7', email: 'e@test.invalid', phone: null, source: 'Yêu cầu thành viên', status: 'IN_PROGRESS', content: 'Hỏi bài', contactId: 5, courseId: 10, course: { teacherId: 7, name_lop: 'Khóa AI' }, ownerId: 7, createdAt: at('2026-10-25T04:05:00Z') },
  { id: 'r6', name: 'Yêu cầu khóa thầy 9', email: 'f@test.invalid', phone: null, source: 'Yêu cầu thành viên', status: 'NEW', content: 'Hỏi bài', contactId: 6, courseId: 11, course: { teacherId: 9, name_lop: 'Khóa khác' }, ownerId: 7, createdAt: at('2026-10-25T04:35:00Z') },
]
const users = [
  { id: 101, name: 'Tài khoản lớp thầy 7', email: 'u101@test.invalid', phone: null, referrerId: null, enrollments: [{ course: { teacherId: 7 } }], createdAt: at('2026-10-25T01:00:00Z') },
  { id: 102, name: 'Tài khoản lớp thầy 9', email: 'u102@test.invalid', phone: null, referrerId: 101, enrollments: [{ course: { teacherId: 9 } }], createdAt: at('2026-10-25T01:30:00Z') },
  { id: 103, name: 'Tài khoản chưa ghi danh', email: 'u103@test.invalid', phone: null, referrerId: null, enrollments: [], createdAt: at('2026-10-25T01:45:00Z') },
  { id: 104, name: 'Tài khoản hôm qua', email: 'u104@test.invalid', phone: null, referrerId: null, enrollments: [{ course: { teacherId: 7 } }], createdAt: at('2026-10-24T10:00:00Z') },
]
const db = { crmContact: model(contacts), crmRequest: model(requests), user: model(users) }
const admin = { id: 0, role: 'ADMIN', name: 'Admin' }
const teacher = { id: 7, role: 'TEACHER', name: 'Thầy Bảy' }
let checks = 0
const ok = (value, message) => { assert.ok(value, message); checks++ }

async function main() {
  const adminToday = await readToday(db, admin, 1, NOW)
  ok(adminToday.date === '2026-10-25', 'Nhãn ngày là ngày Việt Nam hiện tại')
  ok(adminToday.stats.contacts === 6, 'Admin: 6 hồ sơ hôm nay (gồm biên 0 giờ, trừ hôm qua/lưu trữ/ngày mai)')
  ok(adminToday.stats.requests === 5, 'Admin: 5 yêu cầu hôm nay')
  ok(adminToday.stats.newUsers === 3, 'Admin: 3 tài khoản hôm nay')
  const bySource = Object.fromEntries(adminToday.contactsBySource.map(row => [row.label, row.count]))
  ok(bySource['Landing page: khoa-ai'] === 2 && bySource['Học viên khóa học'] === 3 && bySource['Form Page: tu-van'] === 1, 'Tách nguồn khớp danh sách hồ sơ hôm nay')
  ok(adminToday.contacts[0].id === 7 && adminToday.contacts.at(-1).id === 9, 'Hồ sơ sắp xếp mới nhất trước, biên đầu ngày vẫn có mặt')
  ok(adminToday.contacts.every(c => !c.archived), 'Danh sách không chứa hồ sơ lưu trữ')
  const page2 = await readToday(db, admin, 2, NOW)
  ok(page2.contacts.length === 0 && page2.contactsTotal === 6, 'Trang 2 rỗng nhưng tổng số giữ nguyên')

  const teacherToday = await readToday(db, teacher, 1, NOW)
  ok(teacherToday.stats.contacts === 2 && teacherToday.contacts.map(c => c.id).sort().join(',') === '3,5', 'Giáo viên chỉ thấy hồ sơ trong phạm vi phụ trách còn hiệu lực')
  ok(teacherToday.stats.requests === 2 && teacherToday.requests.map(r => r.id).sort().join(',') === 'r2,r5', 'Giáo viên không thấy yêu cầu đối tác, yêu cầu khóa người khác hay yêu cầu chưa phân công')
  ok(teacherToday.stats.newUsers === 1 && teacherToday.newUsers[0].id === 101, 'Giáo viên chỉ thấy tài khoản đã ghi danh khóa của mình')

  await assert.rejects(() => readToday(db, { id: 55, role: 'STUDENT', name: 'Học viên' }, 1, NOW), e => e instanceof CrmError && e.status === 403); checks++
  ok(crmQuery.parse({ view: 'today' }).view === 'today', 'crmQuery chấp nhận view today')
  ok(!crmQuery.safeParse({ view: 'bogus' }).success, 'crmQuery từ chối view lạ')

  // Điều phối qua readCrm bằng dữ liệu "ngay lúc này" để không phụ thuộc ngày chạy kiểm thử.
  const liveDb = {
    crmContact: model([{ id: 1, name: 'Vừa đăng ký', email: 'live@test.invalid', phone: null, source: 'Landing page: khoa-ai', ownerId: null, owner: null, archived: false, studentProfile: false, studentUser: null, createdAt: new Date() }]),
    crmRequest: model([]), user: model([]),
  }
  const viaService = await readCrm(liveDb, admin, crmQuery.parse({ view: 'today' }))
  ok(viaService.stats.contacts === 1 && viaService.contacts[0].name === 'Vừa đăng ký', 'readCrm điều phối view today tới đúng danh sách hôm nay')

  console.log('test-crm-today: ' + checks + ' checks PASS')
}
main().catch(error => { console.error(error); process.exit(1) })
