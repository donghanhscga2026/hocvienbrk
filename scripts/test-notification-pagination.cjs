// Match Prisma's UTC decoding of timestamp-without-time-zone in this PGlite adapter.
process.env.TZ = 'UTC'
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const { PGlite } = require('@electric-sql/pglite')
const ts = require('typescript'), { Prisma } = require('@prisma/client')
const repo = path.resolve(__dirname, '..')
function load(file, overrides = {}) {
  const module = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(path.join(repo, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
  new Function('require', 'module', 'exports', code)(name => name in overrides ? overrides[name] : require(name), module, module.exports)
  return module.exports
}
async function run() {
  const pagination = load('lib/notification-pagination.ts')
  assert.equal(pagination.NOTIFICATION_PAGE_SIZE, 10)
  const db = new PGlite()
  try {
    const sql = execFileSync(process.execPath, [path.join(repo, 'node_modules/prisma/build/index.js'), 'migrate', 'diff', '--from-empty', '--to-schema-datamodel', path.join(repo, 'prisma/schema.prisma'), '--script'], { encoding: 'utf8', env: { ...process.env, DATABASE_URL: 'postgresql://test:test@localhost/test', DIRECT_URL: 'postgresql://test:test@localhost/test' } })
    await db.exec(sql)
    const fake = { $queryRaw: async query => (await db.query(query.text, query.values)).rows, $executeRaw: async query => (await db.query(query.text, query.values)).affectedRows, $transaction: promises => Promise.all(promises) }
    const feed = load('lib/app-notifications.ts', { '@prisma/client': { Prisma }, '@/auth': { auth: async () => null }, '@/lib/prisma': { __esModule: true, default: fake }, '@/lib/crm/service': { CrmError: Error }, './notification-pagination': pagination })
    await db.exec(`INSERT INTO "User" (id,email,role,"updatedAt") VALUES (0,'admin@test.invalid','ADMIN',now()),(901,'a@test.invalid','STUDENT',now()),(902,'b@test.invalid','STUDENT',now());
      INSERT INTO "Course" (id,id_khoa,name_lop,"teacherId","updatedAt") VALUES (901,'pagination','Pagination',0,now());
      INSERT INTO "Enrollment" (id,"userId","courseId",status,"updatedAt") VALUES (901,901,901,'ACTIVE',now()),(902,902,901,'ACTIVE',now());
      INSERT INTO "AppNotification" (id,"eventKey","recipientId",kind,title,"courseId","enrollmentId","notBefore","readAt") SELECT gen_random_uuid()::text,'pagination:'||g,901,'ENROLLMENT_ACTIVE','Notice '||g,901,901,now()-g*interval '1 second',CASE WHEN g%2=0 THEN now() ELSE NULL END FROM generate_series(1,23) g;
      INSERT INTO "AppNotification" (id,"eventKey","recipientId",kind,title,"courseId","enrollmentId") SELECT gen_random_uuid()::text,'other:'||g,902,'ENROLLMENT_ACTIVE','Other '||g,901,902 FROM generate_series(1,4) g;`)
    const actor = id => ({ id, role: id === 0 ? 'ADMIN' : 'STUDENT', email: id === 901 ? 'a@test.invalid' : 'b@test.invalid' })
    const pages = await Promise.all([1,2,3].map(page => feed.readNotifications(actor(901), page)))
    assert.deepEqual(pages.map(p => p.notifications.length), [10,10,3])
    assert.deepEqual(pages.map(p => p.notifications[0].title), ['Notice 1','Notice 11','Notice 21'])
    assert.equal(new Set(pages.flatMap(p => p.notifications.map(n => n.id))).size, 23)
    for (const page of pages) { assert.equal(page.total,23); assert.equal(page.unread,12); assert.ok(page.notifications.every(n => n.href === '/khoa-hoc/pagination')) }
    assert.equal((await feed.readNotifications(actor(901),4)).notifications.length,0)
    const other = await feed.readNotifications(actor(902),1)
    assert.equal(other.total,4)
    assert.equal((await feed.readNotifications(actor(0),1)).total,0)
    assert.equal((await feed.markNotifications(actor(901),[other.notifications[0].id])).updated,0)
    await feed.markNotifications(actor(901),[pages[0].notifications[0].id])
    assert.equal((await feed.readNotifications(actor(901),2)).unread,11)
    await feed.markNotifications(actor(901),null)
    assert.equal((await feed.readNotifications(actor(901),3)).unread,0)
    assert.equal((await feed.readNotifications(actor(902),1)).unread,4)
    await db.exec(`INSERT INTO "AppNotification" (id,"eventKey","recipientId",kind,title,"courseId","enrollmentId","notBefore") SELECT gen_random_uuid()::text,'tie:'||g,901,'ENROLLMENT_ACTIVE','Tie '||g,901,901,'2020-01-01T00:00:00.000Z' FROM generate_series(1,3) g;`)
    const first = await feed.readNotificationStream(actor(901))
    assert.equal(first.notifications.length,10)
    const originalIds = first.notifications.map(n=>n.id)
    await db.exec(`INSERT INTO "AppNotification" (id,"eventKey","recipientId",kind,title,"courseId","enrollmentId") VALUES (gen_random_uuid()::text,'new',901,'ENROLLMENT_ACTIVE','New arrival',901,901);`)
    let cursor=first.nextCursor, batches=[]
    while(cursor) {
      const next=await feed.readNotificationStream(actor(901),cursor)
      assert.ok(next.notifications.length<=3)
      assert.ok(next.notifications.every(n=>n.title!=='New arrival'&&!n.title.startsWith('Other')))
      originalIds.push(...next.notifications.map(n=>n.id));batches.push(next.notifications.length);cursor=next.nextCursor
    }
    assert.deepEqual(batches,[3,3,3,3,3,1])
    assert.equal(originalIds.length,26)
    assert.equal(new Set(originalIds).size,26,'Mốc gồm ID xử lý cả timestamp trùng và thông báo mới')
    assert.equal((await feed.readNotificationStream(actor(901))).notifications[0].title,'New arrival')
    await assert.rejects(feed.readNotificationStream(actor(901),'bad!'),/không hợp lệ/)
    await assert.rejects(feed.readNotificationStream(actor(901),Buffer.from(JSON.stringify(['bad date','id'])).toString('base64url')),/không hợp lệ/)
    console.log('Notification streaming: initial 10, then 3 per append, tied timestamps, live inserts, no gaps/duplicates and invalid cursor passed.')
    console.log('Notification pagination: actual PostgreSQL queries return 10/10/3 ordered rows, no gaps/duplicates, account isolation including admin 0, total/unread across pages and own-only read state passed; disposable database only.')
  } finally { await db.close() }
}
run().catch(e => { console.error(e); process.exitCode = 1 })
