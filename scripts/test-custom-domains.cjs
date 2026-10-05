/* Kiểm thử cô lập: không ghi DB thật, không thay DNS, không gọi HTTPS thật. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript')
const {EventEmitter}=require('node:events')
const {PGlite}=require('@electric-sql/pglite')
const root=path.resolve(__dirname,'..')
let checks=0
const ok=(condition,label)=>{assert.ok(condition,label);checks++}
const rejects=async(task,label)=>{await assert.rejects(task,undefined,label);checks++}
class CrmError extends Error {constructor(message,status=400){super(message);this.status=status}}
let host='giautoandien.io.vn',sessionId=1,role='ADMIN',verification={valid:false,message:'DNS pending'}
const profiles=[{id:7,userId:1,slug:'huong-lucy',isActive:true,members:[{userId:3}],courseIds:[],user:{role:'ADMIN'}},{id:8,userId:2,slug:'other',isActive:true,members:[],courseIds:[],user:{role:'ADMIN'}}]
let records=[]
const courses=[{id:1,id_khoa:'OWN',teacherId:1,status:true},{id:2,id_khoa:'OTHER',teacherId:2,status:true},{id:3,id_khoa:'ASSOCIATE',teacherId:3,status:true},{id:4,id_khoa:'CLOSED',teacherId:1,status:false}]
function matches(record,where){return Object.entries(where).every(([k,v])=>k==='OR' ? v.some(w=>matches(record,w)) : v && typeof v==='object' && 'lt' in v ? record[k] && record[k]<v.lt : v instanceof Date ? record[k]?.getTime()===v.getTime() : record[k]===v)}
const domains={
  findMany:async({where})=>records.filter(r=>matches(r,where)).map(r=>({...r})),
  findFirst:async({where})=>records.find(r=>matches(r,where)) || null,
  findUnique:async({where})=>{const d=records.find(r=>matches(r,where));return d ? {...d,profile:profiles.find(p=>p.id===d.profileId)} : null},
  count:async({where})=>records.filter(r=>matches(r,where)).length,
  create:async({data})=>{if(records.some(r=>r.hostname===data.hostname))throw new CrmError('Duplicate',409);const r={enabled:false,courses:false,crm:false,affiliate:false,verifiedAt:null,checkedAt:null,message:'Pending',...data};records.push(r);return r},
  updateMany:async({where,data})=>{const selected=records.filter(r=>matches(r,where));selected.forEach(r=>Object.assign(r,data));return {count:selected.length}},
  deleteMany:async({where})=>{records=records.filter(r=>!matches(r,where));return {count:1}},
}
const fake={siteDomain:domains,siteWebsite:{findUnique:async()=>({published:{name:'Brand',version:1}})},siteProfile:{findUnique:async({where})=>profiles.find(p=>where.userId!=null ? p.userId===where.userId : p.slug===where.slug) || null},user:{findUnique:async({where})=>({id:where.id,role,name:'Owner'})},course:{findUnique:async({where})=>courses.find(c=>where.id!=null ? c.id===where.id : c.id_khoa===where.id_khoa)},lesson:{findUnique:async({where})=>where.id==='own-lesson' ? {courseId:1} : {courseId:2}},enrollment:{findUnique:async({where})=>({userId:where.id===1 ? 1 : 2,courseId:where.id===1 ? 1 : 2})},$executeRaw:async()=>1}
fake.$transaction=async action=>action(fake)
function loader(overrides={}) {
  const cache=new Map()
  function load(relative){
    let file=path.resolve(root,relative)
    if(!fs.existsSync(file))file=fs.existsSync(file+'.ts') ? file+'.ts' : file+'.tsx'
    if(file===path.join(root,'lib/crm/service.ts'))return {CrmError}
    if(cache.has(file))return cache.get(file).exports
    const module={exports:{}};cache.set(file,module)
    const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText
    new Function('require','exports','module',js)(name=>{
      if(name in overrides)return overrides[name]
      if(name==='server-only')return {}
      if(name==='next/headers')return {headers:async()=>new Headers({host})}
      if(name==='@/lib/prisma')return {__esModule:true,default:fake}
      if(name==='@/lib/crm/service')return {CrmError}
      if(name==='@/auth')return {auth:async()=>sessionId==null ? null : {user:{id:String(sessionId),role}}}
      if(name==='@/lib/website/server')return {ownedProfile:async()=>{if(sessionId==null)throw new CrmError('Login',401);return profiles.find(p=>p.userId===sessionId)},publishedWebsite:async()=>({name:'Brand'})}
      if(name==='@/lib/website/domain-verification')return {verifyDomain:async()=>typeof verification==='function' ? verification() : verification}
      if(name.startsWith('@/'))return load(name.slice(2))
      if(name.startsWith('.'))return load(path.relative(root,path.resolve(path.dirname(file),name)))
      return require(name)
    },module.exports,module)
    return module.exports
  }
  return load
}
const load=loader(),shared=load('lib/website/domain-shared'),context=load('lib/website/domain-context'),api=load('app/api/websites/domains/route')
const req=(body,hostname='giautoandien.io.vn',origin='https://'+hostname)=>new Request('https://'+hostname+'/api/websites/domains',{method:'POST',headers:{host:hostname,origin,'Content-Type':'application/json'},body:JSON.stringify(body)})
async function post(body,hostname,origin){const r=await api.POST(req(body,hostname,origin));return {status:r.status,data:await r.json()}}
async function verificationChecks(){
  let txt=[['gau-domain=','a'.repeat(48)]],addresses=[{address:'76.76.21.21',family:4}],httpsCalls=0,status=200,body='a'.repeat(48),options
  const dns={promises:{resolveTxt:async()=>txt,lookup:async()=>addresses}}
  const https={get:(opts,callback)=>{options=opts;httpsCalls++;const request=new EventEmitter();request.destroy=()=>{};queueMicrotask(()=>{const response=new EventEmitter();response.statusCode=status;response.resume=()=>{};response.destroy=()=>{};callback(response);response.emit('data',Buffer.from(body));response.emit('end')});return request}}
  const verifier=loader({'node:dns':dns,'node:https':https})('lib/website/domain-verification')
  for(const ip of ['127.0.0.1','10.1.1.1','169.254.169.254','100.64.0.1','172.31.1.1','192.168.1.1','0.0.0.0','224.0.0.1','192.0.2.3','203.0.113.8','::1','fc00::1','fe80::1','::ffff:127.0.0.1','2002:7f00:1::','2001:0db8::1','3fff::1'])ok(!verifier.publicAddress(ip),'Reject private/reserved IP '+ip)
  for(const ip of ['76.76.21.21','8.8.8.8','2606:4700:4700::1111'])ok(verifier.publicAddress(ip),'Accept public IP '+ip)
  ok((await verifier.verifyDomain('brk.io.vn','a'.repeat(48))).valid,'Require TXT plus exact HTTPS proof')
  let pin;options.lookup('brk.io.vn',{},(_error,address,family)=>pin={address,family});ok(pin.address==='76.76.21.21' && options.servername==='brk.io.vn' && options.family===4,'Pin resolved IP and retain TLS hostname')
  txt=[['wrong']];ok(!(await verifier.verifyDomain('brk.io.vn','a'.repeat(48))).valid && httpsCalls===1,'Wrong TXT never makes HTTPS request')
  txt=[['gau-domain='+ 'a'.repeat(48)]];addresses=[{address:'127.0.0.1',family:4}];ok(!(await verifier.verifyDomain('brk.io.vn','a'.repeat(48))).valid && httpsCalls===1,'Reject SSRF before connecting')
  addresses=[{address:'76.76.21.21',family:4}];status=302;ok(!(await verifier.verifyDomain('brk.io.vn','a'.repeat(48))).valid,'Do not follow redirect proof')
  status=200;body='different';ok(!(await verifier.verifyDomain('brk.io.vn','a'.repeat(48))).valid,'Another app cannot prove ownership')
  body='x'.repeat(4097);ok(!(await verifier.verifyDomain('brk.io.vn','a'.repeat(48))).valid,'Bound HTTPS response size')
}
async function authChecks(){
  const {Auth}=await import('@auth/core'),Credentials=(await import('@auth/core/providers/credentials')).default
  const actual=loader({'next-auth':{__esModule:true,default:()=>({}),CredentialsSignin:class extends Error{}},'next-auth/providers/credentials':{__esModule:true,default:config=>config},'next-auth/providers/google':{__esModule:true,default:config=>config},'@auth/prisma-adapter':{PrismaAdapter:()=>({})}})('auth.ts').authOptions
  const authOptions={session:{strategy:'jwt'},providers:[Credentials({credentials:{identifier:{},password:{}},authorize:async c=>c.password==='correct' ? {id:'1',name:'Owner',role:'ADMIN'} : null})],callbacks:actual.callbacks}
  process.env.AUTH_URL='https://giautoandien.io.vn/api/auth';process.env.AUTH_SECRET='isolated-domain-test-secret'
  const handlers={GET:async()=>new Response('platform'),POST:async()=>new Response('platform')}
  const route=loader({'@/auth':{handlers,authOptions},'@auth/core':{Auth}})('app/api/auth/[...nextauth]/route')
  const request=(pathname,method='GET',body,cookie)=>new Request('https://internal.invalid/api/auth/'+pathname,{method,headers:{host:'brk.io.vn',...(body ? {'Content-Type':'application/x-www-form-urlencoded','X-Auth-Return-Redirect':'1'} : {}),...(cookie ? {cookie} : {})},body})
  const providers=await (await route.GET(request('providers'))).json()
  ok(providers.credentials.signinUrl==='https://brk.io.vn/api/auth/signin/credentials','Fixed AUTH_URL does not force brand login to platform')
  const csrfResponse=await route.GET(request('csrf')),csrf=await csrfResponse.json()
  const jar=csrfResponse.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ')
  const login=await route.POST(request('callback/credentials','POST',new URLSearchParams({identifier:'alice',password:'correct',csrfToken:csrf.csrfToken,callbackUrl:'https://brk.io.vn/tai-khoan'}),jar))
  ok((await login.json()).url==='https://brk.io.vn/tai-khoan','Credentials login returns to same brand')
  const cookies=login.headers.getSetCookie();ok(cookies.some(c=>c.includes('__Secure-authjs.session-token=')) && cookies.every(c=>!c.includes('Domain=')),'Secure sessions remain host-only')
  ok(process.env.AUTH_URL==='https://giautoandien.io.vn/api/auth','No global environment mutation between domains')
  const sessionJar=[...csrfResponse.headers.getSetCookie(),...cookies].map(c=>c.split(';')[0]).join('; ')
  const session=await (await route.GET(request('session','GET',undefined,sessionJar))).json()
  ok(session.user.id==='1' && session.user.role==='STUDENT','Brand session reads same identity without global admin role')
  const invalid=await route.GET(new Request('https://evil.invalid/api/auth/session',{headers:{host:'evil.invalid'}}));ok(invalid.status===403,'Unknown host cannot access auth')
  const foreignLogin=await route.POST(request('callback/credentials','POST',new URLSearchParams({identifier:'alice',password:'correct',csrfToken:csrf.csrfToken,callbackUrl:'https://evil.invalid/steal'}),jar))
  ok((await foreignLogin.json()).url==='https://brk.io.vn','Auth callback rejects foreign origin')
}
async function run(){
  for(const raw of ['https://brk.io.vn','brk.io.vn/path','brk.io.vn:443','127.0.0.1','foo.local','giautoandien.io.vn','a.giautoandien.io.vn','preview.vercel.app','-bad.vn','bad_.vn']){assert.throws(()=>shared.normalizeHostname(raw));checks++}
  ok(shared.normalizeHostname(' BRK.IO.VN. ')==='brk.io.vn','Normalize apex domain')
  ok(shared.normalizeHostname('learn.brk.io.vn')==='learn.brk.io.vn','Support customer subdomain')
  for(const raw of ['//evil.invalid','/\\evil.invalid','/ok\n'])ok(shared.safeReturnPath(raw)===null,'Reject open redirect '+raw)
  ok(shared.websiteHref('/page/huong-lucy/contact','huong-lucy','REF',true)==='/contact?ref=REF','Own subpage has clean branded URL')
  ok(shared.websiteHref('https://giautoandien.io.vn/khoa-hoc/OWN','huong-lucy','REF',true)==='/khoa-hoc/OWN?ref=REF','Central course links become same-domain')
  ok(shared.websiteHref('https://external.invalid/x','huong-lucy','REF',true)==='https://external.invalid/x','Preserve intentional external link')
  const off={courses:false,crm:false,affiliate:false},on={courses:true,crm:true,affiliate:true}
  for(const route of ['/khoa-hoc','/courses/OWN/learn','/tools/crm','/api/websites/lead','/tools/affiliate','/api/affiliate/withdraw'])ok(shared.domainRoute(route,off)==='deny','Closed module '+route)
  for(const route of ['/admin','/api/admin/x','/tools/my-site/design','/site-domain/other','/page/other','/api/new-module'])ok(shared.domainRoute(route,on)==='deny','Do not implicitly enable platform route '+route)
  ok(shared.domainRoute('/contact',off)==='page' && shared.domainRoute('/login',off)==='system','Custom pages and shared login available')
  const pg=new PGlite();await pg.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE TABLE "SiteProfile" (id INTEGER PRIMARY KEY); INSERT INTO "SiteProfile" VALUES (7);')
  await pg.exec(fs.readFileSync(root+'/prisma/migrations/20261005063000_site_domains/migration.sql','utf8'))
  await pg.exec('INSERT INTO "SiteDomain" (hostname,"profileId",token) VALUES (\'brk.io.vn\',7,\'test\')')
  const row=(await pg.query('SELECT * FROM "SiteDomain"')).rows[0];ok(!row.enabled && !row.courses && !row.crm && !row.affiliate,'Database defaults lock domain and modules')
  for(const role of ['anon','authenticated'])ok(!(await pg.query('SELECT has_table_privilege($1,\'"SiteDomain"\',\'SELECT\') p',[role])).rows[0].p,'No public access to domain ownership tokens '+role)
  ok((await pg.query("SELECT relrowsecurity FROM pg_class WHERE relname='SiteDomain'")).rows[0].relrowsecurity,'Domain table has RLS')
  await pg.exec('DELETE FROM "SiteProfile" WHERE id=7');ok(!(await pg.query('SELECT * FROM "SiteDomain"')).rows.length,'Profile deletion cascades domain safely');await pg.close()
  sessionId=null;ok((await api.GET(new Request('https://giautoandien.io.vn/api/websites/domains',{headers:{host:'giautoandien.io.vn'}}))).status===401,'Anonymous cannot manage domain tokens');sessionId=1
  profiles[0].user.role='TEACHER';ok((await post({action:'add',hostname:'brk.io.vn'})).status===403,'Trial domain provisioning requires admin grant');profiles[0].user.role='ADMIN'
  ok((await post({action:'add',hostname:'brk.io.vn'},'giautoandien.io.vn','https://evil.invalid')).status===403,'Cross-origin domain write rejected')
  ok((await post({action:'add',hostname:'brk.io.vn'},'brk.io.vn')).status===403,'Domain management only on platform')
  ok((await post({action:'add',hostname:'brk.io.vn',profileId:8})).status===400,'Reject target website injection')
  ok((await post({action:'add',hostname:'brk.io.vn'})).status===200 && records[0].profileId===7 && !records[0].enabled,'Registration scoped to owned profile and stays pending')
  sessionId=2;ok((await post({action:'modules',hostname:'brk.io.vn',...on})).status===404,'Other owner cannot grant modules');sessionId=1
  ok((await post({action:'check',hostname:'brk.io.vn'})).status===200 && !records[0].enabled,'DNS failure never activates domain')
  ok((await post({action:'check',hostname:'brk.io.vn'})).status===429,'Verification rate limit')
  records[0].checkedAt=null;verification={valid:true,message:'Verified'};await post({action:'check',hostname:'brk.io.vn'});ok(records[0].enabled && records[0].verifiedAt,'Proof enables domain')
  host='brk.io.vn';await rejects(()=>context.requireDomainCourse('OWN'),'Course module is enforced server-side while closed')
  host='giautoandien.io.vn';await post({action:'modules',hostname:'brk.io.vn',...on});host='brk.io.vn'
  await context.requireDomainCourse('OWN');checks++;await context.requireDomainCourse('ASSOCIATE');checks++
  await rejects(()=>context.requireDomainCourse('OTHER'),'Cannot read another website course');await rejects(()=>context.requireDomainCourse('CLOSED'),'Inactive course rejected')
  profiles[0].courseIds=[2];await context.requireDomainCourse('OTHER');checks++;await rejects(()=>context.requireDomainCourse('OWN'),'Explicit selection narrows catalog');profiles[0].courseIds=[]
  await context.requireDomainEnrollment(1,1,'own-lesson');checks++;await rejects(()=>context.requireDomainEnrollment(2,1),'Do not modify another student result');await rejects(()=>context.requireDomainEnrollment(1,1,'other-lesson'),'Lesson must belong to enrollment course')
  const actor=load('lib/crm/auth');ok((await actor.getCrmActor()).role==='TEACHER','Website admin cannot use global CRM admin scope');sessionId=2;await rejects(()=>actor.getCrmActor(),'Another user cannot view owner CRM');sessionId=1
  const affiliate=load('app/actions/affiliate-actions');ok(!(await affiliate.getAffiliateWallet(2)).success,'Cannot read another user affiliate wallet through a server action')
  const challenge=load('app/.well-known/giautoandien-domain/[token]/route');ok((await challenge.GET(new Request('https://brk.io.vn/proof',{headers:{host:'brk.io.vn'}}),{params:Promise.resolve({token:records[0].token})})).status===200,'Matching host proves token')
  ok((await challenge.GET(new Request('https://other.io.vn/proof',{headers:{host:'other.io.vn'}}),{params:Promise.resolve({token:records[0].token})})).status===404,'Token cannot prove another host')
  const {NextRequest}=require('next/server')
  const proxy=loader({'next-auth':{__esModule:true,default:()=>({auth:handler=>handler})}})('proxy.ts').default
  const routeRequest=pathname=>new NextRequest('https://brk.io.vn'+pathname,{headers:{host:'brk.io.vn'}})
  const rootResponse=await proxy(routeRequest('/?ref=REF'),{})
  ok(rootResponse.headers.get('x-middleware-rewrite')==='https://brk.io.vn/site-domain/brk.io.vn?ref=REF','Root rewrites to tenant without redirect')
  ok((await proxy(routeRequest('/contact'),{})).headers.get('x-middleware-rewrite').endsWith('/site-domain/brk.io.vn/contact'),'Subpage stays on own hostname')
  ok((await proxy(routeRequest('/khoa-hoc/OTHER'),{})).status===404,'Proxy denies foreign course before rendering')
  ok((await proxy(routeRequest('/api/admin/backup'),{})).status===403,'Proxy closes global admin APIs')
  ok((await proxy(routeRequest('/tools/affiliate/clicks'),{})).status===403,'Global affiliate reports are not exposed on brand domain')
  const document=load('lib/website/document'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server')
  const View=load('components/website/WebsiteView').default,doc=document.blankDocument('Brand')
  doc.pages[0].nodes=['courses','form','affiliate'].map(kind=>document.makeNode(kind))
  const markup=renderToStaticMarkup(React.createElement(View,{document:doc,data:{courses:[],posts:[],testimonials:[]},slug:'huong-lucy',customDomain:true,modules:off}))
  ok(!markup.includes('<form') && !markup.includes('id="courses"') && markup.includes('href="/"'),'Disabled components stay hidden and home link remains branded')
  const lead=load('app/api/websites/lead/route')
  const leadResponse=await lead.POST(req({slug:'other',page:'',node:'fake',name:'Customer',email:'customer@example.com',phone:'',message:'Hello',consent:true,website:''},'brk.io.vn'))
  ok(leadResponse.status===403,'Brand lead cannot target another owner slug')
  await authChecks();await verificationChecks()
  host='giautoandien.io.vn';await post({action:'disable',hostname:'brk.io.vn'});host='brk.io.vn';await rejects(()=>context.domainContext(),'Disabled domain closes immediately')
  ok((await proxy(routeRequest('/login'),{})).status===503,'Disabled domain cannot still serve login')
  host='giautoandien.io.vn';records[0].checkedAt=null;verification=async()=>{await post({action:'disable',hostname:'brk.io.vn'});return {valid:true,message:'Verified'}};await post({action:'check',hostname:'brk.io.vn'});ok(!records[0].enabled,'Disable during verification cannot be overwritten by late proof')
  console.log(`Custom domains: ${checks} checks passed (isolated DB, DNS/HTTPS mocks, real Auth.js credentials).`)
}
run().catch(error=>{console.error(error);process.exitCode=1})
