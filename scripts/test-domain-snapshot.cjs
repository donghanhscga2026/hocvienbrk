/* SQL thật trong PostgreSQL cô lập; không ghi vào DB đang chạy. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript')
const {PGlite}=require('@electric-sql/pglite')
const root=path.resolve(__dirname,'..')
async function run(){
  const db=new PGlite();let calls=0,checks=0,queryError=null
  const ok=(condition,label)=>{assert.ok(condition,label);checks++}
  const fake={$queryRaw:async(strings,...values)=>{
    calls++;if(queryError)throw queryError
    const sql=strings.reduce((text,part,index)=>text+(index ? '$'+index : '')+part,'')
    return (await db.query(sql,values)).rows
  },systemConfig:{findUnique:async()=>{throw new Error('Extra access query')}},siteDomain:{findUnique:async()=>{throw new Error('Extra domain query')}},siteProfileDomain:{findUnique:async()=>{throw new Error('Extra legacy query')}}}
  const modules=new Map()
  function load(relative){
    let file=path.resolve(root,relative);if(!fs.existsSync(file))file+='.ts'
    if(modules.has(file))return modules.get(file).exports
    const module={exports:{}};modules.set(file,module)
    const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText
    new Function('require','exports','module',js)(name=>{
      if(name==='server-only')return {}
      if(name==='react')return {cache:fn=>fn}
      if(name==='@/lib/prisma')return {__esModule:true,default:fake}
      if(name.startsWith('@/'))return load(name.slice(2))
      if(name.startsWith('.'))return load(path.relative(root,path.resolve(path.dirname(file),name)))
      return require(name)
    },module.exports,module)
    return module.exports
  }
  await db.exec(`
    CREATE TABLE "SiteProfile"(id integer PRIMARY KEY,"userId" integer,slug text,"isActive" boolean,"themeId" text,"siteConfig" jsonb,"createdAt" timestamp,"updatedAt" timestamp);
    CREATE TABLE "Theme"(id text PRIMARY KEY,"createdAt" timestamp,"updatedAt" timestamp);
    CREATE TABLE "SiteProfileMember"(id integer PRIMARY KEY,"profileId" integer,"userId" integer,role text,"createdAt" timestamp);
    CREATE TABLE "SiteDomain"(hostname text PRIMARY KEY,"profileId" integer,token text,enabled boolean,courses boolean,crm boolean,affiliate boolean,"verifiedAt" timestamp,"checkedAt" timestamp,message text,"createdAt" timestamp,"updatedAt" timestamp);
    CREATE TABLE "SiteProfileDomain"(id integer PRIMARY KEY,hostname text UNIQUE,"profileId" integer,"isActive" boolean,"isPrimary" boolean,"createdAt" timestamp,"updatedAt" timestamp);
    CREATE TABLE "SystemConfig"(key text PRIMARY KEY,value jsonb);
    INSERT INTO "Theme" VALUES('theme','2026-10-08 01:00:00','2026-10-08 01:00:00');
    INSERT INTO "SiteProfile" VALUES(7,1,'owner',true,'theme','{}','2026-10-08 01:00:00','2026-10-08 01:00:00'),(8,2,'other',true,NULL,'{}','2026-10-08 01:00:00','2026-10-08 01:00:00');
    INSERT INTO "SiteProfileMember" VALUES(1,7,3,'ASSOCIATE','2026-10-08 01:00:00');
    INSERT INTO "SiteDomain" VALUES('brk.io.vn',7,'token',true,true,false,false,'2026-10-08 01:00:00',NULL,'Verified','2026-10-08 01:00:00','2026-10-08 01:00:00');
    INSERT INTO "SiteProfileDomain" VALUES(1,'brk.io.vn',7,true,true,'2026-10-08 01:00:00','2026-10-08 01:00:00');
  `)
  const {activeDomain,findDomain}=load('lib/website/domains.ts')
  const {domainSnapshot}=load('lib/website/domain-snapshot.ts')
  const {initialAccess,noModules}=load('lib/website/access.ts')
  const {noApplications}=load('lib/website/applications.ts')
  let before=calls,domain=await activeDomain('BRK.IO.VN:443')
  ok(calls-before===1,'Domain, related profile and access use one DB round trip')
  ok(domain.hostname==='brk.io.vn' && domain.profile.userId===1,'Verified domain selects its exact owner')
  ok(domain.profile.members.length===1 && domain.profile.members[0].userId===3,'Profile membership scope survives SQL hydration')
  ok(domain.profile.theme.id==='theme','Theme is hydrated with the owning profile')
  ok(domain.verifiedAt instanceof Date && domain.profile.createdAt.toISOString()==='2026-10-08T01:00:00.000Z','SQL JSON timestamps retain UTC and Prisma Date shape')
  ok(domain.profile.members[0].createdAt instanceof Date && domain.profile.theme.updatedAt instanceof Date,'Relation timestamps retain Date shape')
  ok(domain.applications.teaching===false,'Missing access does not grant applications')
  const access=initialAccess({courses:true,crm:false,affiliate:false})
  access.enabled.courses=false
  await db.query('INSERT INTO "SystemConfig" VALUES($1,$2)', ['website-access:7',JSON.stringify(access)])
  before=calls;domain=await activeDomain('brk.io.vn')
  ok(calls-before===1 && domain.courses===false && domain.profile.siteConfig.modules.courses===false,'Saved package access overrides legacy modules in the same snapshot')
  access.enabled.courses=true;access.applications={base:{...noApplications,teaching:true},extra:{...noApplications},enabled:{...noApplications,teaching:true}}
  await db.query('UPDATE "SystemConfig" SET value=$1 WHERE key=$2',[JSON.stringify(access),'website-access:7'])
  domain=await activeDomain('brk.io.vn')
  ok(domain.courses && domain.applications.teaching,'Later requests observe changed modules and applications')
  await db.query('UPDATE "SystemConfig" SET value=$1 WHERE key=$2',['null','website-access:7'])
  await assert.rejects(()=>activeDomain('brk.io.vn'));checks++
  access.enabled={...noModules};access.applications.enabled={...noApplications}
  await db.query('UPDATE "SystemConfig" SET value=$1 WHERE key=$2',[JSON.stringify(access),'website-access:7'])
  domain=await activeDomain('brk.io.vn')
  ok(!domain.courses && !domain.applications.teaching,'Revocation is immediate, with no cross-request permission cache')
  await db.exec('UPDATE "SiteProfileDomain" SET "profileId"=8')
  ok(await activeDomain('brk.io.vn')===null,'Conflicting verified and managed owners fail closed')
  await db.exec('UPDATE "SiteProfileDomain" SET "profileId"=7; UPDATE "SiteDomain" SET enabled=false')
  ok(await activeDomain('brk.io.vn')===null && !(await findDomain('brk.io.vn')).enabled,'Disabled verified records never fall back to active managed records')
  await db.exec('UPDATE "SiteDomain" SET enabled=true,"verifiedAt"=NULL')
  ok(await activeDomain('brk.io.vn')===null,'Unverified self-service domains remain blocked')
  await db.exec('DELETE FROM "SiteDomain"; DELETE FROM "SystemConfig"')
  domain=await activeDomain('brk.io.vn')
  ok(domain.enabled && domain.profileId===7 && domain.verifiedAt instanceof Date,'Administrator-managed legacy domains remain available')
  await db.exec('UPDATE "SiteProfileDomain" SET "isActive"=false')
  ok(await activeDomain('brk.io.vn')===null,'Disabled managed domains are blocked')
  await db.exec('UPDATE "SiteProfileDomain" SET "isActive"=true; UPDATE "SiteProfile" SET "isActive"=false WHERE id=7')
  ok(await activeDomain('brk.io.vn')===null,'Inactive owning profiles are blocked')
  ok(await activeDomain('unknown.vn')===null,'Unknown hosts cannot resolve a tenant')
  ok(await activeDomain("x' OR true; --")===null,'Hostname is parameterized rather than interpolated into SQL')
  before=calls;ok(await activeDomain('giautoandien.io.vn')===null && calls===before,'Platform requests do not query custom-domain state')
  queryError={code:'P2010',meta:{code:'42P01'}}
  ok(await domainSnapshot('brk.io.vn')===null,'Missing legacy tables retain the existing resolver fallback')
  queryError=new Error('Connection failure')
  await assert.rejects(()=>domainSnapshot('brk.io.vn'),/Connection failure/);checks++
  await db.close();console.log('Domain snapshot: '+checks+' SQL and authorization checks passed.')
}
run().catch(error=>{console.error(error);process.exitCode=1})
