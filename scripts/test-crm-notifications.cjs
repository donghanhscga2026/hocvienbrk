const fs = require('node:fs'); const assert = require('node:assert/strict')
const { PGlite } = require('@electric-sql/pglite')
const path = require('node:path'); const os = require('node:os'); const { execFileSync } = require('node:child_process')
const repo = path.resolve(__dirname, '..')
// Cơ sở dữ liệu trong bộ nhớ; không đọc DATABASE_URL hay ghi lên Supabase.
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'crm-notifications-'))
const baseSchema = path.join(temp, 'base.prisma')
fs.writeFileSync(baseSchema, execFileSync('git', ['show', '82be73914e1e9bda3fb157d26670b21c6fe72e6e:prisma/schema.prisma'], { cwd: repo }))
const baseSql = execFileSync(process.execPath, [path.join(repo, 'node_modules/prisma/build/index.js'), 'migrate', 'diff', '--from-empty', '--to-schema-datamodel', baseSchema, '--script'], { cwd: repo, encoding: 'utf8' })
const ts = require(repo + '/node_modules/typescript')
const Prisma = require(repo + '/node_modules/@prisma/client')
const db = new PGlite(); let checks = 0
const ok = (condition, message) => { assert.ok(condition, message); checks++ }
const q = async (sql, values = []) => (await db.query(sql, values)).rows
const count = async (where = 'TRUE') => Number((await q('SELECT count(*) n FROM public."AppNotification" WHERE ' + where))[0].n)
class CrmError extends Error { constructor(message, status = 400) { super(message); this.status = status } }
const fake = {
  $queryRaw: query => q(query.text, query.values),
  $executeRaw: async query => (await db.query(query.text, query.values)).affectedRows,
  $transaction: promises => Promise.all(promises),
}
const m = { exports: {} }
new Function('require', 'exports', 'module', ts.transpileModule(fs.readFileSync(repo + '/lib/app-notifications.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(name => {
  if (name === '@prisma/client') return Prisma
  if (name === '@/auth') return { auth: async () => null }
  if (name === '@/lib/prisma') return { default: fake }
  if (name === '@/lib/crm/service') return { CrmError }
  throw new Error(name)
}, m.exports, m)
const feed = m.exports
const actor = (id, role = 'STUDENT') => ({ id, role, email: id + '@test.invalid' })
const visible = async (id, role) => (await feed.readNotifications(actor(id, role), 1)).notifications

async function run() {
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;')
  await db.exec(baseSql)
  await db.exec(`INSERT INTO public."User" (id,email,role,"updatedAt") VALUES (0,'0@test.invalid','ADMIN',now()),(1,'1@test.invalid','TEACHER',now()),(2,'2@test.invalid','TEACHER',now()),(3,'3@test.invalid','STUDENT',now()),(4,'4@test.invalid','STUDENT',now());
    INSERT INTO public."Course" (id,id_khoa,name_lop,"teacherId","updatedAt") VALUES (10,'test-course','Test course',1,now()),(20,'other-course','Other course',2,now());
    INSERT INTO public."Lesson" (id,title,"courseId","order") VALUES ('lesson-a','Lesson A',10,1),('lesson-b','Lesson B',20,1);
    INSERT INTO public."Enrollment" (id,"userId","courseId",status,"updatedAt") VALUES (100,3,10,'ACTIVE',now());
    INSERT INTO public."CrmRequest" (id,key,"ownerId","courseId","userId",category,content,name,source,"ipHash",resolution,"updatedAt") VALUES ('old-request','old-key',1,10,3,'LEARNING','Old content','Student','Lesson','hash','Private old note',now());`)
  const oldData = JSON.stringify(await q('SELECT id,content,resolution,status,version FROM public."CrmRequest"'))
  await db.exec(fs.readFileSync(repo + '/prisma/migrations/20261002020627_crm_notifications/migration.sql', 'utf8'))
  ok(await count() === 0, 'No historic notification backfill')
  ok(oldData === JSON.stringify(await q('SELECT id,content,resolution,status,version FROM public."CrmRequest"')), 'Historic request data preserved')
  ok((await q(`SELECT "publicReply" FROM public."CrmRequest" WHERE id='old-request'`))[0].publicReply === '', 'Private note never becomes public reply')
  await db.exec(`INSERT INTO public."CrmRequest" (id,key,"ownerId","courseId","userId","lessonId",category,content,name,source,"ipHash","updatedAt") VALUES ('req-a','key-a',1,10,3,'lesson-a','LEARNING','Question','Student','Lesson','hash',now());`)
  ok(await count() === 2, 'One incoming and one receipt notification')
  ok((await visible(1, 'TEACHER')).length === 1, 'Correct teacher receives request')
  ok((await visible(2, 'TEACHER')).length === 0, 'Other teacher sees nothing')
  ok((await visible(3)).length === 1, 'Sender receives acknowledgment')
  ok((await visible(4)).length === 0, 'Other student sees nothing')
  await db.exec(`UPDATE public."CrmRequest" SET resolution='Private only',version=2 WHERE id='req-a'`)
  ok(await count() === 2, 'Internal note creates no public response')
  await db.exec(`UPDATE public."CrmRequest" SET status='IN_PROGRESS',version=3 WHERE id='req-a'`)
  ok(await count() === 3, 'Progress update notifies student')
  await db.exec(`UPDATE public."CrmRequest" SET "publicReply"='Public answer',version=4 WHERE id='req-a'`)
  ok(await count() === 4, 'Public answer notifies student')
  await db.exec(`UPDATE public."CrmRequest" SET "publicReply"='Public answer',version=5 WHERE id='req-a'`)
  ok(await count() === 4, 'Same answer does not notify twice')
  await db.exec(`UPDATE public."CrmRequest" SET status='RESOLVED',version=6 WHERE id='req-a'`)
  ok(await count() === 5, 'Resolved notification')
  await db.exec(`UPDATE public."CrmRequest" SET status='NEW',version=7 WHERE id='req-a'`)
  ok(await count() === 7, 'Reopening notifies both parties')
  const studentRows = await visible(3)
  ok(studentRows.every(r => r.href === '/my-requests?request=req-a'), 'Student links to private request')
  ok((await visible(1, 'TEACHER')).every(r => r.href === '/tools/crm?view=requests&request=req-a'), 'Teacher links to exact request')
  ok(!JSON.stringify(studentRows).includes('Private only'), 'Feed excludes internal notes')
  const incoming = (await visible(1, 'TEACHER'))[0]
  await feed.markNotifications(actor(3), [incoming.id])
  ok((await visible(1, 'TEACHER')).find(r => r.id === incoming.id).readAt == null, 'Cannot mark another user notification')
  await feed.markNotifications(actor(3), null)
  ok((await feed.readNotifications(actor(3), 1)).unread === 0, 'Own mark-all persists')
  await db.exec(`UPDATE public."Course" SET "teacherId"=2 WHERE id=10`)
  ok((await visible(1, 'TEACHER')).length === 0, 'Former teacher access revoked immediately')
  await db.exec(`UPDATE public."Course" SET "teacherId"=1 WHERE id=10`)
  ok((await visible(1, 'STUDENT')).length === 0, 'Revoked CRM role cannot read old teacher notifications')
  await db.exec(`INSERT INTO public."CrmRequest" (id,key,category,content,name,source,"ipHash","updatedAt") VALUES ('guest','guest-key','CONSULTATION','Question','Guest','Website','hash',now());`)
  ok((await visible(0, 'ADMIN')).length === 1, 'Unassigned request reaches admin including ID zero')
  await db.exec(`UPDATE public."CrmRequest" SET "ownerId"=2,version=2 WHERE id='guest'`)
  ok((await visible(0, 'ADMIN')).length === 0, 'Admin inbox removes assigned general request')
  ok((await visible(2, 'TEACHER')).some(r => r.href.includes('guest')), 'Assigned teacher receives general request')
  await db.exec(`INSERT INTO public."Enrollment" (id,"userId","courseId",status,"updatedAt") VALUES (101,4,10,'PENDING',now());`)
  ok((await visible(1, 'TEACHER')).some(r => r.kind === 'ENROLLMENT_TEACHER'), 'Registration notifies course teacher')
  ok((await visible(4)).some(r => r.kind === 'ENROLLMENT_RECEIVED'), 'Pending registration acknowledgment')
  ok(!(await visible(4)).some(r => r.kind === 'ENROLLMENT_ACTIVE'), 'No false active confirmation')
  await db.exec(`UPDATE public."Enrollment" SET status='ACTIVE' WHERE id=101`)
  ok((await visible(4)).some(r => r.kind === 'ENROLLMENT_ACTIVE'), 'Activation confirmation')
  const before = await count(); await db.exec(`UPDATE public."Enrollment" SET status='ACTIVE' WHERE id=101`)
  ok(await count() === before, 'Repeated ACTIVE does not duplicate notifications')
  await db.exec(`INSERT INTO public."LessonComment" (id,"lessonId","userId",content) VALUES (1,'lesson-a',3,'Question');
    INSERT INTO public."LessonComment" (id,"lessonId","userId",content,"parentId") VALUES (2,'lesson-a',1,'Answer',1);`)
  ok((await visible(3)).some(r => r.href === '/courses/test-course/learn?lesson=lesson-a'), 'Reply opens correct lesson')
  const commentCount = await count(); await db.exec(`INSERT INTO public."LessonComment" (id,"lessonId","userId",content,"parentId") VALUES (3,'lesson-a',3,'Self reply',1),(4,'lesson-b',2,'Wrong lesson',1);`)
  ok(await count() === commentCount, 'Self replies and cross-lesson references do not notify')
  await db.exec(`INSERT INTO public."CrmContact" (id,name,"ownerId","createdBy","updatedAt") VALUES (200,'Contact',1,1,now());
    INSERT INTO public."CrmTask" (id,"contactId",title,"dueAt","createdBy") VALUES (300,200,'Call back',now()+interval '1 day',1);`)
  ok(!(await visible(1, 'TEACHER')).some(r => r.kind === 'TASK_DUE'), 'Future reminder hidden')
  await db.exec(`UPDATE public."CrmTask" SET "dueAt"=now()-interval '1 minute' WHERE id=300`)
  const task = (await visible(1, 'TEACHER')).find(r => r.kind === 'TASK_DUE'); ok(!!task, 'Due reminder visible')
  await feed.markNotifications(actor(1, 'TEACHER'), [task.id])
  await db.exec(`UPDATE public."CrmTask" SET "dueAt"=now()-interval '2 minutes' WHERE id=300`)
  ok((await visible(1, 'TEACHER')).find(r => r.id === task.id).readAt == null, 'Rescheduling resets reminder read status')
  await db.exec(`UPDATE public."CrmContact" SET "ownerId"=2 WHERE id=200`)
  ok(!(await visible(1, 'TEACHER')).some(r => r.kind === 'TASK_DUE'), 'Previous owner cannot see reassigned task')
  ok((await visible(2, 'TEACHER')).some(r => r.kind === 'TASK_DUE'), 'New owner gets scheduled reminder')
  await db.exec(`UPDATE public."CrmTask" SET "completedAt"=now() WHERE id=300`)
  ok(!(await visible(2, 'TEACHER')).some(r => r.kind === 'TASK_DUE'), 'Completed task hidden')
  const perms = await q(`SELECT has_table_privilege('anon','public."AppNotification"','SELECT') anon,has_table_privilege('authenticated','public."AppNotification"','SELECT') auth,relrowsecurity rls FROM pg_class WHERE oid='public."AppNotification"'::regclass`)
  ok(!perms[0].anon && !perms[0].auth && perms[0].rls, 'Notification table private and RLS enabled')
  const publicFunctions = await q(`SELECT count(*) n FROM pg_proc WHERE proname IN ('crm_request_notification','crm_enrollment_notification','crm_comment_notification','crm_task_notification','crm_task_reassignment_notification') AND (prosecdef OR has_function_privilege('anon',oid,'EXECUTE') OR has_function_privilege('authenticated',oid,'EXECUTE'))`)
  ok(Number(publicFunctions[0].n) === 0, 'No public trigger RPC or security definer')
  // Kiểm tra API thật với adapter SQL của cơ sở dữ liệu thử nghiệm.
  const load = (path, aliases) => {
    const module = { exports: {} }
    new Function('require', 'exports', 'module', ts.transpileModule(fs.readFileSync(repo + '/' + path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(name => {
      if (name in aliases) return aliases[name]
      return require(repo + '/node_modules/' + name)
    }, module.exports, module)
    return module.exports
  }
  const http = load('lib/crm/http.ts', { './service': { CrmError } })
  let sessionUser = 3
  const authActor = async () => { if (sessionUser == null) throw new CrmError('Login',401); return actor(sessionUser) }
  const whereSql = where => {
    const keys = Object.keys(where)
    return { sql: keys.map((key,i) => 'r."' + key + '"=$' + (i+1)).join(' AND '), values: keys.map(key => where[key]) }
  }
  fake.crmRequest = {
    findMany: async ({where,select,take,skip}) => {
      const w = whereSql(where)
      const fields = Object.keys(select).filter(key => key !== 'course').map(key => 'r."' + key + '"')
      return q('SELECT ' + fields.join(',') + `, CASE WHEN c.id IS NULL THEN NULL ELSE json_build_object('name_lop',c.name_lop,'id_khoa',c.id_khoa) END AS course FROM public."CrmRequest" r LEFT JOIN public."Course" c ON c.id=r."courseId" WHERE ` + w.sql + ' ORDER BY r."createdAt" DESC,r.id DESC LIMIT ' + take + ' OFFSET ' + skip,w.values)
    },
    count: async ({where}) => { const w=whereSql(where); return Number((await q('SELECT count(*) n FROM public."CrmRequest" r WHERE ' + w.sql,w.values))[0].n) },
    findFirst: async ({where}) => { const w=whereSql(where); return (await q('SELECT * FROM public."CrmRequest" r WHERE ' + w.sql,w.values))[0] || null },
    updateMany: async ({where,data}) => {
      const w=whereSql(where)
      const result=await db.query('UPDATE public."CrmRequest" r SET status=$' + (w.values.length+1) + ',version=version+1,history=$' + (w.values.length+2) + '::jsonb WHERE ' + w.sql,[...w.values,data.status,JSON.stringify(data.history)])
      return {count:result.affectedRows}
    },
  }
  const route = load('app/api/my-requests/route.ts', { '@/lib/prisma': {default:fake}, '@/lib/crm/http':http, '@/lib/app-notifications':{notificationActor:authActor}, '@/lib/crm/service':{CrmError} })
  const ownId='00000000-0000-4000-8000-000000000003', otherId='00000000-0000-4000-8000-000000000004'
  await q(`INSERT INTO public."CrmRequest" (id,key,"ownerId","courseId","userId",category,content,name,source,"ipHash",resolution,"publicReply",status,"updatedAt") VALUES ($1,'api-own',1,10,3,'LEARNING','Own question','Student','Lesson','hash','SECRET INTERNAL','Public answer','RESOLVED',now()),($2,'api-other',1,10,4,'LEARNING','OTHER PRIVATE QUESTION','Other','Lesson','hash','OTHER SECRET','Other answer','RESOLVED',now())`,[ownId,otherId])
  const get = url => route.GET(new Request('https://test.invalid/api/my-requests' + (url || '')))
  let response=await get(); let payload=await response.json()
  ok(response.status===200 && payload.requests.some(r=>r.id===ownId), 'Own API request visible')
  ok(!payload.requests.some(r=>r.id===otherId), 'Student API cannot read another student request')
  ok(!JSON.stringify(payload).includes('SECRET') && !JSON.stringify(payload).includes('OTHER PRIVATE'), 'Student response strips internal notes and private rows')
  ok(payload.requests.find(r=>r.id===ownId).publicReply==='Public answer','Public answer visible')
  response=await get('?request='+otherId); payload=await response.json()
  ok(response.status===200 && payload.total===0, 'Guessing foreign ID returns no data')
  ok((await get('?page=-1')).status===400,'Invalid pagination rejected')
  ok((await get('?userId=4')).status===400,'Actor override query rejected')
  sessionUser=null; ok((await get()).status===401,'Anonymous request API rejected'); sessionUser=3
  const patch = (body,origin='https://test.invalid') => route.PATCH(new Request('https://test.invalid/api/my-requests',{method:'PATCH',headers:{'content-type':'application/json',origin},body:JSON.stringify(body)}))
  ok((await patch({id:otherId,version:1})).status===409,'Foreign reopen blocked')
  ok((await patch({id:ownId,version:1,userId:4})).status===400,'Body actor override rejected')
  ok((await patch({id:ownId,version:1},'https://evil.invalid')).status===403,'Cross-origin write rejected')
  const attempts=await Promise.all([patch({id:ownId,version:1}),patch({id:ownId,version:1})])
  ok(attempts.filter(r=>r.status===200).length===1 && attempts.filter(r=>r.status===409).length===1,'Concurrent reopen changes exactly once')
  const reopened=await q('SELECT status,version,resolution,"publicReply" FROM public."CrmRequest" WHERE id=$1',[ownId])
  ok(reopened[0].status==='NEW' && reopened[0].version===2 && reopened[0].resolution==='SECRET INTERNAL' && reopened[0].publicReply==='Public answer','Reopen preserves both response fields')
  const notificationRoute=load('app/api/notifications/route.ts',{'@/lib/crm/http':http,'@/lib/app-notifications':{...feed,notificationActor:authActor}})
  ok((await notificationRoute.PATCH(new Request('https://test.invalid/api/notifications',{method:'PATCH',headers:{origin:'https://evil.invalid','content-type':'application/json'},body:JSON.stringify({all:true})}))).status===403,'Notification writes require same origin')
  ok((await notificationRoute.GET(new Request('https://test.invalid/api/notifications?page=0'))).status===400,'Notification paging validated')
  sessionUser=null; ok((await notificationRoute.GET(new Request('https://test.invalid/api/notifications'))).status===401,'Anonymous notification API rejected')
  console.log(JSON.stringify({ assertions: checks, result: 'passed', testDatabase: 'disposable only' }))
  await db.close()
  fs.rmSync(temp, { recursive: true, force: true })
}
run().catch(e => { console.error(e); process.exitCode = 1 })
