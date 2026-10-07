/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS test harness. */
/* Regression tests for the two website branches. Only mocks and an isolated database are used. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript')
const {PGlite}=require('@electric-sql/pglite')
const root=path.resolve(__dirname,'..')
let checks=0,host='giautoandien.io.vn',forwarded='spoof.example'
const ok=(value,label)=>{assert.ok(value,label);checks++}
let profile={id:7,userId:1,title:'Brand',slug:'brand',isActive:true,members:[{userId:3}],courseIds:[],siteConfig:null,user:{role:'ADMIN'},theme:null}
let verified=null,managed=null,custom=null,configRow=null
const courses=[{id:1,teacherId:1,categoryId:10,status:true},{id:2,teacherId:2,categoryId:20,status:true},{id:3,teacherId:3,categoryId:10,status:true},{id:4,teacherId:1,categoryId:10,status:false}]
function matches(record,where){
 return Object.entries(where).every(([key,value])=>key==='AND'?value.every(v=>matches(record,v)):key==='OR'?value.some(v=>matches(record,v)):value && typeof value==='object' && 'in' in value?value.in.includes(record[key]):record[key]===value)
}
const configurations=new Map()
const fake={
 siteDomain:{findUnique:async({where})=>verified?.hostname===where.hostname?{...verified,profile}:null,findMany:async()=>verified?[verified]:[],findFirst:async()=>verified},
 siteProfileDomain:{findUnique:async({where})=>managed?.hostname===where.hostname?{...managed,profile}:null,findMany:async()=>managed?[managed]:[],findFirst:async()=>managed},
 siteProfile:{findUnique:async()=>profile,findFirst:async()=>profile,update:async({data})=>Object.assign(profile,data)},
 siteWebsite:{findUnique:async()=>({published:custom})},
 systemConfig:{findUnique:async({where})=>where.key==='website-access:7'?configRow:configurations.has(where.key)?{value:configurations.get(where.key)}:null,upsert:async({where,create,update})=>{const value=configurations.has(where.key)?update.value:create.value;configurations.set(where.key,value);return {value}}},
 course:{findFirst:async({where})=>courses.find(c=>matches(c,where)) || null,findUnique:async({where})=>courses.find(c=>where.id!=null?c.id===where.id:where.id_khoa==='C'+c.id)},
 $executeRaw:async()=>1,
}
fake.$transaction=async fn=>fn(fake)
class CrmError extends Error{constructor(message,status=400){super(message);this.status=status}}
function loader(overrides={}){
 const cache=new Map()
 function load(relative){
  let file=path.resolve(root,relative)
  if(!fs.existsSync(file))file+=fs.existsSync(file+'.ts')?'.ts':'.tsx'
  if(file===path.join(root,'lib/crm/service.ts'))return {CrmError}
  if(cache.has(file))return cache.get(file).exports
  const mod={exports:{}};cache.set(file,mod)
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText
  new Function('require','exports','module',code)(name=>{
   if(name in overrides)return overrides[name]
   if(name==='server-only')return {}
   if(name==='next/cache')return {unstable_cache:fn=>fn,revalidateTag:()=>{},revalidatePath:()=>{}}
   if(name==='react')return {...require('react'),cache:fn=>fn}
   if(name==='next/headers')return {headers:async()=>new Headers({host,'x-forwarded-host':forwarded})}
   if(name==='@/lib/prisma')return {__esModule:true,default:fake}
   if(name==='@/lib/crm/service')return {CrmError}
   if(name==='@/lib/website/server')return {ownedProfile:async()=>profile,publishedWebsite:async()=>custom}
   if(name.startsWith('@/'))return load(name.slice(2))
   if(name.startsWith('.'))return load(path.relative(root,path.resolve(path.dirname(file),name)))
   return require(name)
  },mod.exports,mod)
  return mod.exports
 }
 return load
}
const load=loader(),runtime=load('lib/site-profile/runtime'),scope=load('lib/site-profile/config'),domains=load('lib/website/domains')
async function run(){
 const base={...profile}
 for(const [mode,settings,allowed] of [
  ['profile',{},[1,3]],
  ['ids',{courseIds:[2]},[2]],
  ['teacher',{teacherIds:[3]},[3]],
  ['category',{categoryIds:[10]},[1,3]],
  ['all',{},[1,2,3]],
 ]){
  const p={...base,siteConfig:{courseScope:{mode,...settings}}}
  for(const c of courses){
   const expected=allowed.includes(c.id)
   ok(scope.courseBelongsToProfile(p,c)===expected,'Direct guard: '+mode+' / '+c.id)
   ok((await runtime.canProfileAccessCourse(p,c.id))===expected,'Query guard: '+mode+' / '+c.id)
  }
 }
 const empty={...base,courseIds:[1],siteConfig:{courseScope:{mode:'ids',courseIds:[]}}}
 ok(!(await runtime.canProfileAccessCourse(empty,1)),'Empty explicit IDs cannot fall back to old course IDs')
 const disabled={...base,siteConfig:{modules:{courses:false}}}
 for(const c of courses)ok(!(await runtime.canProfileAccessCourse(disabled,c.id)),'Disabled course module rejects direct course '+c.id)
 ok(!scope.courseBelongsToProfile({...base,userId:null,members:[],courseIds:[],siteConfig:{courseScope:{mode:'profile'}}},courses[0]),'Profile without teachers cannot leak all courses')
 managed={hostname:'team.example',profileId:7,isActive:true,createdAt:new Date()}
 host='team.example'
 ok((await domains.activeDomain(host)).profileId===7,'Trusted admin domain resolves through shared router')
 ok((await runtime.getCurrentSiteProfile()).id===7,'Runtime uses same profile as router')
 host='unknown.example';ok(await runtime.getCurrentSiteProfile()===null,'Unregistered host cannot fall back to default')
 host='team.example';forwarded='unknown.example';ok((await runtime.getCurrentSiteProfile()).id===7,'Spoofed forwarded host is ignored')
 managed.isActive=false;ok(await domains.activeDomain(host)===null,'Disabled admin domain closes immediately')
 managed.isActive=true
 verified={hostname:host,profileId:7,enabled:false,verifiedAt:new Date(),courses:true,crm:true,affiliate:true}
 ok(await domains.activeDomain(host)===null,'Disabled verified domain cannot reopen via admin registry')
 verified.enabled=true;managed.profileId=8
 ok(await domains.activeDomain(host)===null,'Conflicting hostname ownership fails closed')
 verified=null;managed.profileId=7
 const access=load('lib/website/access')
 configRow={value:access.accessSchema.parse({version:1,revision:1,base:{courses:true,crm:true,affiliate:true},extra:access.noModules,enabled:{courses:false,crm:true,affiliate:false}})}
 let active=await domains.activeDomain(host)
 ok(!active.courses && active.crm && !active.affiliate,'Assigned package supersedes old module flags')
 ok(!scope.getSiteRuntimeConfig(active.profile).modules.courses,'List scope sees the same disabled course flag')
 ok(Object.values(active.applications).every(v=>!v),'Admin domains do not silently grant connectors')
 configRow=null
 const mode=load('app/api/websites/presentation/route'),presentation=load('lib/website/presentation-server')
 const request=body=>new Request('https://giautoandien.io.vn/api/websites/presentation',{method:'POST',headers:{host:'giautoandien.io.vn',origin:'https://giautoandien.io.vn','Content-Type':'application/json'},body:JSON.stringify(body)})
 custom={name:'Custom design',pages:[{slug:''}]};host='giautoandien.io.vn'
 let response=await mode.POST(request({mode:'template',revision:0}))
 ok(response.status===200,'Template selection succeeds')
 ok(profile.siteConfig.homepage.type==='profile','Template selection updates admin homepage')
 response=await mode.POST(request({mode:'custom',revision:1}))
 ok(response.status===410 && profile.siteConfig.homepage.type==='profile','Removed free design cannot change homepage')
 ok((await presentation.presentationState(7)).mode==='template','Renderer uses built-in template')
 ok((await mode.POST(request({mode:'template',revision:0}))).status===409,'Stale presentation write is rejected')
 configurations.clear();profile.siteConfig={homepage:{type:'profile'}}
 ok((await presentation.presentationState(7)).mode==='template','Existing admin homepage wins over a retained published design')
 profile.siteConfig={homepage:{type:'website'}}
 ok((await presentation.presentationState(7)).mode==='template','Legacy free-design setting uses built-in template')
 custom=null
 ok((await presentation.presentationState(7)).mode==='template','Unpublished custom design falls back safely')
 profile.siteConfig=null
 // Admin homepage writes synchronize the owner's presentation revision.
 const registry=[{hostname:'old.example',profileId:7,isPrimary:true,isActive:true}]
 let occupied=false
 const adminDb={...fake,siteDomain:{findMany:async()=>occupied?[{hostname:'new.example'}]:[]},siteProfileDomain:{
  findMany:async({where})=>registry.filter(d=>where.hostname.in.includes(d.hostname) && d.profileId!==where.NOT.profileId),
  updateMany:async()=>{registry.forEach(d=>d.isPrimary=false);return {count:registry.length}},
  deleteMany:async({where})=>{for(let i=registry.length-1;i>=0;i--)if(!where.hostname.notIn.includes(registry[i].hostname))registry.splice(i,1);return {count:0}},
  upsert:async({where,create,update})=>{const row=registry.find(d=>d.hostname===where.hostname);const value=row?update:create;if(value.isPrimary && registry.some(d=>d.isPrimary && d.hostname!==where.hostname))throw Error('Duplicate primary');if(row)Object.assign(row,value);else registry.push({...value});return row || value},
 }}
 adminDb.$transaction=async fn=>fn(adminDb)
 const adminLoad=loader({'@/lib/prisma':{__esModule:true,default:adminDb},'@/lib/api-auth':{requireAdminAction:async()=>null},'@/auth':{auth:async()=>({user:{id:'1',role:'ADMIN'}})}})
 const admin=adminLoad('app/actions/site-profile-actions')
 let result=await admin.updateSiteProfileRuntime(7,{primaryDomain:'new.example',additionalDomains:['old.example'],siteConfig:{homepage:{type:'profile'}}})
 ok(result.success,'Admin can switch primary domain without unique index collision')
 ok(registry.find(d=>d.hostname==='new.example').isPrimary && !registry.find(d=>d.hostname==='old.example').isPrimary,'Only the chosen primary is marked')
 ok(configurations.get('website-presentation:7:v1').mode==='template','Admin homepage writes use shared presentation state')
 const revision=configurations.get('website-presentation:7:v1').revision
 ok((await mode.POST(request({mode:'template',revision:revision-1}))).status===409,'Admin update invalidates stale owner editor revision')
 const previousRegistry=JSON.stringify(registry)
 profile.siteConfig={homepage:{type:'landing',landingSlug:'saved-sales'},courseScope:{mode:'teacher',teacherIds:[3]},modules:{tools:false}}
 result=await admin.updateSiteProfileRuntime(7,{siteConfig:{branding:{name:'Updated'}}})
 ok(result.success && JSON.stringify(registry)===previousRegistry,'Brand-only save preserves domain rows and primary flags')
 ok(profile.siteConfig.homepage.landingSlug==='saved-sales' && profile.siteConfig.courseScope.teacherIds[0]===3 && profile.siteConfig.modules.tools===false,'Removed controls retain their existing configuration')
 ok(configurations.get('website-presentation:7:v1').revision===revision,'Brand-only save does not switch homepage presentation')
 ok(!(await admin.getSiteProfileAdminById(7)).communityAvailable,'Landing does not offer a community checkbox')
 profile.siteConfig={homepage:{type:'profile'}}
 ok((await admin.getSiteProfileAdminById(7)).communityAvailable,'Built-in template offers its community board')
 const {blankDocument,makeNode}=load('lib/website/document')
 custom=blankDocument('Test')
 profile.siteConfig={homepage:{type:'website'}}
 ok((await admin.getSiteProfileAdminById(7)).communityAvailable,'Legacy free design uses built-in community board')
 const container=makeNode('container');container.children=[makeNode('posts')];custom.pages[0].nodes=[container]
 ok((await admin.getSiteProfileAdminById(7)).communityAvailable,'Nested published posts block enables community control')
 custom=null
 occupied=true;result=await admin.updateSiteProfileRuntime(7,{primaryDomain:'new.example'})
 ok(!!result.error,'Admin cannot claim a hostname from the verified registry')
 profile.siteConfig=null
 // Both migrations coexist and the team migration remains repeatable.
 const pg=new PGlite()
 try{
  await pg.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE TABLE "SiteProfile" (id INTEGER PRIMARY KEY); INSERT INTO "SiteProfile" VALUES (7);')
  await pg.exec(fs.readFileSync(root+'/prisma/migrations/20261005063000_site_domains/migration.sql','utf8'))
  const sql=fs.readFileSync(root+'/prisma/migrations/20261005193000_db_driven_multisite/migration.sql','utf8')
  await pg.exec(sql);await pg.exec(sql)
  await pg.exec('INSERT INTO "SiteDomain" (hostname,"profileId",token) VALUES (\'verified.example\',7,\'token\'); INSERT INTO "SiteProfileDomain" ("profileId",hostname) VALUES (7,\'team.example\');')
  ok((await pg.query('SELECT count(*)::int n FROM "SiteDomain"')).rows[0].n===1,'Verified domains remain available after combined migrations')
  ok((await pg.query('SELECT count(*)::int n FROM "SiteProfileDomain"')).rows[0].n===1,'Admin registry retained independently')
  for(const role of ['anon','authenticated'])for(const table of ['SiteDomain','SiteProfileDomain'])ok(!(await pg.query('SELECT has_table_privilege($1,$2,\'SELECT\') allowed',[role,'"'+table+'"'])).rows[0].allowed,'No public read of '+table+' for '+role)
 }finally{await pg.close()}
 console.log('Multisite integration: '+checks+' checks passed (no live database writes).')
}
run().catch(e=>{console.error(e);process.exitCode=1})
