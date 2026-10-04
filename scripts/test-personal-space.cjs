const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const source = fs.readFileSync(path.join(__dirname, '../app/my-space/page.tsx'), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText
function Header() {} function Space() {}
const course = id => ({ id, id_khoa: 'KH'+id, name_lop: 'Khóa '+id, phi_coc: 0, _count: { lessons: 2, enrollments: 3 } })
const rows = [1,2,3].map(id => ({ id, courseId: id, status: id===3?'PENDING':'ACTIVE', startedAt: null, lastLessonId: 'lesson-'+id, payment: null, course: course(id), _count: { lessonProgress: id===1?2:1 } }))
async function fixture(session, role='STUDENT', fail=false) {
  const calls=[]
  const db = {
    user: { findUnique: async args => {calls.push(['user',args]);return {id:7,name:'Học viên',phone:null,role}} },
    enrollment: { findMany: async args => {calls.push(['enrollments',args]);if(fail)throw Error('Database unavailable');return rows} },
    course: { findMany: async args => {calls.push(['teaching',args]);return [course(9)]} },
  }
  const exports={}
  vm.runInNewContext(compiled, {exports, console:{error(){}}, require(name) {
    if(name==='@/auth')return {auth:async()=>session}
    if(name==='@/lib/prisma')return {__esModule:true,default:db}
    if(name==='next/navigation')return {redirect:url=>{throw Error('REDIRECT:'+url)}}
    if(name==='@/components/layout/MainHeader')return {__esModule:true,default:Header}
    if(name==='@/components/home/PersonalSpace')return {__esModule:true,default:Space}
    return require(name)
  }})
  return {render:exports.default,calls}
}
function find(node, predicate) {
  if(!node||typeof node!=='object')return null
  if(predicate(node))return node
  const children=node.props?.children
  for(const child of Array.isArray(children)?children:[children]){const found=find(child,predicate);if(found)return found}
  return null
}
async function run() {
  let checks=0
  const guest=await fixture(null)
  await assert.rejects(guest.render(),/REDIRECT:.*my-space/);checks++
  assert.equal(guest.calls.length,0);checks++
  const student=await fixture({user:{id:'7',role:'ADMIN'}})
  const rendered=await student.render()
  const props=find(rendered,node=>node.type===Space).props
  assert.equal(student.calls.find(([key])=>key==='enrollments')[1].where.userId,7);checks++
  assert.equal(student.calls.some(([key])=>key==='teaching'),false);checks++
  assert.equal(props.user.role,'STUDENT');checks++
  assert.equal(props.enrollments[1].status,'COMPLETED');checks++
  assert.equal(props.enrollments[2].status,'ACTIVE');checks++
  assert.equal(props.enrollments[3].status,'PENDING');checks++
  assert.equal(props.continueHref,'/courses/KH2/learn?lesson=lesson-2');checks++
  const teacher=await fixture({user:{id:'7'}},'TEACHER')
  await teacher.render()
  assert.equal(teacher.calls.find(([key])=>key==='teaching')[1].where.teacherId,7);checks++
  const failed=await fixture({user:{id:'7'}},'STUDENT',true)
  const errorPage=await failed.render()
  assert.equal(find(errorPage,node=>node.type===Space),null);checks++
  assert.ok(find(errorPage,node=>node.props?.role==='alert'));checks++
  const toolsSource = fs.readFileSync(path.join(__dirname, '../app/tools/page.tsx'), 'utf8')
  const toolsCompiled = ts.transpileModule(toolsSource, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText
  function Public() {}
  async function toolsFixture(session, params) {
    const exports={}
    vm.runInNewContext(toolsCompiled,{exports,URLSearchParams,require(name){
      if(name==='@/auth')return {auth:async()=>session}
      if(name==='next/navigation')return {redirect:url=>{throw Error('REDIRECT:'+url)}}
      if(name==='@/components/layout/MainHeader')return {__esModule:true,default:Header}
      if(name==='@/components/tools/PublicTools')return {__esModule:true,default:Public}
      return require(name)
    }})
    return exports.default({searchParams:Promise.resolve(params)})
  }
  const publicPage=await toolsFixture(null,{ref:'old'})
  const loginHref=find(publicPage,node=>node.type===Public).props.loginHref
  assert.equal(new URL(loginHref,'https://example.test').searchParams.get('callbackUrl'),'/tools?ref=old');checks++
  await assert.rejects(toolsFixture({user:{id:0}},{tab:'account',logged_in:'true',ref:'old'}),error=>error.message==='REDIRECT:/my-space?ref=old&tab=tools');checks++
  await assert.rejects(toolsFixture({user:{id:'7'}},{ref:['a','b']}),error=>error.message==='REDIRECT:/my-space?ref=a&ref=b&tab=tools');checks++
  console.log(JSON.stringify({result:'passed',checks,scope:'real server page, mocked database; session ownership, current role, completion and failure; no database writes'}))
}
run().catch(error=>{console.error(error);process.exitCode=1})
