// Isolated in-memory transactional fixtures; no live database, payments or messages.
const assert = require('node:assert/strict')
const load = require('./helpers/load-ts.cjs')
const shared = load('lib/offerings/shared.ts')
async function run() {
  let configs = new Map(), enrollments = new Map(), payments = new Map(), nextId = 300, failCourse = null
  const at = new Date('2026-11-01T08:00:00Z')
  const courses = new Map([
    [10, { id: 10, teacherId: 7, type: 'NORMAL', productGroup: 'DIGITAL', feeType: 'CO_PHI' }],
    [11, { id: 11, teacherId: 7, type: 'NORMAL', productGroup: 'DIGITAL', feeType: 'CO_PHI' }],
    [20, { id: 20, teacherId: 7, type: 'NORMAL', productGroup: 'DIGITAL', feeType: 'CO_PHI' }],
    [30, { id: 30, teacherId: 7, type: 'NORMAL', productGroup: 'COURSE', feeType: 'CO_PHI' }],
    [40, { id: 40, teacherId: 7, type: 'NORMAL', productGroup: 'SERVICE', feeType: 'CO_PHI' }],
    [50, { id: 50, teacherId: 99, type: 'NORMAL', productGroup: 'DIGITAL', feeType: 'CO_PHI' }],
    [60, { id: 60, teacherId: 7, type: 'SYS', productGroup: 'COURSE', feeType: 'CO_PHI' }],
  ])
  const setConfig = (id, value) => configs.set(`catalog:offering:${id}`, shared.parseOfferingDetails(value))
  const bundle = shared.parseOfferingDetails({ kind: 'COMBO', bundleItems: [{ courseId: 20, gift: false }, { courseId: 30, gift: false }, { courseId: 40, gift: true }] })
  setConfig(10, bundle); setConfig(11, bundle); setConfig(20, { kind: 'APP', accessDays: 30 }); setConfig(40, { kind: 'COACHING', sessions: 2 })
  const clone = value => value == null ? value : structuredClone(value)
  const db = {
    $executeRaw: async () => {},
    course: {
      findMany: async ({ where }) => { const ids = where.id?.in || where.AND?.[1]?.id?.in || []; return [...courses.values()].filter(row => ids.includes(row.id)).map(clone) },
      findUnique: async ({ where }) => clone(courses.get(where.id)),
    },
    enrollment: {
      findUnique: async ({ where, include }) => { const row = where.id != null ? enrollments.get(where.id) : [...enrollments.values()].find(row => row.userId === where.userId_courseId.userId && row.courseId === where.userId_courseId.courseId); return row ? clone({ ...row, ...(include?.course ? { course: courses.get(row.courseId), payment: payments.get(row.id) || row.payment } : {}) }) : null },
      count: async ({ where }) => [...enrollments.values()].filter(row => row.courseId === where.courseId).length,
      findMany: async ({ where }) => [...enrollments.values()].filter(row => (!where.id || where.id.in.includes(row.id)) && (where.userId == null || row.userId === where.userId) && (!where.status || row.status === where.status)).map(clone),
      create: async ({ data }) => { if (data.courseId === failCourse) throw Error('GRANT_FAILED'); const row = { id: nextId++, activatedAt: null, payment: null, ...data }; enrollments.set(row.id, clone(row)); return clone(row) },
      update: async ({ where, data }) => { if (enrollments.get(where.id)?.courseId === failCourse) throw Error('GRANT_FAILED'); const row = { ...enrollments.get(where.id), ...data }; enrollments.set(row.id, clone(row)); return clone(row) },
    },
    systemConfig: {
      findUnique: async ({ where }) => configs.has(where.key) ? { key: where.key, value: clone(configs.get(where.key)) } : null,
      findMany: async () => [...configs].map(([key, value]) => ({ key, value: clone(value) })),
      create: async ({ data }) => { assert.ok(!configs.has(data.key)); configs.set(data.key, clone(data.value)) },
      upsert: async ({ where, create, update }) => configs.set(where.key, clone(configs.has(where.key) ? update.value : create.value)),
      delete: async ({ where }) => configs.delete(where.key),
    },
    payment: { upsert: async ({ where, create, update }) => { const value = { ...(payments.get(where.enrollmentId) || create), ...update }; payments.set(where.enrollmentId, clone(value)); return clone(value) } },
    user: { findUnique: async () => ({ name: 'Customer zero', phone: null, email: null }) },
  }
  let queue = Promise.resolve()
  db.$transaction = callback => {
    const task = queue.then(async () => { const previous = clone({ configs, enrollments, payments, nextId }); try { return await callback(db) } catch (error) { ({ configs, enrollments, payments, nextId } = previous); throw error } })
    queue = task.catch(() => {})
    return task
  }
  const combo = load('lib/offerings/combo.ts', { 'server-only': {}, '@/lib/prisma': { __esModule: true, default: db } })
  assert.throws(() => shared.parseOfferingDetails({ bundleItems: [{ courseId: 20 }, { courseId: 20 }] }))
  await combo.validateCombo(db, 10, 'DIGITAL', bundle, 7)
  setConfig(40, { kind: 'OTHER', service: { saleMode: 'QUOTE', model: 'PROJECT' } })
  await assert.rejects(() => combo.validateCombo(db, 10, 'DIGITAL', bundle, 7), /báo giá/)
  setConfig(40, { kind: 'COACHING', sessions: 2 })
  for (const value of [
    { ...bundle, bundleItems: [{ courseId: 20, gift: false }] },
    { ...bundle, bundleItems: [{ courseId: 20, gift: false }, { courseId: 50, gift: false }] },
    { ...bundle, bundleItems: [{ courseId: 20, gift: false }, { courseId: 60, gift: false }] },
    { ...bundle, bundleItems: [{ courseId: 10, gift: false }, { courseId: 20, gift: false }] },
    { ...bundle, bundleItems: [{ courseId: 11, gift: false }, { courseId: 20, gift: false }] },
    { ...bundle, accessDays: 30 },
  ]) await assert.rejects(() => combo.validateCombo(db, 10, 'DIGITAL', value, 7))
  enrollments.set(100, { id: 100, userId: 0, courseId: 10, status: 'PENDING', activatedAt: null, studyMode: 'COMPANION' })
  enrollments.set(200, { id: 200, userId: 0, courseId: 30, status: 'ACTIVE', activatedAt: at, studyMode: 'COMPANION', payment: { status: 'VERIFIED' } })
  await combo.syncComboPurchase(100)
  assert.equal(enrollments.size, 2, 'Pending combo grants nothing')
  assert.equal(configs.get(combo.comboPurchaseKey(100)).items.length, 3, 'Composition is frozen at registration')
  await assert.rejects(() => combo.validateCombo(db, 10, 'DIGITAL', { ...bundle, bundleItems: bundle.bundleItems.slice(0, 2) }, 7), /đăng ký/)
  enrollments.get(100).status = 'ACTIVE'; enrollments.get(100).activatedAt = at
  await Promise.all([combo.syncComboPurchase(100), combo.syncComboPurchase(100)])
  const child = id => [...enrollments.values()].find(row => row.courseId === id && row.userId === 0)
  assert.equal(enrollments.size, 4, 'One child enrollment per item, existing ownership reused')
  assert.equal(child(20).status, 'ACTIVE'); assert.equal(child(40).status, 'ACTIVE')
  assert.equal(+child(20).activatedAt, +at, 'Child timer starts at parent activation')
  assert.equal(child(20).phi_coc, 0); assert.equal(child(20).payment, null, 'No duplicate paid orders or child commissions')
  assert.equal(child(30).id, 200); assert.equal(+child(30).activatedAt, +at)
  enrollments.set(101, { id: 101, userId: 0, courseId: 11, status: 'ACTIVE', activatedAt: at, studyMode: 'COMPANION' })
  await combo.syncComboPurchase(101)
  enrollments.get(100).status = 'CANCELLED'
  await combo.syncComboPurchase(100)
  assert.equal(child(20).status, 'ACTIVE', 'Second combo preserves its independent grant')
  enrollments.delete(101)
  await combo.syncComboPurchase(101)
  assert.equal(child(20).status, 'PENDING', 'Last source removed revokes only combo rights')
  assert.equal(child(40).status, 'PENDING')
  assert.equal(child(30).status, 'ACTIVE', 'Independently owned course survives all combo cancellation')
  enrollments.get(100).status = 'ACTIVE'
  failCourse = 40
  const before = clone({ configs, enrollments })
  await assert.rejects(() => combo.syncComboPurchase(100), /GRANT_FAILED/)
  assert.deepEqual({ configs, enrollments }, before, 'Grant failure rolls the entire entitlement transaction back')
  failCourse = null
  await combo.syncComboPurchase(100)
  child(20).payment = { status: 'VERIFIED' }
  enrollments.get(100).status = 'CANCELLED'
  await combo.syncComboPurchase(100)
  assert.equal(child(20).status, 'ACTIVE', 'Later standalone verified purchase is preserved')
  const orderCalls = [], commissionCalls = []
  const activation = load('lib/enrollment-activation.ts', {
    '@/lib/prisma': { __esModule: true, default: db },
    '@/lib/test-account': { isTestAccount: () => false },
    '@/lib/affiliate/commission-calculator': {},
    '@/lib/offerings/server': { readOfferingDetails: async id => configs.get(`catalog:offering:${id}`) },
    '@/lib/offerings/combo': combo,
    '@/lib/offerings/attach': { syncAttachInTransaction: async () => [], settleAttachOrders: async () => {} },
    '@/lib/affiliate/unified-commission': { resolveAffiliateIdFromCookie: async () => ({}), createOrderForEnrollment: async id => { orderCalls.push(id); return { success: true, orderId: id } }, processOrderCommission: async id => { commissionCalls.push(id); return { success: true } } },
    '@/lib/voucher/voucher-service': { grantVoucherBenefits: async () => {} },
  })
  enrollments.get(100).status = 'PENDING'
  failCourse = 40
  await assert.rejects(() => activation.processEnrollmentActivation({ enrollmentId: 100, method: 'MANUAL_ADMIN' }), /GRANT_FAILED/)
  assert.equal(enrollments.get(100).status, 'PENDING', 'Failed child grant cannot leave a paid combo activated')
  assert.equal(payments.size, 0, 'Payment verification rolls back with child grant failure')
  failCourse = null
  const result = await activation.processEnrollmentActivation({ enrollmentId: 100, method: 'MANUAL_ADMIN' })
  assert.equal(result.success, true); assert.equal(payments.size, 1); assert.equal(child(40).status, 'ACTIVE')
  assert.deepEqual(orderCalls, [100]); assert.deepEqual(commissionCalls, [100], 'Only the combo order produces commission')
  class CrmError extends Error { constructor(message, status) { super(message); this.status = status } }
  let actor = { id: 7, role: 'TEACHER' }, chosenOwner
  const options = load('app/api/offerings/combo-options/route.ts', {
    '@/lib/prisma': { __esModule: true, default: { course: { findMany: async ({ where }) => { chosenOwner = where.teacherId; assert.equal(where.type.not, 'SYS'); return [...courses.values()].filter(item => item.teacherId === where.teacherId && item.type !== 'SYS').map(item => ({ id: item.id, name_lop: `Item ${item.id}`, id_khoa: `ITEM${item.id}`, productGroup: item.productGroup, phi_coc: 100 })) } }, systemConfig: db.systemConfig } },
    '@/lib/course-page/permissions': { courseEditorActor: async () => { if (!actor) throw new CrmError('Unauthorized', 401); return actor } },
    '@/lib/crm/service': { CrmError },
  })
  const response = await options.GET(new Request('https://wi300.test/api/offerings/combo-options?teacherId=99'))
  const payload = await response.json()
  assert.equal(chosenOwner, 7, 'Teacher cannot spoof another owner through the selector query')
  assert.ok(!payload.items.some(item => [10, 11, 50, 60].includes(item.id)), 'Selector omits other owners, system courses and nested combos')
  assert.equal(response.headers.get('cache-control'), 'private, no-store')
  actor = null
  assert.equal((await options.GET(new Request('https://wi300.test/api/offerings/combo-options'))).status, 401)
  console.log('Combos: input/ownership/system/nesting guards, immutable composition, pending denial, account zero, idempotent grants, timers, no child payments, independent rights, cancellation/deletion and transactional rollback passed.')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
