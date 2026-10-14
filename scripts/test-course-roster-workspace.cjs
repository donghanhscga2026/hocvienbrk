// Exercises the actual roster actions with a fake database. No live data is read or changed.
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript'), assert = require('node:assert/strict')
const repo = path.resolve(__dirname, '..')
function load(file) {
  const module = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(path.join(repo,file),'utf8'), { compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022} }).outputText
  new Function('require','module','exports',code)(name=>name.startsWith('./')?load(path.posix.join(path.posix.dirname(file),name+'.ts')):require(name),module,module.exports)
  return module.exports
}
async function run() {
  const deadline=load('lib/course/deadline.ts')
  let session={user:{id:'0',role:'ADMIN'}}, role='ADMIN', enrolled=true, seen
  const lessons=[{id:'l1',order:1,title:'One'},{id:'l2',order:2,title:'Two'}]
  const base=new Date('2026-10-12T00:00:00Z'), submittedAt=new Date('2026-10-12T16:59:00Z')
  const entries=[{id:1,status:'ACTIVE',memberRole:'TV',team:1,group:1,startedAt:base,activatedAt:base,createdAt:base,user:{id:101,name:'Fixture',phone:'0901234567',email:'fixture@example.invalid',image:null},lessonProgress:[{lessonId:'l1',submittedAt,status:'COMPLETED',scores:{timing:1}},{lessonId:'l2',submittedAt:new Date('2026-10-13T23:00:00Z'),status:'RESET'}]},{id:2,status:'PENDING',memberRole:'TV',team:1,group:1,startedAt:null,activatedAt:null,createdAt:base,user:{id:102,name:'Pending',phone:null,email:'pending@example.invalid',image:null},lessonProgress:[]}]
  const db={user:{findUnique:async()=>({role})},course:{findUnique:async()=>({id:1,teacherId:8,name_lop:'Fixture course',id_khoa:'TEST',memberLabels:{}})},lesson:{findMany:async()=>lessons},enrollment:{findUnique:async()=>enrolled?{status:'ACTIVE'}:null,findMany:async({where})=>{seen=where;return entries.filter(entry=>typeof where.status==='string'?entry.status===where.status:where.status.in.includes(entry.status))}}}
  const text=fs.readFileSync(path.join(repo,'app/actions/admin-actions.ts'),'utf8'), ast=ts.createSourceFile('actions.ts',text,ts.ScriptTarget.Latest,true)
  const names=new Set(['computeDayStatus','checkCourseRosterAccess','buildCourseRoster','getCourseMemberRosterAction'])
  const functions=ast.statements.filter(node=>ts.isFunctionDeclaration(node)&&names.has(node.name?.text)).map(node=>node.getText(ast)).join('\n')
  assert.equal(functions.match(/function /g).length,4)
  const code=ts.transpileModule(functions+'\nexport {getCourseMemberRosterAction}',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
  const module={exports:{}}
  new Function('auth','prisma','Role','computeCurrentDayOrder','computeLessonDeadlineUTC','module','exports',code)(async()=>session,db,require('@prisma/client').Role,deadline.computeCurrentDayOrder,deadline.computeLessonDeadlineUTC,module,module.exports)
  const roster=module.exports.getCourseMemberRosterAction
  let result=await roster(1,true)
  assert.equal(result.success,true);assert.equal(result.members.length,2);assert.deepEqual(seen.status.in,['ACTIVE','PENDING'])
  assert.equal(result.members[0].submittedCount,1,'RESET does not inflate submission count')
  assert.equal(result.members[0].lastSubmittedAt.toISOString(),submittedAt.toISOString())
  assert.equal(result.members[0].days[1].submitted,false,'An overdue day without a current submission is not counted as submitted')
  assert.equal(result.members[1].days.length,0,'Pending enrollment has no overdue learning days')
  assert.equal(result.members[1].completionPercent,null);assert.equal(result.members[0].user.email,'fixture@example.invalid')
  role='STUDENT';result=await roster(1,true)
  assert.equal(result.canViewPhone,false);assert.equal(result.members.length,1,'Student cannot request pending/private registrations')
  assert.equal(result.members[0].user.email,null);assert.equal(result.members[0].user.phone,null,'Stale admin session is not authorization')
  role='TEACHER';session={user:{id:'8',role:'STUDENT'}};result=await roster(1,true);assert.equal(result.canViewPhone,true,'Fresh owner role is used')
  session={user:{id:'9',role:'TEACHER'}};enrolled=false;result=await roster(1,true);assert.equal(result.success,false)
  session=null;assert.equal((await roster(1,true)).success,false)
  console.log('PASS roster privacy and progress: fresh admin/owner role, hidden contacts and pending registrations, RESET exclusion, factual submissions and unchanged deadlines')
}
run().catch(error=>{console.error(error);process.exitCode=1})
