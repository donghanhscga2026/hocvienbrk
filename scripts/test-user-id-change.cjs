/* Real PostgreSQL transaction checks in disposable memory; no production connection. */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process'), ts = require('typescript')
const { PGlite } = require('@electric-sql/pglite')
const root = path.resolve(__dirname, '..'), db = new PGlite()
process.env.AUTH_SECRET = 'isolated-member-id-tests-only'
let checks = 0, failWrite = false, writes = 0
const ok = (condition, label) => { assert.ok(condition, label); checks++ }
const quote = s => '"' + s.replace(/"/g, '""') + '"'
const query = async (text, values = []) => (await db.query(text, values)).rows
function model(table) {
  const filter = where => {
    const values = [], parts = Object.entries(where || {}).map(([key, value]) => {
      if (value && typeof value === 'object' && 'startsWith' in value) { values.push(value.startsWith + '%'); return quote(key) + ' LIKE $' + values.length }
      values.push(value); return quote(key) + '=$' + values.length
    })
    return { values, sql: parts.join(' AND ') || 'TRUE' }
  }
  const methods = {
    findMany: async ({where, orderBy} = {}) => { const w = filter(where); return query('SELECT * FROM ' + quote(table) + ' WHERE ' + w.sql + (orderBy ? ' ORDER BY ' + quote(Object.keys(orderBy)[0]) : ''), w.values) },
    findUnique: async args => (await methods.findMany(args))[0] || null,
    create: async ({data}) => {
      writes++
      const entries = Object.entries(data), values = entries.map(([k,v]) => k === 'value' ? JSON.stringify(v) : v)
      return (await query('INSERT INTO ' + quote(table) + '(' + entries.map(([k]) => quote(k)).join(',') + ') VALUES (' + entries.map((_,i) => '$' + (i+1)).join(',') + ') RETURNING *', values))[0]
    },
    upsert: async ({where, create}) => await methods.findUnique({where}) || methods.create({data:create}),
    deleteMany: async ({where}) => { writes++; const w = filter(where); const result = await db.query('DELETE FROM ' + quote(table) + ' WHERE ' + w.sql, w.values); return {count:result.affectedRows} },
  }
  return methods
}
const adapter = {
  user:model('User'), systemConfig:model('SystemConfig'), reservedId:model('ReservedId'), crmRequest:model('CrmRequest'),
  $queryRaw: async sql => query(sql.text, sql.values),
  $executeRaw: async sql => {
    if (/^(UPDATE|INSERT|DELETE)/.test(sql.text)) writes++
    if (failWrite && sql.text.startsWith('UPDATE public."CrmRequest"')) throw new Error('Injected CRM failure')
    return (await db.query(sql.text, sql.values)).affectedRows
  },
  $transaction: async callback => {
    await db.exec('BEGIN')
    try { const result = await callback(adapter); await db.exec('COMMIT'); return result }
    catch (error) { await db.exec('ROLLBACK'); throw error }
  },
}
const mod = {exports:{}}
const ids = {exports:{}}
new Function('require','exports','module',ts.transpileModule(fs.readFileSync(path.join(root,'lib/id-helper.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText)(name=>name==='./prisma'?{__esModule:true,default:adapter}:require(name),ids.exports,ids)
new Function('require','exports','module',ts.transpileModule(fs.readFileSync(path.join(root,'lib/user-id-change.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText)(name=>name==='./id-helper'?ids.exports:require(name),mod.exports,mod)
const {changeUserId,parseUserId} = mod.exports
const input = {currentId:'3698',newId:'3687'}
const rejects = async (fn, pattern, label) => { await assert.rejects(fn, pattern); checks++ }
async function main() {
  const schema = execFileSync(path.join(root,'node_modules/.bin/prisma'), ['migrate','diff','--from-empty','--to-schema-datamodel',path.join(root,'prisma/schema.prisma'),'--script'], {encoding:'utf8',env:{...process.env,DATABASE_URL:'postgresql://test:test@localhost/test',DIRECT_URL:'postgresql://test:test@localhost/test'}})
  await db.exec(schema)
  await db.exec(`ALTER TABLE "AppNotification" ALTER COLUMN id SET DEFAULT gen_random_uuid()::text`)
  const original = fs.readFileSync(path.join(root,'prisma/migrations/20261002020627_crm_notifications/migration.sql'),'utf8')
  for (const name of ['crm_request_notification','crm_task_reassignment_notification']) {
    const start = original.indexOf('CREATE FUNCTION public.' + name), end = original.indexOf('\n$$;',start)+4
    await db.exec(original.slice(start,end))
    const trigger = original.indexOf('CREATE TRIGGER ' + name), triggerEnd = original.indexOf(';',trigger)+1
    await db.exec(original.slice(trigger,triggerEnd))
  }
  await db.exec(`ALTER TABLE "AppNotification" DROP CONSTRAINT "AppNotification_recipientId_fkey";
    ALTER TABLE "AppNotification" ADD CONSTRAINT "AppNotification_recipientId_fkey" FOREIGN KEY("recipientId") REFERENCES "User"(id) ON DELETE CASCADE;
    ALTER TABLE "CrmForm" DROP CONSTRAINT "CrmForm_ownerId_fkey";
    ALTER TABLE "CrmForm" ADD CONSTRAINT "CrmForm_ownerId_fkey" FOREIGN KEY("ownerId") REFERENCES "User"(id) ON DELETE RESTRICT;
    INSERT INTO "User"(id,email,name,role,"updatedAt") VALUES(0,'admin@test','Admin','ADMIN',now()),(3698,'member@test','Member','TEACHER',now()),(2689,'other@test','Other','STUDENT',now());
    INSERT INTO "AppNotification"(id,"eventKey","recipientId",kind,title) SELECT 'notice-'||n,'event-'||n,3698,'REQUEST_RECEIVED','Test' FROM generate_series(1,19)n;
    INSERT INTO "CrmRequest"(id,key,"ownerId","userId",category,content,name,source,"ipHash","updatedAt",history) VALUES('request','request',3698,3698,'SUPPORT','Keep 3698 in free text','Member','WEB','hash',now(),'[{"changedBy":3698,"ownerId":3698,"content":"3698"}]');
    INSERT INTO "SystemConfig"(key,value) VALUES('wi300:learning-hidden:3698:10','true');
    INSERT INTO "ReservedId"(id,note) VALUES(3687,'Nice number');`)
  await db.exec(`INSERT INTO "SiteProfile"(id,"userId",slug,"updatedAt") VALUES(1,3698,'member',now());
    INSERT INTO "CrmForm"(id,"ownerId","profileId",name,config,"updatedAt") VALUES('form',3698,1,'Form','{}',now());
    INSERT INTO "Course"(id,id_khoa,name_lop,"teacherId","updatedAt") VALUES(1,'course','Course',3698,now());
    INSERT INTO "Enrollment"(id,"userId","courseId","updatedAt") VALUES(10,3698,1,now());`)
  await db.exec(`INSERT INTO "CrmContact"(id,name,"ownerId","createdBy","updatedAt") VALUES(1,'Member',3698,3698,now());
    INSERT INTO "CrmTask"(id,"contactId",title,"dueAt","createdBy") VALUES(1,1,'Care',now(),3698);`)
  await db.exec(`DELETE FROM "AppNotification" WHERE id NOT LIKE 'notice-%'`)
  await db.exec(`SELECT setval(pg_get_serial_sequence('"User"','id'),10000,true)`)
  const baseline = writes
  const blocked = await changeUserId(adapter,0,input)
  ok(blocked.plan.blockers.some(b=>b.includes('AppNotification')), '19 notifications block before FK repair')
  ok(blocked.plan.blockers.some(b=>b.includes('CrmForm')), 'Form ownership blocks before FK repair')
  ok(!blocked.plan.token, 'Blocked preview has no execution token')
  ok(writes === baseline, 'Preview has no database writes')
  for (const value of ['0','-1','1.5','1abc','2147483648',' 3698','']) { assert.throws(()=>parseUserId(value)); checks++ }
  await rejects(()=>changeUserId(adapter,2689,input),/quản trị/,'Non-admin rejected')
  await rejects(()=>changeUserId(adapter,0,{...input,currentId:'11111'}),/Không tìm/,'Missing member rejected')
  await rejects(()=>changeUserId(adapter,0,{...input,newId:'2689'}),/thành viên khác/,'Occupied ID rejected')
  await rejects(()=>changeUserId(adapter,0,{...input,newId:'3698'}),/khác/,'Same ID rejected')
  await rejects(()=>changeUserId(adapter,0,{...input,execute:true}),/kiểm tra/,'Execution requires preview')
  await db.exec(fs.readFileSync(path.join(root,'database/patches/user-id-update-cascade.sql'),'utf8'))
  const fks = await query(`SELECT conname,confupdtype,confdeltype FROM pg_constraint WHERE conname IN ('AppNotification_recipientId_fkey','CrmForm_ownerId_fkey') ORDER BY conname`)
  ok(fks.every(f=>f.confupdtype==='c'),'Both FK update rules repaired')
  ok(fks[0].confdeltype==='c' && fks[1].confdeltype==='r','Original delete behavior preserved')
  ok(Number((await query('SELECT count(*) n FROM "AppNotification"'))[0].n)===19,'Patch preserves notifications')
  let preview = await changeUserId(adapter,0,input)
  ok(!!preview.plan.token && !preview.plan.blockers.length,'Valid preview after patch')
  await rejects(()=>changeUserId(adapter,0,{...input,execute:true,token:preview.plan.token+'x'}),/hết hạn/,'Forged token rejected')
  await rejects(()=>changeUserId(adapter,0,{...input,newId:'3688',execute:true,token:preview.plan.token}),/hết hạn/,'Token bound to proposed ID')
  const crypto=require('node:crypto'),parts=preview.plan.token.split(':')
  parts[1]=String(Date.now()-1000)
  const expiredPayload=parts.slice(0,3).join(':')
  parts[3]=crypto.createHmac('sha256',process.env.AUTH_SECRET).update('user-id-change:'+expiredPayload).digest('hex')
  await rejects(()=>changeUserId(adapter,0,{...input,execute:true,token:parts.join(':')}),/hết hạn/,'Expired signed preview rejected')
  await db.exec(`UPDATE "CrmRequest" SET history=history || '[{"changedBy":3698,"ownerId":3698}]'::jsonb`)
  await rejects(()=>changeUserId(adapter,0,{...input,execute:true,token:preview.plan.token}),/hết hạn/,'Changed history invalidates preview')
  preview = await changeUserId(adapter,0,input)
  failWrite=true
  await rejects(()=>changeUserId(adapter,0,{...input,execute:true,token:preview.plan.token}),/Injected/,'Injected failure rolls back')
  failWrite=false
  ok(!!await adapter.user.findUnique({where:{id:3698}}) && !await adapter.user.findUnique({where:{id:3687}}),'User ID rolled back')
  ok(Number((await query('SELECT count(*) n FROM "AppNotification" WHERE "recipientId"=3698'))[0].n)===19,'Notification cascade rolled back')
  preview = await changeUserId(adapter,0,input)
  const result = await changeUserId(adapter,0,{...input,execute:true,token:preview.plan.token})
  ok(result.completed,'Confirmed rename succeeds')
  ok((await query('SELECT "ownerId" FROM "CrmForm"'))[0].ownerId===3687,'Form ownership cascades')
  ok((await query('SELECT "userId" FROM "Enrollment"'))[0].userId===3687,'Course enrollment cascades')
  ok((await query('SELECT "teacherId" FROM "Course"'))[0].teacherId===3687,'Teaching courses cascade')
  ok((await query('SELECT "ownerId","createdBy" FROM "CrmContact"'))[0].ownerId===3687,'CRM ownership cascades without reassignment notifications')
  ok(!await adapter.user.findUnique({where:{id:3698}}) && !!await adapter.user.findUnique({where:{id:3687}}),'3698 becomes 3687')
  const request = (await query('SELECT * FROM "CrmRequest"'))[0]
  ok(request.userId===3687 && request.ownerId===3687,'CRM member and owner remain attached')
  ok(request.history[0].changedBy===3687 && request.history[0].ownerId===3687,'Typed history IDs updated')
  ok(request.content.includes('3698') && request.history[0].content==='3698','Free text preserved')
  ok(Number((await query('SELECT count(*) n FROM "AppNotification" WHERE "recipientId"=3687'))[0].n)===19,'Notifications preserved and moved without new messages')
  ok(!!await adapter.systemConfig.findUnique({where:{key:'wi300:learning-hidden:3687:10'}}),'WI300 preferences moved')
  ok(!!await adapter.reservedId.findUnique({where:{id:3698}}) && !!await adapter.reservedId.findUnique({where:{id:3687}}),'Old ID retired; assigned special ID stays excluded')
  ok(!!await adapter.user.findUnique({where:{id:2689}}),'2689 untouched')
  await rejects(()=>changeUserId(adapter,0,{currentId:'3687',newId:'3698'}),/cấp lại/,'Retired ID cannot be reused')
  const seq = Number((await query(`SELECT nextval(pg_get_serial_sequence('"User"','id')) n`))[0].n)
  ok(seq>10000,'Automatic sequence never rewound')
  preview=await changeUserId(adapter,0,{currentId:'3687',newId:'20000'})
  await changeUserId(adapter,0,{currentId:'3687',newId:'20000',execute:true,token:preview.plan.token})
  ok((await adapter.systemConfig.findUnique({where:{key:ids.exports.NORMAL_USER_ID_CURSOR_KEY}})).value===3698,'Special rename never advances normal cursor')
  ok(await ids.exports.getNextAvailableId(adapter)===3699,'Next normal registration ignores the high special ID')
  ok(Number((await query(`SELECT nextval(pg_get_serial_sequence('"User"','id')) n`))[0].n)>20000,'High ID advances automatic sequence')
  await db.exec(`UPDATE "CrmRequest" SET status='IN_PROGRESS',version=2`)
  ok(Number((await query('SELECT count(*) n FROM "AppNotification"'))[0].n)===20,'Normal CRM updates still notify after maintenance transaction')
  await db.exec(`INSERT INTO "BulkImportLog"(id,"courseId","userId",summary) VALUES('log',1,0,'{"createdUserIds":[20000]}')`)
  const financialBlocked=await changeUserId(adapter,0,{currentId:'20000',newId:'20001'})
  ok(financialBlocked.plan.blockers.some(b=>b.includes('hoàn tác')) && !financialBlocked.plan.token,'Rollback snapshots fail closed for separate review')
  // Kiểm tra biên server action: session, phạm vi tên miền và payload xác nhận.
  const source=ts.createSourceFile('actions.ts',fs.readFileSync(path.join(root,'app/actions/admin-actions.ts'),'utf8'),ts.ScriptTarget.Latest,true)
  const action=source.statements.find(node=>ts.isFunctionDeclaration(node) && node.name?.text==='changeUserIdAction')
  let session=null,domain=null,calls=0,captured=null,refreshes=[]
  const actions={}
  const actionCode=ts.transpileModule(action.getText(source),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
  new Function('auth','prisma','domainContext','changeUserId','UserIdChangeError','Prisma','revalidatePath','exports',actionCode)(
    async()=>session,adapter,async()=>domain,async(...args)=>{calls++;captured=args;return {message:'Success',completed:true}},
    mod.exports.UserIdChangeError,require('@prisma/client').Prisma,(...args)=>refreshes.push(args),actions)
  const form=new FormData();form.set('currentId','3698');form.set('newId','3687')
  ok((await actions.changeUserIdAction({},form)).message.startsWith('Error') && calls===0,'Anonymous action cannot reach identity helper')
  session={user:{id:'0',role:'ADMIN'}};domain={hostname:'expert.test'}
  ok((await actions.changeUserIdAction({},form)).message.startsWith('Error') && calls===0,'Expert domain cannot rename global identities')
  domain=null
  await actions.changeUserIdAction({},form)
  ok(captured[1]===0 && captured[2].execute===false,'Admin zero and default preview reach helper correctly')
  form.set('mode','execute');form.set('token','review-token')
  await actions.changeUserIdAction({},form)
  ok(captured[2].execute===true && captured[2].token==='review-token','Explicit confirmation and preview token forwarded')
  ok(refreshes.some(args=>args[0]==='/tools/reserved-ids'),'Actual management route refreshed')

  // Kiểm tra HTML của form với cùng trạng thái mà server action trả về.
  const React=require('react'),render=require('react-dom/server').renderToStaticMarkup
  let uiState={message:''},pending=false
  const component={exports:{}}
  const uiCode=ts.transpileModule(fs.readFileSync(path.join(root,'app/tools/reserved-ids/components/ChangeUserIdForm.tsx'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText
  new Function('require','exports','module',uiCode)(name=>name==='react'?{...React,useActionState:()=>[uiState,'/test',pending],useState:(()=>{let n=0;return ()=>[(n++%2===0?'3698':'3687'),()=>{}]})()}:name==='@/app/actions/admin-actions'?{changeUserIdAction:()=>{}}:require(name),component.exports,component)
  let html=render(React.createElement(component.exports.ChangeUserIdForm))
  ok(html.includes('Kiểm tra trước') && !html.includes('Xác nhận đổi'),'Initial form exposes preview only')
  uiState={message:'Checked',plan:{currentId:3698,newId:3687,name:'Member',email:'member@test',blockers:[],counts:[],token:'signed'}}
  html=render(React.createElement(component.exports.ChangeUserIdForm))
  ok(html.includes('Xác nhận đổi') && html.includes('value="execute"'),'Reviewed form exposes explicit execute control')
  uiState.plan.newId=3688
  ok(!render(React.createElement(component.exports.ChangeUserIdForm)).includes('Xác nhận đổi'),'Changed input cannot execute old preview')
  uiState.plan.newId=3687;uiState.plan.blockers=['Database patch required']
  ok(!render(React.createElement(component.exports.ChangeUserIdForm)).includes('Xác nhận đổi'),'Blocked preview cannot execute')
  pending=true;uiState.plan.blockers=[]
  ok(render(React.createElement(component.exports.ChangeUserIdForm)).includes('disabled=""'),'Pending action disables confirmation')
  console.log('Member ID change: '+checks+' checks passed; isolated PostgreSQL only.')
}
main().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>db.close())
