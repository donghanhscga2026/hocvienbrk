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
const configs=new Map()
const fake={siteProfileDomain:{findUnique:async()=>null,findMany:async()=>[],findFirst:async()=>null},systemConfig:{findUnique:async({where})=>configs.has(where.key) ? {key:where.key,value:configs.get(where.key)} : null,upsert:async({where,create,update})=>{const value=configs.has(where.key) ? update.value : create.value;configs.set(where.key,value);return {key:where.key,value}}},siteDomain:domains,siteWebsite:{findUnique:async()=>({published:{name:'Brand',version:1}})},siteProfile:{update:async({where,data})=>Object.assign(profiles.find(p=>p.id===where.id),data),findUnique:async({where})=>profiles.find(p=>where.userId!=null ? p.userId===where.userId : where.id!=null ? p.id===where.id : p.slug===where.slug) || null},user:{findUnique:async({where})=>({id:where.id,role,name:'Owner'})},course:{findUnique:async({where})=>courses.find(c=>where.id!=null ? c.id===where.id : c.id_khoa===where.id_khoa)},lesson:{findUnique:async({where})=>where.id==='own-lesson' ? {courseId:1} : {courseId:2}},enrollment:{findUnique:async({where})=>({userId:where.id===1 ? 1 : 2,courseId:where.id===1 ? 1 : 2})},$executeRaw:async()=>1}
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
      if(name==='next/cache')return {unstable_cache:fn=>fn,revalidateTag:()=>{}}
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
  let verified={profileId:7,enabled:true},managedOwner=7,fullManagedReads=0
  const resolver=loader({'@/lib/prisma':{__esModule:true,default:{
    siteDomain:{findUnique:async()=>verified},
    siteProfileDomain:{findUnique:async args=>{if(args.include)fullManagedReads++;return args.select ? {profileId:managedOwner} : {profileId:managedOwner,isActive:true,createdAt:new Date(),profile:profiles[0]}}},
  }}})('lib/website/domains')
  ok(await resolver.findDomain('example.vn')===verified,'Verified domain remains authoritative')
  ok(fullManagedReads===0,'Verified domain does not load legacy profile relations')
  managedOwner=8;ok(await resolver.findDomain('example.vn')===null,'Lightweight legacy check still blocks conflicting owners')
  managedOwner=7;verified.enabled=false;ok((await resolver.findDomain('example.vn')).enabled===false,'Disabled verified domain never falls back to active legacy domain')
  verified=null;ok((await resolver.findDomain('example.vn')).enabled===true,'Legacy-only domains still resolve their full profile')
  ok(fullManagedReads===1,'Full legacy profile is loaded only for a legacy-only domain')
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
  for(const route of ['/complete-profile','/account-settings','/reset-password/ABC_123'])ok(shared.domainRoute(route,off)==='system','Account flow remains on brand domain '+route)
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
  const actor=load('lib/crm/auth');ok((await actor.getCrmActor()).role==='TEACHER','Website admin cannot use global CRM admin scope');sessionId=2;await rejects(()=>actor.getCrmActor(),'Another user cannot view owner CRM');sessionId=3;role='TEACHER';const teacherActor=await actor.getCrmActor()
  ok(teacherActor.id===3 && teacherActor.role==='TEACHER','Linked teacher uses own CRM identity, not owner identity')
  const crmShared=load('lib/crm/shared')
  ok(!crmShared.canAccessContact(teacherActor,1),'Linked teacher cannot access owner CRM contacts')
  role='STUDENT';await rejects(()=>actor.getCrmActor(),'Linked student cannot gain CRM access from membership')
  sessionId=1;role='ADMIN'
  const affiliate=load('app/actions/affiliate-actions');ok(!(await affiliate.getAffiliateWallet(2)).success,'Cannot read another user affiliate wallet through a server action')
  const challenge=load('app/.well-known/giautoandien-domain/[token]/route');ok((await challenge.GET(new Request('https://brk.io.vn/proof',{headers:{host:'brk.io.vn'}}),{params:Promise.resolve({token:records[0].token})})).status===200,'Matching host proves token')
  ok((await challenge.GET(new Request('https://other.io.vn/proof',{headers:{host:'other.io.vn'}}),{params:Promise.resolve({token:records[0].token})})).status===404,'Token cannot prove another host')
  const {NextRequest}=require('next/server')
  const proxy=loader({'next-auth':{__esModule:true,default:()=>({auth:handler=>handler})}})('proxy.ts').default
  const routeRequest=pathname=>new NextRequest('https://brk.io.vn'+pathname,{headers:{host:'brk.io.vn'}})
  const zipPath='/api/course-template-source?source='+encodeURIComponent('https://project.supabase.co/storage/v1/object/public/uploads/course-template-sources/example.html')
  ok((await proxy(routeRequest(zipPath),{})).headers.get('x-middleware-next')==='1','Enabled courses allow isolated ZIP source through the real domain proxy')
  ok((await proxy(routeRequest('/api/course-template-source/other'),{})).status===403,'ZIP exception does not expose adjacent API routes')
  records[0].courses=false
  ok((await proxy(routeRequest(zipPath),{})).status===403,'Disabling courses immediately blocks ZIP source on the same domain')
  records[0].courses=true
  const rootResponse=await proxy(routeRequest('/?ref=REF'),{})
  ok(rootResponse.headers.get('x-middleware-rewrite')==='https://brk.io.vn/site-domain/brk.io.vn?ref=REF','Root rewrites to tenant without redirect')
  ok((await proxy(routeRequest('/contact'),{})).headers.get('x-middleware-rewrite').endsWith('/site-domain/brk.io.vn/contact'),'Subpage stays on own hostname')
  ok((await proxy(routeRequest('/khoa-hoc/OTHER'),{})).status===404,'Proxy denies foreign course before rendering')
  ok((await proxy(routeRequest('/api/admin/backup'),{})).status===403,'Proxy closes global admin APIs')
  ok((await proxy(routeRequest('/tools/affiliate/clicks'),{})).status===403,'Global affiliate reports are not exposed on brand domain')
  const React=require('react'),{renderToStaticMarkup}=require('react-dom/server')
  const markup=''
  const lead=load('app/api/websites/lead/route')
  const leadResponse=await lead.POST(req({slug:'other',page:'',node:'fake',name:'Customer',email:'customer@example.com',phone:'',message:'Hello',consent:true,website:''},'brk.io.vn'))
  ok(leadResponse.status===410,'Retired free-design forms cannot write leads')
  const Shell=loader({'next/navigation':{usePathname:()=>null},'next-auth/react':{useSession:()=>({data:null}),signOut:()=>{}}})('components/website/DomainShell').default
  const shellProps={brand:{...on,name:'Brand',color:'#7c3aed',background:'#fff',ownerId:1},pages:[{title:'Giới thiệu',slug:'gioi-thieu'}]}
  const home=renderToStaticMarkup(React.createElement(Shell,{...shellProps,path:'/'},markup))
  const detail=renderToStaticMarkup(React.createElement(Shell,{...shellProps,path:'/khoa-hoc/OWN'},'Course'))
  ok(home.includes('href="/khoa-hoc"') && home.includes('href="/gioi-thieu"') && home.includes('href="/login"'),'Home has shared course, custom page and login navigation')
  ok(detail.includes('aria-label="Đường dẫn trang"') && !home.includes('aria-label="Đường dẫn trang"'),'Breadcrumb appears on internal pages only')
  ok(home.includes('aria-expanded="false"') && home.includes('aria-controls="website-menu"'),'Mobile navigation exposes accessible toggle')
  const importedHome=renderToStaticMarkup(React.createElement(Shell,{...shellProps,path:'/',importedHome:true},'Custom template'))
  const importedDetail=renderToStaticMarkup(React.createElement(Shell,{...shellProps,path:'/khoa-hoc/OWN',importedHome:true},'Course'))
  ok(!importedHome.includes('<header') && !importedHome.includes('<footer') && importedHome.includes('Custom template'),'Imported home uses its own header and footer')
  ok(home.includes('<footer') && importedDetail.includes('<header') && importedDetail.includes('<footer'),'Built-in home and internal course pages retain shared navigation and footer')

  const {websiteTheme,contrastRatio}=load('lib/website/theme')
  for (const background of ['#ffffff','#f8fafc','#808080','#777777','#121212','#2d3142','#fae0c7','#0000','transparent']) {
    for (const color of ['#ffcc00','#ffffff','#000000','#7c3aed','#4eb09b','#fff0','#abc','#abcd']) {
      const theme=websiteTheme(color,background)
      ok(contrastRatio(theme.text,theme.surface)>=4.5 && contrastRatio(theme.text,theme.background)>=4.5,'Website text stays readable on surface and canvas')
      ok(contrastRatio(theme.muted,theme.surface)>=4.5 && contrastRatio(theme.muted,theme.background)>=4.5,'Secondary text remains readable')
      ok(contrastRatio(theme.primary,theme.onPrimary)>=4.5 && contrastRatio(theme.accent,theme.surface)>=4.5,'Buttons and accent labels adapt to selected brand color')
      ok(/^#[a-f0-9]{6}$/i.test(theme.surface),'Modal surface is opaque even for transparent saved colors')
    }
  }
  const learningShell=renderToStaticMarkup(React.createElement(Shell,{...shellProps,path:'/courses/1/learn'},'Player'))
  ok(learningShell.includes('data-website-learning="true"') && !learningShell.includes('<footer'),'Learning shell reserves viewport for navigation and player')

  const accessApi=load('app/api/websites/access/route')
  const accessPost=async(body,hostname='giautoandien.io.vn',origin='https://'+hostname)=>accessApi.POST(req(body,hostname,origin))
  ok((await accessPost({action:'basic',modules:off},'brk.io.vn')).status===403,'Brand session cannot administer package')
  ok((await accessPost({action:'basic',modules:off},'giautoandien.io.vn','https://evil.invalid')).status===403,'Package rejects cross-origin writes')
  profiles[0].user.role='TEACHER'
  ok((await accessPost({action:'basic',modules:on})).status===403,'Owner cannot change basic package')
  ok((await accessPost({action:'save',revision:0,enabled:on,extra:on})).status===403,'Owner cannot inject grants')
  profiles[0].user.role='ADMIN'
  const savedBasic=await accessPost({action:'basic',modules:{...off,courses:true}})
  ok(savedBasic.status===200,'Admin saves basic template: '+await savedBasic.text())
  ok(records[0].crm,'Saving template does not mutate live websites')
  ok((await accessPost({action:'save',revision:0,enabled:on,extra:off,applyBasic:true})).status===200,'Admin applies base snapshot to website')
  ok(records[0].courses && !records[0].crm && !records[0].affiliate,'Effective permissions intersect grants and enabled flags')
  ok((await accessPost({action:'save',revision:0,enabled:on,extra:on})).status===409,'Stale revision cannot overwrite access')
  await rejects(()=>context.requireDomainModule('crm'),'Server rejects revoked module despite direct access')
  ok((await post({action:'modules',hostname:'brk.io.vn',...on})).status===409,'Old domain form cannot bypass website policy')
  profiles[0].user.role='TEACHER'
  ok((await accessPost({action:'save',revision:1,enabled:on})).status===403,'Owner cannot activate ungranted module')
  ok((await accessPost({action:'save',revision:1,enabled:off})).status===200,'Owner can disable granted modules')
  profiles[0].user.role='ADMIN'
  await accessPost({action:'save',revision:2,enabled:on,extra:on})
  const apps=load('lib/website/applications'),appContext=load('lib/website/application-context')
  ok(Object.values(apps.noApplications).every(v=>v===false),'New application flags default closed for old website settings')
  const oldAccess=load('lib/website/access').accessSchema.parse({version:1,revision:0,base:on,extra:off,enabled:on})
  ok(Object.values(oldAccess.applications.base).every(v=>!v),'Parsing old configuration cannot grant new applications')
  ok(!apps.canUseApplication('teaching',profiles[0],{id:3,role:'STUDENT'}),'Learner cannot open teaching application')
  ok(!apps.canUseApplication('teaching',profiles[0],{id:2,role:'TEACHER'}),'Unlinked teacher cannot open management application')
  ok(!apps.canUseApplication('students',profiles[0],{id:2,role:'ADMIN'}),'Foreign platform administrator cannot enter website management apps')
  ok(apps.canUseApplication('teaching',profiles[0],{id:3,role:'TEACHER'}),'Linked teacher can open own teaching application')
  ok(apps.canUseApplication('brk',profiles[0],{id:2,role:'STUDENT'}),'Learner can use connected personal wallet')
  ok(!apps.canUseApplication('brk',profiles[0],null),'Guest cannot enter private wallet')
  await rejects(()=>appContext.connectedApplication('brk'),'Direct application URL blocked before connection')
  await rejects(()=>appContext.connectedApplication('backup'),'Unknown application slug cannot launch platform admin')
  ok(shared.domainRoute('/tools/courses',{...on,teaching:true})==='deny','Connector does not expose unscoped native management pages')
  ok((await proxy(routeRequest('/ung-dung/brk'),{})).status===403,'Disconnected application rejected before page renders')
  profiles[0].user.role='TEACHER'
  ok((await accessPost({action:'save',revision:3,enabled:on,applications:apps.allApplications})).status===403,'Owner cannot connect ungranted application')
  ok((await accessPost({action:'save',revision:3,enabled:on,applicationExtra:apps.allApplications})).status===403,'Owner cannot forge application grants')
  profiles[0].user.role='ADMIN'
  ok((await accessPost({action:'basic',modules:on,applications:apps.allApplications})).status===200,'Full basic package stores supported application grants')
  ok((await accessPost({action:'save',revision:3,enabled:on,applications:apps.allApplications,applyBasic:true})).status===200,'Apply package and connect available apps')
  const launch=await appContext.connectedApplication('teaching')
  ok((await proxy(routeRequest('/ung-dung/brk'),{})).headers.get('x-middleware-rewrite').endsWith('/site-domain/brk.io.vn/ung-dung/brk'),'Connected application entry stays on expert domain')
  ok(launch.app.path==='/tools/courses' && !launch.app.path.includes('http'),'Launch destination is fixed registry path')
  sessionId=3;role='TEACHER';await appContext.connectedApplication('teaching');checks++
  sessionId=2;await rejects(()=>appContext.connectedApplication('teaching'),'Direct URL checks live staff membership')
  role='STUDENT';await appContext.connectedApplication('brk');checks++
  sessionId=null;await rejects(()=>appContext.connectedApplication('brk'),'Direct URL requires authenticated identity')
  sessionId=1;role='ADMIN'
  const disconnected={...apps.allApplications,brk:false}
  ok((await accessPost({action:'save',revision:4,enabled:on,applications:disconnected})).status===200,'Disconnect app without deleting account data')
  await rejects(()=>appContext.connectedApplication('brk'),'Disconnected app cannot be launched by stale URL')
  ok((await appContext.connectedApplication('teaching')).key==='teaching','Disconnecting one app preserves other connections')
  ok(records[0].enabled,'Disconnecting apps does not disable custom domain')
  const AppView=load('components/website/WebsiteApplications').default
  const studentHub=renderToStaticMarkup(React.createElement(AppView,{domain:{...on,applications:apps.allApplications,profile:profiles[0]},user:{id:3,role:'STUDENT'},name:'Brand'}))
  ok(studentHub.includes('/ung-dung/brk') && !studentHub.includes('/ung-dung/teaching') && !studentHub.includes('href="/tools/crm"'),'Learner hub contains personal apps without teaching or CRM')
  const teacherHub=renderToStaticMarkup(React.createElement(AppView,{domain:{...on,applications:apps.allApplications,profile:profiles[0]},user:{id:3,role:'TEACHER'},name:'Brand'}))
  ok(teacherHub.includes('/ung-dung/teaching') && teacherHub.includes('href="/tools/crm"'),'Linked teacher hub contains teaching and own CRM')

  // Chuyển mẫu chỉ lưu lựa chọn, giữ nguyên cả nội dung cũ và thiết kế đã xuất bản.
  let customDocument={name:'Saved custom',pages:[{slug:''}]}
  const owned=async()=>{if(sessionId==null)throw new CrmError('Login',401);return profiles.find(p=>p.userId===sessionId)}
  const modeDb={...fake,siteWebsite:{findUnique:async()=>({published:customDocument})}}
  const modeLoad=loader({'@/lib/website/server':{ownedProfile:owned,publishedWebsite:async()=>customDocument},'@/lib/prisma':{__esModule:true,default:{...modeDb,$transaction:async fn=>fn(modeDb)}}})
  const presentation=modeLoad('lib/website/presentation-server'),modeApi=modeLoad('app/api/websites/presentation/route')
  const modePost=(body,hostname='giautoandien.io.vn',origin='https://'+hostname)=>modeApi.POST(req(body,hostname,origin))
  sessionId=1
  ok((await presentation.presentationState(7)).mode==='template','Retained free design cannot activate custom mode')
  ok((await modePost({mode:'template',revision:0},'brk.io.vn')).status===403,'Domain cannot administer presentation')
  ok((await modePost({mode:'template',revision:0},'giautoandien.io.vn','https://evil.invalid')).status===403,'Mode change rejects foreign origin')
  ok((await modePost({mode:'template',revision:0})).status===200,'Owner can select existing template')
  ok(customDocument.name==='Saved custom','Template mode preserves published design without rendering it')
  const templateDoc=await presentation.domainWebsite({...profiles[0],title:'Lucy',subtitle:'Intro',accentColor:'#123456',backgroundColor:'#f8fafc'})
  ok(templateDoc.name==='Lucy' && templateDoc.color==='#123456','Template works on domain with profile branding')
  ok((await modePost({mode:'template',revision:0})).status===409,'Stale mode revision cannot overwrite current selection')
  customDocument=null
  ok((await modePost({mode:'custom',revision:1})).status===410,'Free design cannot be selected')
  ok((await presentation.domainWebsite({...profiles[0],title:'Lucy'})).name==='Lucy','Template domain does not require a published custom design')
  customDocument={name:'Preserved design',pages:[{slug:''}]}
  ok((await modePost({mode:'custom',revision:1})).status===410,'Published free design cannot be reactivated')
  ok(customDocument.name==='Preserved design','Retiring free design preserves stored document')
  customDocument=null
  ok((await presentation.presentationState(7)).mode==='template','Unpublishing falls back to existing template instead of breaking domain')
  sessionId=null
  ok((await modeApi.GET(new Request('https://giautoandien.io.vn/api/websites/presentation',{headers:{host:'giautoandien.io.vn'}}))).status===401,'Presentation requires an authenticated owner')
  sessionId=1;configs.delete('website-presentation:7:v1')

  const testProfile={...profiles[0],title:'Lucy',courseIds:[]}
  const courseRows=courses.map(c=>({...c,name_lop:c.id_khoa,pin:0,_count:{enrollments:0,lessons:1}}))
  const allowedCourse=(c,where)=>!where || (!where.id?.in || where.id.in.includes(c.id)) && (!where.status || c.status) && (!where.OR || where.OR.some(w=>w.id?.in?.includes(c.id) || w.teacherId?.in?.includes(c.teacherId))) && (!where.teacherId?.in || where.teacherId.in.includes(c.teacherId))
  const scopedDb={...fake,
    course:{...fake.course,findMany:async({where})=>courseRows.filter(c=>allowedCourse(c,where))},
    siteProfile:{...fake.siteProfile,findFirst:async()=>testProfile,update:async({data})=>Object.assign(testProfile,data)},
    siteProfileMember:{findMany:async()=>[]},
    enrollment:{...fake.enrollment,findMany:async({where})=>{ok(where.userId===1 && !!where.course,'Template enrollment query is restricted to user and tenant');return []}},
    post:{findMany:async({where})=>{ok(where.authorId.in.includes(1) && !where.authorId.in.includes(2),'Template posts restrict author scope');return []}},
  }
  const dataLoad=loader({'@/lib/prisma':{__esModule:true,default:{...scopedDb,$transaction:async fn=>fn(scopedDb)}},'@/lib/website/server':{ownedProfile:async()=>testProfile},'next/cache':{revalidateTag:()=>{}}})
  const dataApi=dataLoad('app/api/websites/data/route')
  const dataPost=body=>dataApi.POST(req(body))
  ok((await dataPost({courseIds:[2]})).status===403,'Owner cannot add foreign teacher course')
  ok((await dataPost({courseIds:[1,3]})).status===200,'Owner can select own and linked teacher courses')
  ok(testProfile.courseIds.join(',')==='1,3','Shared course source stores selection')
  ok((await dataPost({courseIds:[]})).status===200 && !testProfile.courseIds.length,'Automatic mode restores teacher-based course scope')
  let templateProps
  const templateLoad=loader({
    // This suite exercises built-in home scoping; public template cache/SQL is covered separately.
    '@/lib/website/public-page-template':{readPublicPageTemplate:async()=>null},
    '@/lib/prisma':{__esModule:true,default:scopedDb},'@/lib/get-session':{getSession:async()=>({user:{id:'1',name:'Learner'}})},
    '@/components/home/HomePageClient':{__esModule:true,default:props=>{templateProps=props;return null}},
    '@/components/home/MessageCard':{__esModule:true,default:()=>null},
    '@/components/layout/MainHeader':{__esModule:true,default:()=>null},
    '@/components/home/FooterSection':{__esModule:true,default:()=>null},
    '@/components/home/SetHomeSlug':{__esModule:true,default:()=>null},
    '@/app/actions/site-profile-actions':{getCoursesForProfile:()=>{throw Error('No fallback data on domain')},getPostsForProfile:()=>{throw Error('No fallback posts on domain')}},
    '@/app/actions/message-actions':{},'@/app/actions/roadmap-actions':{},'@/app/actions/survey-actions':{resetSurveyAction:async()=>({})},
  })
  const TemplateHome=templateLoad('components/website/ProfileHome').default
  renderToStaticMarkup(await TemplateHome({profile:testProfile,customDomain:true,modules:on}))
  ok(templateProps.courses.every(c=>[1,3].includes(c.teacherId)) && templateProps.courses.length===2,'Template domain renders only tenant courses, without fallback')
  renderToStaticMarkup(await TemplateHome({profile:testProfile,customDomain:true,modules:off}))
  ok(!templateProps.courses.length && !templateProps.survey && !templateProps.roadmapPoints.length,'Disabled courses stay hidden and platform survey is not exposed')

  await authChecks();await verificationChecks()
  host='giautoandien.io.vn';await post({action:'disable',hostname:'brk.io.vn'});host='brk.io.vn';await rejects(()=>context.domainContext(),'Disabled domain closes immediately')
  ok((await proxy(routeRequest('/login'),{})).status===503,'Disabled domain cannot still serve login')
  host='giautoandien.io.vn';records[0].checkedAt=null;verification=async()=>{await post({action:'disable',hostname:'brk.io.vn'});return {valid:true,message:'Verified'}};await post({action:'check',hostname:'brk.io.vn'});ok(!records[0].enabled,'Disable during verification cannot be overwritten by late proof')
  console.log(`Custom domains: ${checks} checks passed (isolated DB, DNS/HTTPS mocks, real Auth.js credentials).`)
}
run().catch(error=>{console.error(error);process.exitCode=1})
