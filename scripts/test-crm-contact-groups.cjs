// Kiểm tra bộ lọc bằng dữ liệu giả trong bộ nhớ; không đọc hay ghi database thật.
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
const { readCrm, CrmError } = load(root + '/lib/crm/service.ts')
const { crmQuery } = load(root + '/lib/crm/validation.ts')
// Adapter bộ nhớ cho các toán tử truy vấn Prisma; gọi hàm readCrm thật.
function matches(row, where) {
  return Object.entries(where).every(([key, value]) => {
    if (value === undefined) return true
    if (key === 'AND') return (Array.isArray(value) ? value : [value]).every(v => matches(row, v))
    if (key === 'OR') return value.some(v => matches(row, v))
    const current = row?.[key]
    if (value === null || typeof value !== 'object') return current === value
    if ('some' in value) return (current || []).some(v => matches(v, value.some))
    if ('none' in value) return !(current || []).some(v => matches(v, value.none))
    if ('notIn' in value) return !value.notIn.includes(current)
    if ('contains' in value) return String(current || '').toLowerCase().includes(String(value.contains).toLowerCase())
    if ('has' in value) return (current || []).includes(value.has)
    return current != null && matches(current, value)
  })
}
const enrollment = teacherId => ({ course: { teacherId } })
const person = (id, extra = {}) => ({
  id, name: 'Person ' + id, email: id + '@test.invalid', phone: null, ownerId: 1,
  studentProfile: false, studentUser: null, linkedUser: null, archived: false,
  opportunities: [], tasks: [], source: 'Web', tags: ['AI'], ...extra,
})
const rows = [
  person(1), person(2, { studentProfile: true, studentUser: { email: 'learner@test.invalid', phone: null, enrollments: [enrollment(1)] } }),
  person(3, { linkedUser: { enrollments: [enrollment(1)] }, opportunities: [{ stage: 'NEW' }] }),
  person(4, { linkedUser: { enrollments: [enrollment(2)] } }),
  person(5, { ownerId: 2, studentProfile: true, studentUser: { email: 'other@test.invalid', phone: null, enrollments: [enrollment(2)] } }),
  person(6, { opportunities: [{ stage: 'WON' }] }),
  person(7, { opportunities: [{ stage: 'LOST' }] }),
  person(8, { opportunities: [{ stage: 'PROPOSAL' }], tasks: [{ completedAt: null }] }),
  person(9, { archived: true, opportunities: [{ stage: 'NEW' }] }),
  person(10, { studentProfile: true, studentUser: { email: 'former@test.invalid', phone: null, enrollments: [enrollment(2)] } }),
]
let foundWhere, countWhere
const db = {
  crmContact: {
    findMany: async q => { foundWhere = q.where; return rows.filter(r => matches(r, q.where)).slice(q.skip, q.skip + q.take) },
    count: async q => { countWhere = q.where; return rows.filter(r => matches(r, q.where)).length },
  },
  enrollment: { findMany: async () => [] },
  crmRequest: { groupBy: async () => [] },
}
const teacher = { id: 1, role: 'TEACHER', name: 'Teacher' }
let checks = 0
async function expect(actor, query, expected) {
  const result = await readCrm(db, actor, crmQuery.parse(query))
  assert.deepEqual(result.contacts.map(r => r.id), expected)
  assert.deepEqual(foundWhere, countWhere, 'Danh sách và tổng số dùng cùng bộ lọc')
  checks += 2
  return result
}
async function run() {
  assert.equal(crmQuery.parse({}).group, 'all'); checks++
  assert.equal(crmQuery.safeParse({ group: 'bad' }).success, false); checks++
  await expect(teacher, {}, [1, 2, 3, 4, 6, 7, 8])
  await expect(teacher, { group: 'students' }, [2, 3])
  await expect(teacher, { group: 'students', ownerId: 2 }, [2, 3])
  await expect(teacher, { group: 'consultation' }, [3, 8])
  await expect(teacher, { group: 'consultation', due: 'unscheduled' }, [3])
  await expect(teacher, { group: 'students', due: 'unscheduled' }, [3])
  await expect(teacher, { group: 'students', q: 'learner' }, [2])
  await expect(teacher, { group: 'students', tag: 'other' }, [])
  await expect(teacher, { group: 'students', stage: 'PROPOSAL' }, [])
  await expect(teacher, { group: 'consultation', archived: 'true' }, [9])
  await expect({ id: 0, role: 'ADMIN' }, { group: 'students', ownerId: 2 }, [5])
  await assert.rejects(() => readCrm(db, { id: 1, role: 'STUDENT' }, crmQuery.parse({ group: 'students' })), e => e instanceof CrmError && e.status === 403); checks++
  for (let id = 20; id < 45; id++) rows.push(person(id, { opportunities: [{ stage: 'NEW' }] }))
  const page = await expect(teacher, { group: 'consultation', page: 2 }, [38, 39, 40, 41, 42, 43, 44])
  assert.equal(page.total, 27); checks++
  console.log('Passed ' + checks + ' CRM contact group checks; no database connection.')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
