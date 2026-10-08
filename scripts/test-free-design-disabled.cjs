/* Kiểm tra bản Page chỉ dùng mẫu có sẵn; không truy cập DB thật. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript')
const root=path.resolve(__dirname,'..'),cache=new Map()
let writes=0,designReads=0
const saved={mode:'custom',revision:4},profile={id:7,userId:1,slug:'lucy',title:'Lucy',siteConfig:{homepage:{type:'website'},branding:{name:'Brand'},courseScope:{mode:'ids',courseIds:[8]}},members:[],user:{role:'ADMIN'}}
class CrmError extends Error{constructor(message,status=400){super(message);this.status=status}}
const db={user:{findUnique:async()=>({id:1})},siteProfile:{findUnique:async()=>profile},systemConfig:{findUnique:async({where})=>where.key.startsWith('website-pages:')?null:({value:saved})},siteWebsite:{findUnique:async()=>{designReads++;throw Error('Retained design must not be read')}},$transaction:async()=>{writes++;throw Error('Unexpected write')}}
function load(rel){
 let file=path.resolve(root,rel);if(!path.extname(file))file=fs.existsSync(file+'.ts')?file+'.ts':fs.existsSync(file+'.tsx')?file+'.tsx':path.join(file,'index.ts')
 if(file===path.join(root,'lib/crm/service.ts'))return {CrmError}
 if(cache.has(file))return cache.get(file).exports
 const mod={exports:{}};cache.set(file,mod)
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText
 new Function('require','exports','module',code)(name=>{
  if(name==='server-only')return {}
  if(name==='react')return {...require('react'),cache:fn=>fn}
  if(name==='@/auth')return {auth:async()=>({user:{id:'1',role:'ADMIN'}})}
  if(name==='@/lib/api-auth')return {requireAdminAction:async()=>null}
  if(name==='@/lib/prisma')return {__esModule:true,default:db}
  if(name==='@/lib/crm/service')return {CrmError}
  if(name==='@/app/actions/site-profile-actions')return {getCoursesForProfile:async()=>[],getPostsForProfile:async()=>[]}
  if(name==='next/cache')return {unstable_cache:fn=>fn,revalidateTag:()=>{},revalidatePath:()=>{}}
  if(name==='next/navigation')return {redirect:url=>{throw Error('redirect:'+url)}}
  if(name.startsWith('@/'))return load(name.slice(2))
  if(name.startsWith('.'))return load(path.relative(root,path.resolve(path.dirname(file),name)))
  return require(name)
 },mod.exports,mod);return mod.exports
}
const req=body=>new Request('https://giautoandien.io.vn/api/websites',{method:'POST',headers:{host:'giautoandien.io.vn',origin:'https://giautoandien.io.vn','Content-Type':'application/json'},body:JSON.stringify(body)})
async function run(){
 const config=load('lib/site-profile/config').getSiteRuntimeConfig(profile)
 assert.equal(config.homepage.type,'profile');assert.deepEqual(config.courseScope.courseIds,[8])
 assert.equal(profile.siteConfig.homepage.type,'website','Raw saved settings retained')
 const presentation=load('lib/website/presentation-server'),state=await presentation.presentationState(7)
 assert.equal(state.mode,'template');assert.equal(state.revision,4);assert.equal(state.customPublished,false)
 const domain=await presentation.domainWebsite(profile);assert.equal(domain.name,'Brand');assert.equal(domain.pages.length,1)
 const api=load('app/api/websites/route')
 assert.equal((await api.GET()).status,410)
 for(const action of ['save','publish','restore','unpublish'])assert.equal((await api.POST()).status,410)
 assert.equal((await load('app/api/websites/lead/route').POST()).status,410)
 for(const file of ['components/website/WebsiteEditor.tsx','components/website/WebsiteView.tsx','lib/website/free-design.ts'])assert.ok(!fs.existsSync(path.join(root,file)),file+' removed')
 const modes=load('app/api/websites/presentation/route')
 assert.equal((await modes.POST(req({mode:'custom',revision:4}))).status,410)
 const admin=load('app/actions/site-profile-actions')
 assert.ok((await admin.updateSiteProfileRuntime(7,{siteConfig:{homepage:{type:'website'}}})).error)
 assert.throws(()=>load('app/tools/my-site/design/page').default(),/redirect:\/tools\/my-site\/manage/)
 assert.equal(writes,0);assert.equal(designReads,0);assert.deepEqual(saved,{mode:'custom',revision:4})
 // Kiểm tra giao diện quản lý: mẫu có sẵn vẫn truy cập được, không còn lối mở trình thiết kế.
 const React=require('react'),{JSDOM}=require('jsdom'),{createRoot}=require('react-dom/client')
 const dom=new JSDOM('<div id="root"></div>',{url:'https://giautoandien.io.vn/tools/my-site/manage'})
 global.window=dom.window;global.document=dom.window.document;global.IS_REACT_ACT_ENVIRONMENT=true
 Object.defineProperty(global,'navigator',{value:dom.window.navigator,configurable:true})
 const access=load('lib/website/access'),apps=load('lib/website/applications')
 const flags={courses:true,crm:true,affiliate:true},applicationFlags={...apps.noApplications}
 global.fetch=async url=>({ok:true,json:async()=>url.endsWith('/presentation')?state:{profileId:7,name:'Brand',slug:'lucy',domains:[],admin:false,basic:flags,basicApplications:applicationFlags,access:{revision:0,base:flags,extra:flags,enabled:flags,applications:{base:applicationFlags,extra:applicationFlags,enabled:applicationFlags}}}})
 const ui=createRoot(document.getElementById('root'))
 await React.act(async()=>{ui.render(React.createElement(load('components/website/WebsiteManager').default));await new Promise(r=>setTimeout(r,0))})
 assert.ok(document.body.textContent.includes('Mẫu có sẵn'));assert.ok(!document.body.textContent.includes('Thiết kế tự do'))
 assert.ok(!document.querySelector('[href="/tools/my-site/design"]'));assert.ok(document.querySelector('[href="/tools/my-site/edit"]'))
 await React.act(async()=>ui.unmount());dom.window.close()
 console.log('Page templates-only: fallback, retained settings, removed editor and retired APIs, custom-domain document, admin guard and manager UI passed; no data writes.')
}
run().catch(e=>{console.error(e);process.exitCode=1})
