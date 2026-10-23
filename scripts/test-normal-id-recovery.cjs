/* Kiểm thử transaction đổi mã, snapshot và tài khoản phát sinh trong lúc duyệt. */
const fs=require('node:fs'), path=require('node:path'), assert=require('node:assert/strict')
const {execFileSync}=require('node:child_process'), {PGlite}=require('@electric-sql/pglite')
const {previewSql,executeSql,manualLinks}=require('./normal-id-recovery.cjs')
const db=new PGlite(),root=path.resolve(__dirname,'..'),mapping=[{oldId:3688,newId:1713},{oldId:3689,newId:1714}]
let checks=0
const ok=(condition,label)=>{assert.ok(condition,label);checks++}
async function runFail(sql,pattern) {
  try { await assert.rejects(()=>db.exec(sql),pattern);checks++ } finally { await db.exec('ROLLBACK') }
}
async function preview() { return (await db.query(previewSql(mapping))).rows[0].preview }
async function main() {
  const source=fs.readFileSync(path.join(root,'lib/user-id-change.ts'),'utf8')
  for(const [table,col] of manualLinks) ok(source.includes(`['${table}','${col}']`),'Manual link is included in standard rename')
  const schema=execFileSync(path.join(root,'node_modules/.bin/prisma'),['migrate','diff','--from-empty','--to-schema-datamodel',path.join(root,'prisma/schema.prisma'),'--script'],{encoding:'utf8',env:{...process.env,DATABASE_URL:'postgresql://test:test@localhost/test',DIRECT_URL:'postgresql://test:test@localhost/test'}})
  await db.exec(schema)
  await db.exec(fs.readFileSync(path.join(root,'database/patches/user-id-update-cascade.sql'),'utf8'))
  await db.exec(`INSERT INTO "User"(id,email,name,role,"updatedAt","referrerId") VALUES(0,'admin@test','Admin','ADMIN',now(),NULL),(1712,'last@test','Last','STUDENT',now(),0),(3688,'first@test','First','STUDENT',now(),0),(3689,'second@test','Second','STUDENT',now(),3688),(8286,'special@test','Special','TEACHER',now(),0);
    INSERT INTO "ReservedId"(id,note) VALUES(8286,'Special');
    INSERT INTO "Course"(id,id_khoa,name_lop,"teacherId","updatedAt") VALUES(1,'c','Class',0,now());
    INSERT INTO "Enrollment"(id,"userId","courseId","updatedAt") VALUES(1,3688,1,now()),(2,3689,1,now());
    INSERT INTO "AppNotification"(id,"eventKey","recipientId",kind,title) VALUES('notice','original-key:3688',3688,'REQUEST_RECEIVED','Notice');
    INSERT INTO "CrmRequest"(id,key,"ownerId","userId",category,content,name,source,"ipHash","updatedAt",history) VALUES('request','r',3688,3689,'SUPPORT','Keep text 3688','Member','WEB','h',now(),'[{"changedBy":3688,"ownerId":3689,"content":"3688"}]');
    INSERT INTO "SystemConfig"(key,value) VALUES('wi300:learning-hidden:3688:1','true');`)
  const doc={createdUsers:[{id:3688,name:'Keep text 3688'},{id:3689}],createdEnrollments:[{userId:3688,courseId:1},{userId:3689,courseId:1}],modifiedUsers:[{userId:3689,field:'phone',oldValue:'3688',newValue:'hello'}]}
  await db.exec(`INSERT INTO brk_wallet(id,"userId",balance,brkd,"voucherBalance","updatedAt") VALUES(1,3688,125000.50,42.25,100,now());
    INSERT INTO brk_transaction(id,"walletId",amount,type,description,"balanceBefore","balanceAfter","sourceMemberId") VALUES(1,1,25000,'COMMISSION','Keep money',100000.50,125000.50,3689)`)
  await db.query(`INSERT INTO "BulkImportLog"(id,"courseId","userId",summary) VALUES('string-log',1,0,$1::jsonb),('object-log',1,0,$2::jsonb)`,[JSON.stringify(JSON.stringify(doc)),JSON.stringify(doc)])
  let before=await preview()
  ok(before.accounts.every(a=>!a.occupied&&!a.reserved&&!a.retired&&!a.missing),'Preview validates both target IDs')
  ok(before.bulkLogs.every(l=>l.createdUsers===2),'Preview understands JSON strings and JSON objects')
  ok((await db.query('SELECT count(*)::int n FROM "SystemConfig"')).rows[0].n===1,'Dry run has no writes')
  await db.exec(`INSERT INTO "User"(id,email,"updatedAt") VALUES(3690,'new-during-work@test',now())`)
  await runFail(executeSql(mapping,before.fingerprint,0),/User data changed/)
  ok((await db.query('SELECT count(*)::int n FROM "User" WHERE id IN (3688,3689)')).rows[0].n===2,'Concurrent registration aborts before any rename')
  await db.exec(`DELETE FROM "User" WHERE id=3690`)
  before=await preview()
  await db.exec(`INSERT INTO "BulkImportLog"(id,"courseId","userId",summary) VALUES('bad',1,0,'{"unknownIds":[3688]}')`)
  await runFail(executeSql(mapping,before.fingerprint,0),/Unsupported bulk snapshot/)
  ok((await db.query('SELECT "userId" FROM "Enrollment" WHERE id=1')).rows[0].userId===3688,'Failure rolls back related data')
  ok(JSON.parse((await db.query('SELECT summary FROM "BulkImportLog" WHERE id=\'string-log\'')).rows[0].summary).createdUsers[0].id===3688,'Earlier bulk updates roll back')
  await db.exec(`DELETE FROM "BulkImportLog" WHERE id='bad'`)
  await db.exec(executeSql(mapping,(await preview()).fingerprint,0))
  ok((await db.query('SELECT count(*)::int n FROM "User"')).rows[0].n===5,'Account count unchanged')
  ok((await db.query('SELECT "referrerId" FROM "User" WHERE id=1714')).rows[0].referrerId===1713,'Referral stays attached to the same person')
  ok((await db.query('SELECT "userId" FROM "Enrollment" WHERE id=1')).rows[0].userId===1713,'Enrollment cascades')
  const wallet=(await db.query('SELECT * FROM brk_wallet')).rows[0], transaction=(await db.query('SELECT * FROM brk_transaction')).rows[0]
  ok(wallet.userId===1713&&Number(wallet.balance)===125000.50&&Number(wallet.brkd)===42.25&&Number(wallet.voucherBalance)===100,'Wallet owner follows the account; all balances are unchanged')
  ok(transaction.sourceMemberId===1714&&Number(transaction.amount)===25000&&Number(transaction.balanceAfter)===125000.50,'Transaction attribution changes while financial amounts are preserved')
  ok((await db.query('SELECT "recipientId","eventKey" FROM "AppNotification"')).rows[0].recipientId===1713,'Notification ownership cascades')
  ok((await db.query('SELECT "eventKey" FROM "AppNotification"')).rows[0].eventKey==='original-key:3688','Event identity is preserved')
  const request=(await db.query('SELECT * FROM "CrmRequest"')).rows[0]
  ok(request.userId===1714&&request.ownerId===1713,'Manual CRM IDs are remapped')
  ok(request.history[0].changedBy===1713&&request.history[0].ownerId===1714&&request.history[0].content==='3688','Only typed history IDs are remapped')
  const logs=(await db.query('SELECT id,summary FROM "BulkImportLog" ORDER BY id')).rows
  for(const log of logs){const data=typeof log.summary==='string'?JSON.parse(log.summary):log.summary;ok(data.createdUsers[0].id===1713&&data.createdEnrollments[1].userId===1714&&data.modifiedUsers[0].userId===1714,'Bulk rollback IDs are remapped');ok(data.createdUsers[0].name==='Keep text 3688'&&data.modifiedUsers[0].oldValue==='3688','Free text and former field values are preserved')}
  ok(typeof logs.find(l=>l.id==='string-log').summary==='string','Legacy snapshot representation is preserved')
  ok((await db.query(`SELECT value FROM "SystemConfig" WHERE key='user-id-allocation:normal-cursor'`)).rows[0].value===1714,'Normal cursor set to last restored ID')
  ok((await db.query('SELECT count(*)::int n FROM "ReservedId" WHERE id IN (3688,3689)')).rows[0].n===2,'Old IDs cannot be reassigned to another account')
  ok((await db.query(`SELECT value FROM "SystemConfig" WHERE key='wi300:learning-hidden:1713:1'`)).rows[0].value===true,'Learning preference follows the account')
  await runFail(executeSql(mapping,before.fingerprint,0),/User data changed/)
  console.log('Normal ID recovery: '+checks+' checks passed; isolated PostgreSQL only.')
}
main().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>db.close())
