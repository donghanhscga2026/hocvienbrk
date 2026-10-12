/* Kiểm tra SQL thật trong PostgreSQL tạm; không kết nối database sản phẩm. */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict')
const ts = require('typescript'), { PGlite } = require('@electric-sql/pglite')
const db = new PGlite(), root = path.resolve(__dirname, '..')
let checks = 0, queue = Promise.resolve()
const ok = (value, label) => { assert.ok(value, label); checks++ }
const query = async sql => (await db.query(sql.text, sql.values)).rows
const adapter = {
  $queryRaw: query,
  $executeRaw: async sql => (await db.query(sql.text, sql.values)).affectedRows,
  user: { create: async ({data}) => {
    const row = (await db.query('INSERT INTO "User"(id,email) VALUES($1,$2) RETURNING *', [data.id,data.email])).rows[0]
    return row
  } },
  $transaction: callback => {
    // PGlite chỉ có một session; hàng đợi mô phỏng giao dịch chờ khóa User.
    const task = queue.then(async () => {
      await db.exec('BEGIN')
      try { const result = await callback(adapter); await db.exec('COMMIT'); return result }
      catch (error) { await db.exec('ROLLBACK'); throw error }
    })
    queue = task.catch(() => {})
    return task
  },
}
const mod = {exports:{}}
new Function('require','exports','module', ts.transpileModule(fs.readFileSync(path.join(root,'lib/id-helper.ts'),'utf8'),
  {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText)(
  name => name==='./prisma'?{__esModule:true,default:adapter}:require(name),mod.exports,mod)
const {getAvailableUserIds,getNextAvailableId,createUserWithAvailableId,NORMAL_USER_ID_CURSOR_KEY:key} = mod.exports
async function main() {
  await db.exec(`CREATE TABLE "User"(id int PRIMARY KEY,email text UNIQUE);
    CREATE TABLE "ReservedId"(id int PRIMARY KEY);
    CREATE TABLE "SystemConfig"(key text PRIMARY KEY,value jsonb);
    INSERT INTO "User" VALUES(0,'root'),(1712,'last-normal'),(3687,'special'),(8286,'special2');
    INSERT INTO "ReservedId" VALUES(8286),(3698);
    INSERT INTO "SystemConfig" VALUES('user-id-change:retired:3698','{"newId":3687}');`)
  ok(await getNextAvailableId()===1713,'Bootstrap excludes retired-change target even if reservation was deleted')
  ok((await db.query('SELECT count(*)::int n FROM "SystemConfig"')).rows[0].n===1,'Preview does not initialize or consume cursor')
  const users = await Promise.all(Array.from({length:8},(_,i)=>createUserWithAvailableId({email:'concurrent-'+i})))
  assert.deepEqual(users.map(u=>u.id),[1713,1714,1715,1716,1717,1718,1719,1720]); checks++
  ok((await db.query('SELECT value FROM "SystemConfig" WHERE key=$1',[key])).rows[0].value===1720,'Committed cursor follows normal creates')
  await assert.rejects(()=>createUserWithAvailableId({email:'concurrent-0'}),/duplicate/);checks++
  ok(await getNextAvailableId()===1721,'Failed create rolls back cursor and account')
  await db.exec(`INSERT INTO "User" VALUES(1722,'occupied'),(20000,'new-special');
    INSERT INTO "ReservedId" VALUES(1723);
    INSERT INTO "SystemConfig" VALUES('user-id-change:retired:1724','{"newId":20000}');`)
  assert.deepEqual(await getAvailableUserIds(4),[1721,1725,1726,1727]);checks++
  ok((await createUserWithAvailableId({email:'next'})).id===1721,'High special insertion does not move normal cursor')
  ok(await getNextAvailableId()===1725,'Occupied, reserved and retired IDs are all skipped')
  await db.exec(`UPDATE "SystemConfig" SET value='"bad"' WHERE key='${key}'`)
  await assert.rejects(()=>getNextAvailableId(),/không hợp lệ/);checks++
  await assert.rejects(()=>getAvailableUserIds(-1),/không hợp lệ/);checks++
  await db.exec(`UPDATE "SystemConfig" SET value='2147483646' WHERE key='${key}'`)
  assert.deepEqual(await getAvailableUserIds(1),[2147483647]);checks++
  await assert.rejects(()=>getAvailableUserIds(2),/hết mã/);checks++
  const source = fs.readFileSync(path.join(root,'auth.ts'),'utf8')
  ok(!source.includes('return baseAdapter.createUser!(data)'), 'OAuth never falls back to a high database sequence')
  console.log('Normal user IDs: '+checks+' checks passed; isolated PostgreSQL only.')
}
main().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>db.close())
