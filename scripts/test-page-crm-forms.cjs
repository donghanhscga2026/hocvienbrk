/* SQL + API + iframe tests in disposable memory. Never reads production credentials. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),crypto=require('node:crypto'),ts=require('typescript')
const {execFileSync}=require('node:child_process'),{PGlite}=require('@electric-sql/pglite'),{JSDOM}=require('jsdom')
const root=path.resolve(__dirname,'..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'page-forms-')),db=new PGlite(),cache=new Map()
let checks=0,failSubmission=false,ownerProfile=null,domain=null
const ok=(condition,message)=>{assert.ok(condition,message);checks++}
class CrmError extends Error{constructor(message,status=400){super(message);this.status=status}}
function load(rel){
  let file=path.resolve(root,rel);if(!path.extname(file))file=fs.existsSync(file+'.ts')?file+'.ts':file+'.tsx'
  if(cache.has(file))return cache.get(file).exports
  const mod={exports:{}};cache.set(file,mod)
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText
  new Function('require','exports','module',code)(name=>{
    if(name==='server-only')return {}
    if(name==='@/lib/prisma')return {__esModule:true,default:adapter}
    if(name==='@/lib/crm/service' || name==='./service')return {CrmError}
    if(name==='@/lib/website/server')return {ownedProfile:async()=>{if(!ownerProfile)throw new CrmError('Login',401);return ownerProfile}}
    if(name==='@/lib/website/domain-context')return {requireDomainModule:async()=>{if(domain?.crm===false)throw new CrmError('CRM disabled',403);return domain}}
    if(name.startsWith('@/'))return load(name.slice(2))
    if(name.startsWith('.'))return load(path.relative(root,path.resolve(path.dirname(file),name)))
    return require(name)
  },mod.exports,mod);return mod.exports
}
const quote=s=>'"'+s.replace(/"/g,'""')+'"'
const q=async(sql,params=[])=> (await db.query(sql,params)).rows
function whereSql(where,values=[]){
  const parts=[]
  for(const [key,value] of Object.entries(where || {})){
    if(key==='OR' || key==='AND'){parts.push('('+value.map(v=>whereSql(v,values).sql).join(key==='OR'?' OR ':' AND ')+')');continue}
    if(key==='course'){parts.push('FALSE');continue}
    if(value===undefined)continue
    if(value===null){parts.push(quote(key)+' IS NULL');continue}
    let op='=',v=value
    if(typeof value==='object' && !(value instanceof Date)){
      if('in' in value){parts.push(value.in.length?'('+value.in.map(v=>{values.push(v);return quote(key)+'=$'+values.length}).join(' OR ')+')':'FALSE');continue}
      if('notIn' in value){parts.push(value.notIn.length?'('+value.notIn.map(v=>{values.push(v);return quote(key)+'<>$'+values.length}).join(' AND ')+')':'TRUE');continue}
      if('gte' in value){op='>=';v=value.gte}
      else if('equals' in value){v=value.equals;if(value.mode==='insensitive'){values.push(v);parts.push('lower('+quote(key)+')=lower($'+values.length+')');continue}}
      else throw new Error('Unsupported filter: '+key)
    }
    values.push(v);parts.push(quote(key)+op+'$'+values.length)
  }
  return {sql:parts.join(' AND ') || 'TRUE',values}
}
const jsonFields=new Set(['config','value','answers','definitionSnapshot','history'])
function model(table){
  const result={
    findMany:async({where,orderBy,take,skip,include}={})=>{
      const w=whereSql(where),orders=Array.isArray(orderBy)?orderBy:orderBy?[orderBy]:[]
      const rows=await q('SELECT * FROM '+quote(table)+' WHERE '+w.sql+(orders.length?' ORDER BY '+orders.flatMap(o=>Object.entries(o).map(([k,v])=>quote(k)+' '+(v==='desc'?'DESC':'ASC'))).join(','):'')+(take?' LIMIT '+take:'')+(skip?' OFFSET '+skip:''),w.values)
      for(const row of rows){
        if(include?.user)row.user=(await q('SELECT role FROM "User" WHERE id=$1',[row.userId]))[0] || null
        if(include?._count)row._count={submissions:Number((await q('SELECT count(*) n FROM "CrmFormSubmission" WHERE "formId"=$1',[row.id]))[0].n)}
        if(include?.course)row.course=null
        if(include?.formSubmission)row.formSubmission=(await q('SELECT id,"formVersion","identityStatus" FROM "CrmFormSubmission" WHERE "requestId"=$1',[row.id]))[0] || null
      }
      return rows
    },
    findFirst:async args=>(await result.findMany({...args,take:1}))[0] || null,
    findUnique:async args=>result.findFirst(args),
    findUniqueOrThrow:async args=>{const row=await result.findFirst(args);if(!row)throw new Error('Missing '+table);return row},
    count:async({where}={})=>{const w=whereSql(where);return Number((await q('SELECT count(*) n FROM '+quote(table)+' WHERE '+w.sql,w.values))[0].n)},
    create:async({data})=>{
      if(table==='CrmFormSubmission' && failSubmission)throw new Error('Injected transaction failure')
      const values={...data};if(['CrmForm','CrmFormSubmission','CrmRequest'].includes(table) && !values.id)values.id=crypto.randomUUID()
      if(['CrmForm','CrmRequest','CrmContact','CrmOpportunity'].includes(table))values.updatedAt=new Date()
      const keys=Object.keys(values).filter(k=>values[k]!==undefined),params=keys.map(k=>jsonFields.has(k)?JSON.stringify(values[k]):values[k])
      return (await q('INSERT INTO '+quote(table)+' ('+keys.map(quote).join(',')+') VALUES ('+keys.map((_,i)=>'$'+(i+1)).join(',')+') RETURNING *',params))[0]
    },
    updateMany:async({where,data})=>{
      const w=whereSql(where),parts=[]
      for(const [key,value] of Object.entries(data)){
        if(value===undefined)continue
        if(value && typeof value==='object' && 'increment' in value){parts.push(quote(key)+'='+quote(key)+'+'+value.increment);continue}
        w.values.push(jsonFields.has(key)?JSON.stringify(value):value);parts.push(quote(key)+'=$'+w.values.length)
      }
      const row=await db.query('UPDATE '+quote(table)+' SET '+parts.join(',')+' WHERE '+w.sql,w.values);return {count:row.affectedRows}
    },
  };return result
}
const adapter={$executeRaw:async()=>{},$transaction:async fn=>{await db.exec('BEGIN');try{const value=await fn(adapter);await db.exec('COMMIT');return value}catch(e){await db.exec('ROLLBACK');throw e}}}
for(const name of ['SiteProfile','User','CrmForm','CrmFormSubmission','CrmRequest','CrmContact','CrmActivity','CrmOpportunity','SystemConfig'])adapter[name[0].toLowerCase()+name.slice(1)]=model(name)
const responseBody=e=>e instanceof CrmError?e.status:e.name==='ZodError'?400:500
const deny=async(work,status)=>{await assert.rejects(work,e=>e instanceof CrmError && e.status===status || status===400 && e.name==='ZodError');checks++}
async function run(){
  // Derive the pre-change schema from current source, so this test also works in fresh CI checkouts.
  let schema=fs.readFileSync(root+'/prisma/schema.prisma','utf8')
  schema=schema.replace(/model CrmForm \{[\s\S]*?\n\}\n\nmodel CrmFormSubmission \{[\s\S]*?\n\}\n/,'')
  schema=schema.replace(/^.*(?:crmForms\s+CrmForm\[\]|formSubmissions\s+CrmFormSubmission\[\]|formSubmission\s+CrmFormSubmission\?).*\n/gm,'')
  schema=schema.replace('  @@unique([ownerId, email])\n  @@unique([ownerId, phone])\n','')
  schema=schema.replace('  email         String?\n  phone         String?\n','  email         String? @unique\n  phone         String? @unique\n')
  const base=path.join(temp,'base.prisma');fs.writeFileSync(base,schema)
  const sql=execFileSync(process.execPath,[root+'/node_modules/prisma/build/index.js','migrate','diff','--from-empty','--to-schema-datamodel',base,'--script'],{encoding:'utf8',env:{...process.env,DATABASE_URL:'postgresql://ci:ci@localhost:5432/ci',DIRECT_URL:'postgresql://ci:ci@localhost:5432/ci'}})
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;');await db.exec(sql)
  await db.exec(`INSERT INTO "User" (id,name,email,role,"updatedAt") VALUES (1,'A','a@test.invalid','TEACHER',now()),(2,'B','b@test.invalid','INSTRUCTOR',now()),(3,'Student','s@test.invalid','STUDENT',now());
    INSERT INTO "SiteProfile" (id,slug,"userId","isActive","updatedAt") VALUES (11,'teacher-a',1,true,now()),(12,'teacher-b',2,true,now());
    INSERT INTO "CrmContact" (name,email,"ownerId","createdBy","updatedAt") VALUES ('Preserve old','old@test.invalid',1,1,now());`)
  const before=JSON.stringify(await q('SELECT * FROM "CrmContact"'))
  await db.exec(fs.readFileSync(root+'/prisma/migrations/20261008100000_page_crm_forms/migration.sql','utf8'))
  ok(before===JSON.stringify(await q('SELECT * FROM "CrmContact"')),'Migration preserves every existing contact field')
  const notify=fs.readFileSync(root+'/prisma/migrations/20261002020627_crm_notifications/migration.sql','utf8')
  await db.exec('ALTER TABLE public."AppNotification" ALTER COLUMN id SET DEFAULT gen_random_uuid()::text')
  await db.exec(notify.slice(notify.indexOf('CREATE FUNCTION public.crm_request_notification()'),notify.indexOf('CREATE FUNCTION public.crm_enrollment_notification()')))
  for(const table of ['CrmForm','CrmFormSubmission']){const row=(await q("SELECT relrowsecurity rls,has_table_privilege('anon',oid,'SELECT') anon,has_table_privilege('authenticated',oid,'INSERT') auth FROM pg_class WHERE oid=$1::regclass",['public."'+table+'"']))[0];ok(row.rls && !row.anon && !row.auth,table+' denies browser Data API access')}
  process.env.AUTH_SECRET='in-memory-test-secret'
  const service=load('lib/crm/forms'),shared=load('lib/crm/form-shared'),compiler=load('lib/website/page-template'),bridge=load('lib/website/page-forms')
  const a={id:11,userId:1},b={id:12,userId:2},config=structuredClone(shared.defaultForm)
  config.fields.push({id:'interest',label:'Quan tâm',type:'multiselect',required:true,options:['AI','Kinh doanh']})
  config.fields.push({id:'plan',label:'Kế hoạch',type:'select',required:false,options:['Tháng này','Tháng sau']})
  const formA=(await service.saveForm(adapter,a,{action:'create',name:'Tư vấn A',config})).form
  const formB=(await service.saveForm(adapter,b,{action:'create',name:'Tư vấn B',config})).form
  ok((await service.listForms(adapter,a)).length===1 && (await service.listForms(adapter,b))[0].id===formB.id,'Forms are private to their owner and Page')
  await deny(()=>service.saveForm(adapter,b,{action:'update',id:formA.id,version:1,name:'Stolen',active:true,config}),409)
  for(const [profile,form] of [[a,formA],[b,formB]])await q('INSERT INTO "SystemConfig" (key,value) VALUES ($1,$2)',[compiler.pageTemplateKey(profile.id),JSON.stringify({revision:1,active:true,name:'Template',region:'__append__',source:'AAAA',forms:[{mode:'generated',formId:form.id,region:'__append__',theme:'light'}]})])
  const answers={name:'Lead',phone:'0909876543',email:'lead@test.invalid',needs:'Need help',interest:['AI'],plan:'Tháng này'}
  const input={slug:'teacher-a',formId:formA.id,version:1,key:crypto.randomUUID(),answers,consent:true}
  await deny(()=>service.submitForm(adapter,input,'test',12),404)
  await assert.rejects(service.submitForm(adapter,{...input,ownerId:2},'test'));checks++
  await assert.rejects(service.submitForm(adapter,{...input,consent:false},'test'));checks++
  await deny(()=>service.submitForm(adapter,{...input,answers:{...answers,interest:['Hacked']}},'test'),400)
  await deny(()=>service.submitForm(adapter,{...input,answers:{...answers,phone:'',email:''}},'test'),400)
  failSubmission=true;await assert.rejects(service.submitForm(adapter,input,'test'));failSubmission=false
  ok(await adapter.crmRequest.count()===0 && await adapter.crmContact.count()===1 && (await q('SELECT count(*) n FROM "AppNotification"'))[0].n===0,'Failure rolls back contact/request/notification atomically')
  await service.submitForm(adapter,input,'test');await service.submitForm(adapter,input,'test')
  ok(await adapter.crmFormSubmission.count()===1 && await adapter.crmRequest.count()===1,'Retries create exactly one request and submission')
  const contact=(await adapter.crmContact.findMany({where:{email:'lead@test.invalid',ownerId:1}}))[0]
  ok(contact.phone==='+84909876543' && contact.linkedUserId===null && !contact.marketingEmailAllowed,'Normalize identity without account linking or marketing consent')
  ok((await q('SELECT "recipientId" FROM "AppNotification"')).map(r=>r.recipientId).join(',')==='1','Exactly the Page owner receives a bell notification')
  await service.submitForm(adapter,{...input,key:crypto.randomUUID(),answers:{...answers,name:'Do not overwrite'}},'test')
  ok(await adapter.crmContact.count({where:{ownerId:1,email:answers.email}})===1 && (await adapter.crmContact.findUnique({where:{id:contact.id}})).name==='Lead','Repeated registrations share only the same teacher contact and preserve identity')
  ok(await adapter.crmOpportunity.count({where:{contactId:contact.id}})===1,'Repeated registrations do not duplicate an open consultation opportunity')
  await service.submitForm(adapter,{...input,slug:'teacher-b',formId:formB.id,key:crypto.randomUUID()},'test')
  ok(await adapter.crmContact.count({where:{email:answers.email}})===2,'Same identity creates independent contacts for two teachers')
  await adapter.crmContact.create({data:{name:'Other email',phone:'+84901234567',email:'other@test.invalid',ownerId:1,createdBy:1}})
  await service.submitForm(adapter,{...input,key:crypto.randomUUID(),answers:{...answers,phone:'0901234567'}},'test')
  const conflict=await adapter.crmFormSubmission.findFirst({where:{identityStatus:'CONFLICT'}})
  ok(conflict.contactId===null && (await adapter.crmRequest.findUnique({where:{id:conflict.requestId}})).ownerId===1,'Conflicting phone/email stays in the correct teacher inbox without merging')
  await adapter.crmContact.updateMany({where:{id:contact.id},data:{archived:true}})
  await service.submitForm(adapter,{...input,key:crypto.randomUUID()},'test')
  ok(await adapter.crmContact.count({where:{email:answers.email,ownerId:1}})===1 && (await adapter.crmContact.findUnique({where:{id:contact.id}})).archived,'Archived contacts are not recreated or restored')
  const old=await adapter.crmFormSubmission.findFirst({where:{formId:formA.id}})
  const changed=structuredClone(config);changed.fields[0].label='Tên mới'
  await service.saveForm(adapter,a,{action:'update',id:formA.id,version:1,name:'Form renamed',active:true,config:changed})
  ok((await adapter.crmFormSubmission.findUnique({where:{id:old.id}})).definitionSnapshot.fields[0].label==='Họ và tên','Historical question labels and answers remain unchanged after edits')
  await service.submitForm(adapter,input,'test')
  await deny(()=>service.submitForm(adapter,{...input,key:crypto.randomUUID()},'test'),409)
  await service.saveForm(adapter,a,{action:'update',id:formA.id,version:2,name:'Off',active:false,config:changed})
  await deny(()=>service.submitForm(adapter,{...input,version:3,key:crypto.randomUUID()},'test'),404)
  const requests=load('lib/crm/requests')
  await deny(()=>requests.requestSource(adapter,{id:2,role:'TEACHER',name:'B'},old.requestId),404)
  const source=await requests.requestSource(adapter,{id:1,role:'TEACHER',name:'A'},old.requestId)
  ok(source.submission.answers.interest[0]==='AI','Owner reads full typed answers using the original snapshot')
  await deny(()=>requests.updateRequest(adapter,{id:0,role:'ADMIN',name:'Admin'},{id:old.requestId,version:1,status:'NEW',resolution:'',ownerId:2}),403)
  const beforeBot=await adapter.crmFormSubmission.count();await service.submitForm(adapter,{...input,website:'bot'},'test');ok(await adapter.crmFormSubmission.count()===beforeBot,'Honeypot writes nothing')
  // Bound form still active on B; enforce rate limit even when a new UUID is used.
  await q('UPDATE "CrmFormSubmission" SET "ipHash"=$1 WHERE "ownerId"=2',[crypto.createHmac('sha256',process.env.AUTH_SECRET).update('page-form-rate:limited').digest('hex')])
  const ipHash=(await adapter.crmFormSubmission.findFirst({where:{ownerId:2}})).ipHash
  for(let i=0;i<9;i++)await adapter.crmFormSubmission.create({data:{key:'limit-'+i,formId:formB.id,ownerId:2,profileId:12,requestId:(await adapter.crmRequest.create({data:{key:'limit-request-'+i,ownerId:2,category:'CONSULTATION',name:'Limit',content:'Limit',source:'Test',ipHash}})).id,formVersion:1,definitionSnapshot:config,answers:{},ipHash}})
  await deny(()=>service.submitForm(adapter,{...input,slug:'teacher-b',formId:formB.id,key:crypto.randomUUID()},'limited'),429)
  const publicForm={id:formB.id,version:1,config}
  const fixture='<h1>Keep heading</h1><div id="courses"></div><section id="signup"><h2>Keep signup title</h2><p>Keep introduction</p><form id="custom"><input id="n" placeholder="Họ tên"><input name="phone"><input name="email"><textarea name="needs"></textarea><input type="checkbox" value="AI"><input type="checkbox" value="Kinh doanh"><select><option>Tháng này</option><option>Tháng sau</option></select><button>Gửi</button></form></section><div id="new-form"></div><script>document.querySelector("form").addEventListener("submit",function(){window.oldHandler=true})</script>'
  const binding={mode:'existing',formId:formB.id,index:0,mapping:{name:[0],phone:[1],email:[2],needs:[3],interest:[4,5],plan:[6]}}
  const compiled=compiler.renderPageTemplate(fixture,'courses',[]),html=bridge.connectPageForms(compiled,[binding],[publicForm],true)
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://test.invalid'}),w=dom.window,form=w.document.querySelector('form'),events=[]
  w.parent.postMessage=data=>events.push(data);w.crypto.randomUUID=crypto.randomUUID
  ok(w.document.querySelector('h1').textContent==='Keep heading' && w.document.querySelector('#signup h2').textContent==='Keep signup title' && w.document.querySelector('#signup p').textContent==='Keep introduction','Connecting a form preserves headings and surrounding template content')
  ok(w.document.querySelector('head').firstElementChild.httpEquiv==='Content-Security-Policy' && !w.document.querySelector('head meta').content.includes('connect-src https'),'CSP continues to forbid iframe network access')
  const fields=form.querySelectorAll('input,textarea,select');fields[0].value='Lead';fields[1].value='0909876543';fields[2].value='lead@test.invalid';fields[4].checked=true;form.querySelector('[data-system-form-consent]').checked=true
  form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}))
  ok(events.length===1 && events[0].answers.interest[0]==='AI' && events[0].formId===formB.id && !w.oldHandler,'Only mapped fields cross the bridge; template submit handlers cannot send independently')
  const first=events[0];w.dispatchEvent(new w.MessageEvent('message',{source:w.parent,data:{source:'system-page-form-result',key:first.key,ok:false,error:'Retry'}}))
  ok(fields[0].value==='Lead' && !form.querySelector('button').disabled,'Errors preserve answers and unlock retry')
  form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));ok(events[1].key===first.key,'Retries preserve the submission UUID')
  w.dispatchEvent(new w.MessageEvent('message',{source:w.parent,data:{source:'system-page-form-result',key:first.key,ok:true}}))
  ok(form.querySelector('[data-system-form-status]').textContent===config.successMessage && fields[0].value==='','Success resets answers and displays the configured thank-you message')
  dom.window.close()
  assert.throws(()=>bridge.connectPageForms(compiled,[{...binding,mapping:{name:[0],phone:[1]}}],[publicForm],true),/Quan tâm/);checks++
  assert.throws(()=>bridge.connectPageForms(compiled,[binding,binding],[publicForm],true),/Mỗi form/);checks++
  assert.throws(()=>bridge.connectPageForms(compiled,[binding],[],true),/đang nhận/);checks++
  const removedFirst=compiler.renderPageTemplate(fixture.replace('<div id="courses"></div>','<div id="courses"><form id="course-form"><input></form></div>'),'courses',[])
  const keptIndex=bridge.connectPageForms(removedFirst,[{...binding,index:1}],[publicForm],true)
  ok(new JSDOM(keptIndex).window.document.querySelector('#custom').hasAttribute('data-system-lead-form'),'Replacing course cards cannot shift the chosen registration form')
  const buttonForm=compiler.renderPageTemplate('<form id="registration-form"><input name="name"><input type="tel" name="phone"><button type="button" data-mfc-register onclick="window.badClick=true">Đăng ký</button></form>','__append__',[])
  const baseConfig=shared.defaultForm,baseDefinition={...publicForm,config:baseConfig},baseBinding={mode:'existing',formId:formB.id,index:0,mapping:{name:[0],phone:[1]}}
  const promoted=new JSDOM(bridge.connectPageForms(buttonForm,[baseBinding],[baseDefinition],true),{runScripts:'dangerously',url:'https://test.invalid'})
  const pf=promoted.window.document.querySelector('form'),promotedEvents=[]
  promoted.window.crypto.randomUUID=crypto.randomUUID;promoted.window.parent.postMessage=e=>promotedEvents.push(e)
  pf.querySelector('[name="name"]').value='Lead';pf.querySelector('[name="phone"]').value='0909876543';pf.querySelector('[data-system-form-consent]').checked=true;pf.querySelector('button').click()
  ok(pf.querySelector('button').type==='submit' && promotedEvents.length===1 && !promoted.window.badClick,'The Top1 ordinary registration button is promoted and old inline handlers are bypassed')
  promoted.window.close()
  const multipleButtons=buttonForm.replace('<button type="button" data-mfc-register','<button type="button">Quay lại</button><button type="button"')
  assert.throws(()=>bridge.connectPageForms(multipleButtons,[baseBinding],[baseDefinition],true),/Chọn nút/);checks++
  ok(new JSDOM(bridge.connectPageForms(multipleButtons,[{...baseBinding,submit:1}],[baseDefinition],true)).window.document.querySelectorAll('button')[1].type==='submit','Teachers can explicitly choose the registration button among several ordinary buttons')
  const generated=bridge.connectPageForms(compiled,[{mode:'generated',formId:formB.id,region:'new-form',theme:'dark'}],[publicForm],true)
  ok(new JSDOM(generated).window.document.querySelector('#new-form select[multiple]'),'Generated forms support multiple selections and fit only the chosen region')
  ok(bridge.connectPageForms(compiled,[{mode:'generated',formId:formB.id,region:'__append__',theme:'light'}],[publicForm],true).includes('system-lead-form'),'Generated form can append below existing forms')
  const api=load('app/api/websites/forms/route'),submit=load('app/api/websites/forms/submit/route')
  const request=(url,body,origin='https://giautoandien.io.vn',host='giautoandien.io.vn')=>new Request('https://'+host+url,{method:body?'POST':'GET',headers:{host,origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})})
  ok((await api.GET(request('/api/websites/forms'))).status===410,'Retired form management returns Gone')
  ownerProfile={...a,user:{role:'TEACHER'}}
  ok((await api.POST(request('/api/websites/forms',{action:'create',name:'CSRF',config},'https://evil.invalid'))).status===410,'Retired management never accepts writes')
  ok((await api.GET(request('/api/websites/forms',null,undefined,'other.invalid'))).status===410,'Retired management never exposes private forms')
  ownerProfile={...a,user:{role:'STUDENT'}};ok((await api.GET(request('/api/websites/forms'))).status===410,'Retired management is unavailable to all roles')
  ok((await submit.POST(request('/api/websites/forms/submit',{...input,slug:'teacher-b',formId:formB.id,key:crypto.randomUUID()},'https://evil.invalid'))).status===410,'Retired submission never accepts writes')
  domain={profileId:11,crm:true};ok((await submit.POST(request('/api/websites/forms/submit',{...input,slug:'teacher-b',formId:formB.id,key:crypto.randomUUID()}))).status===410,'Retired custom domain submissions are blocked')
  domain={profileId:12,crm:false};ok((await submit.POST(request('/api/websites/forms/submit',{...input,slug:'teacher-b',formId:formB.id,key:crypto.randomUUID()}))).status===410,'Retired submission never creates CRM requests')
  const routing=load('lib/website/domain-shared')
  ok(routing.domainRoute('/api/websites/forms/submit',{crm:true,courses:false,affiliate:false})==='system','Proxy allows the public form endpoint on licensed custom domains')
  ok(routing.domainRoute('/api/websites/forms/submit',{crm:false,courses:true,affiliate:true})==='deny' && routing.domainRoute('/api/websites/forms',{crm:true,courses:true,affiliate:true})==='deny','Proxy never exposes form management or unlicensed CRM on custom domains')
  await frameTests(publicForm)
  await managerTests(publicForm)
  await db.close();console.log('PASS: '+checks+' Page form SQL/API/iframe assertions; no live writes.');fs.rmSync(temp,{recursive:true,force:true})
}
async function frameTests(publicForm){
  const React=require('react'),{createRoot}=require('react-dom/client'),dom=new JSDOM('<div id="root"></div>',{url:'https://giautoandien.io.vn'})
  global.window=dom.window;global.document=dom.window.document;global.IS_REACT_ACT_ENVIRONMENT=true
  Object.defineProperty(global,'navigator',{value:dom.window.navigator,configurable:true})
  let writes=0,replies=[];global.fetch=async()=>{writes++;return {ok:true,json:async()=>({received:true})}}
  const ui=createRoot(document.getElementById('root')),Frame=load('components/website/ImportedPageFrame').default
  await React.act(async()=>ui.render(React.createElement(Frame,{html:'<p>Test</p>',links:[],forms:[publicForm],slug:'teacher-b',preview:true})))
  const target=document.querySelector('iframe').contentWindow;target.postMessage=data=>replies.push(data)
  const data={source:'system-page-form',formId:publicForm.id,version:1,key:crypto.randomUUID(),answers:{name:'Lead'},consent:true,website:''}
  const send=(source,payload)=>window.dispatchEvent(new window.MessageEvent('message',{source,data:payload}))
  await React.act(async()=>send(target,data));ok(writes===0 && replies.length===0,'Preview ignores retired form messages')
  await React.act(async()=>ui.render(React.createElement(Frame,{html:'<p>Test</p>',links:[],forms:[publicForm],slug:'teacher-b'})))
  await React.act(async()=>{send(window,data);send(target,{...data,formId:crypto.randomUUID()});await Promise.resolve()});ok(writes===0,'Parent rejects other frames and unconfigured form IDs')
  await React.act(async()=>{send(target,data);await new Promise(r=>setTimeout(r,10))});ok(writes===0 && replies.length===0,'Live Page ignores legacy form messages without CRM writes')
  ok(document.querySelector('iframe').getAttribute('sandbox')==='allow-scripts','Form feature never adds same-origin or form navigation permissions')
  await React.act(async()=>ui.unmount());dom.window.close()
}
run().catch(e=>{console.error(e);process.exitCode=1;db.close()})
async function managerTests(publicForm){
  const React=require('react'),{createRoot}=require('react-dom/client'),dom=new JSDOM('<div id="root"></div>',{url:'https://giautoandien.io.vn/tools/my-site/forms'})
  global.window=dom.window;global.document=dom.window.document;global.IS_REACT_ACT_ENVIRONMENT=true
  Object.defineProperty(global,'navigator',{value:dom.window.navigator,configurable:true})
  let posts=[],state=[{...publicForm,name:'Form reusable',active:true,submissions:2,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}]
  global.fetch=async(_url,options)=>{if(options?.method==='POST'){const data=JSON.parse(options.body);posts.push(data);return {ok:true,json:async()=>({form:state[0]})}}return {ok:true,json:async()=>({forms:state})}}
  const ui=createRoot(document.getElementById('root')),Manager=load('components/crm/FormManager').default
  await React.act(async()=>{ui.render(React.createElement(Manager));await new Promise(r=>setTimeout(r,10))})
  const button=label=>Array.from(document.querySelectorAll('button')).find(b=>b.textContent===label)
  ok(document.body.textContent.includes('Form reusable') && document.body.textContent.includes('2 đăng ký'),'Management shows reusable forms and submission totals')
  await React.act(async()=>button('Nhân bản').click())
  ok(document.querySelector('form') && document.querySelector('input').value==='Form reusable (bản sao)','Clone preserves question configuration while creating a new form')
  await React.act(async()=>button('+ Thêm câu hỏi').click())
  ok(Array.from(document.querySelectorAll('input')).some(i=>i.value==='Câu hỏi mới'),'Teacher can add a custom question without changing CRM columns')
  await React.act(async()=>{document.querySelector('form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));await new Promise(r=>setTimeout(r,10))})
  ok(posts[0].action==='create' && posts[0].config.fields.length===publicForm.config.fields.length+1,'Saving a cloned form sends the complete variable-field schema')
  await React.act(async()=>button('Chỉnh sửa / bật tắt').click())
  const toggle=Array.from(document.querySelectorAll('input[type="checkbox"]')).at(-1)
  await React.act(async()=>toggle.click())
  await React.act(async()=>{document.querySelector('form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));await new Promise(r=>setTimeout(r,10))})
  ok(posts[1].action==='update' && posts[1].id===publicForm.id && posts[1].version===publicForm.version && !posts[1].active,'Teacher can pause a form using its current revision')
  await React.act(async()=>ui.unmount());dom.window.close()
}
