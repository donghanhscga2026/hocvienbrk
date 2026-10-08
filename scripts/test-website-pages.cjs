/* Isolated multi-page API, publication, template and menu checks; no live writes. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript')
const {gzipSync}=require('node:zlib'),{JSDOM}=require('jsdom'),{PGlite}=require('@electric-sql/pglite')
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server')
const root=path.resolve(__dirname,'..'),cache=new Map(),rows=new Map(),sql=new PGlite()
let userId=1,writes=0,checks=0
const check=(value,label)=>{assert.ok(value,label);checks++}
const profiles=[{id:7,userId:1,slug:'lucy',isActive:true,members:[],siteConfig:{}},{id:8,userId:2,slug:'other',isActive:true,members:[],siteConfig:{}}]
class CrmError extends Error{constructor(message,status=400){super(message);this.status=status}}
const config={findUnique:async({where})=>rows.has(where.key)?{value:rows.get(where.key)}:null,upsert:async({where,create,update})=>{writes++;rows.set(where.key,structuredClone(rows.has(where.key)?update.value:create.value))}}
const db={systemConfig:config,user:{findUnique:async()=>({id:userId})},siteProfile:{findUnique:async({where})=>profiles.find(p=>p.userId===where.userId)},course:{findMany:async()=>[]},$executeRaw:async()=>0,$transaction:async fn=>fn(db),$queryRaw:async(strings,...values)=>(await sql.query(strings.reduce((out,s,i)=>out+s+(i<values.length?'$'+(i+1):''),''),values)).rows}
const sourceCache=new Map()
function load(rel){
 let file=path.resolve(root,rel);if(!path.extname(file))file=fs.existsSync(file+'.ts')?file+'.ts':file+'.tsx'
 if(file===path.join(root,'lib/crm/service.ts'))return {CrmError}
 if(cache.has(file))return cache.get(file).exports
 const mod={exports:{}};cache.set(file,mod)
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText
 new Function('require','exports','module',code)(name=>{
  if(name==='server-only')return {}
  if(name==='react')return {...React,cache:fn=>fn}
  if(name==='@/lib/prisma')return {__esModule:true,default:db}
  if(name==='@/auth')return {auth:async()=>userId==null?null:{user:{id:String(userId)}}}
  if(name==='@/lib/crm/service')return {CrmError}
  if(name==='@/app/actions/site-profile-actions')return {getCoursesForProfile:async()=>[],getPostsForProfile:async()=>[],getSiteProfile:async slug=>profiles.find(p=>p.slug===slug && p.isActive)}
  if(name==='next/navigation')return {notFound:()=>{throw Error('404')},usePathname:()=>null}
  if(name==='next-auth/react')return {useSession:()=>({data:null}),signOut:()=>{}}
  if(name==='next/cache')return {unstable_cache:(fn,keys)=>async(...args)=>{const key=JSON.stringify([keys,args]);if(!sourceCache.has(key))sourceCache.set(key,Promise.resolve(fn(...args)));return sourceCache.get(key)}}
  if(name.startsWith('@/'))return load(name.slice(2))
  if(name.startsWith('.'))return load(path.relative(root,path.resolve(path.dirname(file),name)))
  return require(name)
 },mod.exports,mod);return mod.exports
}
const request=(body,slug='',host='giautoandien.io.vn',origin='https://'+host)=>new Request('https://'+host+'/api/websites/pages'+(slug?'/template?slug='+slug:''),{method:'POST',headers:{host,origin,'Content-Type':'application/json'},body:JSON.stringify(body)})
async function run(){
 const pages=load('lib/website/pages'),api=load('app/api/websites/pages/route'),templates=load('app/api/websites/pages/template/route')
 const page={slug:'gioi-thieu',title:'Giới thiệu',description:'About',body:'<script>not executable</script>',published:false,showInMenu:true}
 const body={version:1,revision:0,pages:[page],menu:[{label:'Giới thiệu',target:'page:gioi-thieu',visible:true,match:'#about'}]}
 for(const slug of ['khoa-hoc','tools','api','login','tai-khoan','ung-dung','../other','_next','courses','admin','page','hello/world'])check(!pages.pageSlugSchema.safeParse(slug).success,'Reserved or unsafe page slug '+slug)
 check((await api.POST(request(body))).status===200,'Owner can save a draft')
 check(rows.get(pages.websitePagesKey(7)).revision===1,'Revision increments')
 check((await api.POST(request(body))).status===409,'Stale revision rejected')
 const before=writes
 check((await api.POST(request({...body,revision:1},'',undefined,'https://evil.test'))).status===403,'Cross-origin writes rejected')
 check((await api.POST(request({...body,revision:1},'','brk.io.vn'))).status===403,'Brand hosts cannot edit platform configuration')
 check((await api.POST(request({...body,revision:1,profileId:8}))).status===400,'Foreign profile ID rejected')
 userId=null;check((await api.POST(request(body))).status===401,'Anonymous cannot edit')
 check(writes===before,'Rejected requests do not write')
 userId=2;const own=await (await api.GET(request(body))).json();check(own.content.pages.length===0,'Other teacher cannot read owner pages')
 userId=1
 const html='<html><body><header><nav><a href="#about">Old label</a></nav></header><h1>Keep title</h1><script>window.effect=1</script></body></html>'
 const apply={action:'apply',revision:0,name:'About',region:null,source:gzipSync(html).toString('base64')}
 check((await templates.POST(request(apply,'gioi-thieu'))).status===200,'Own draft accepts independent template without course slot')
 check((await templates.POST(request(apply,'gioi-thieu'))).status===409,'Template stale revision rejected')
 userId=2;check((await templates.GET(request({},'gioi-thieu'))).status===404,'Other teacher cannot read draft template');userId=1
 check((await templates.POST(request({...apply,revision:1,region:'missing'},'gioi-thieu'))).status===400,'Missing course slot rejected')
 const compiler=load('lib/website/page-template'),navigation=load('lib/website/template-navigation')
 const published={...rows.get(pages.websitePagesKey(7)),pages:[{...page,published:true}]}
 const links=pages.websiteNavigation(published,'lucy',true,{courses:true,tools:true})
 const doc=new JSDOM(navigation.connectTemplateNavigation(compiler.renderPageTemplate(html,null,[]),links)).window.document
 check(doc.querySelector('nav a').getAttribute('href')==='/gioi-thieu','Existing template anchor maps to own-domain page')
 check(doc.querySelector('nav a').getAttribute('data-system-course-link')==='/gioi-thieu','Exact trusted href sent through existing parent bridge')
 check(doc.querySelector('h1').textContent==='Keep title' && [...doc.scripts].some(s=>s.textContent==='window.effect=1'),'Title and effect script retained')
 check(pages.websiteNavigation({...published,pages:[page]},'lucy',true,{courses:true}).length===0,'Draft not linked')
 check(pages.websiteNavigation({...published,menu:[{label:'Tools',target:'tools',visible:true,match:''}]},'lucy',true,{courses:false,tools:false}).every(l=>l.href!=='/cong-cu'),'Disabled tools not linked')
 check(pages.websiteNavigation(published,'lucy',false,{courses:true})[0].href==='/page/lucy/gioi-thieu','Platform preview uses profile path')
 const ordered=new JSDOM(navigation.connectTemplateNavigation('<header><nav><ul><li><a href="#tools">Tools</a></li><li><a href="#about">About</a></li><li><a href="#hide">Hidden</a></li></ul></nav></header><script>window.keep=1</script>',[{title:'About',href:'/gioi-thieu',match:'#about'},{title:'Tools',href:'/cong-cu',match:'#tools'}],['#hide'])).window.document
 check([...ordered.querySelectorAll('nav a:not([hidden])')].map(a=>a.getAttribute('href')).join(',')==='/gioi-thieu,/cong-cu','Configured order moves existing wrapped navigation anchors')
 check(ordered.querySelector('[href="#hide"]').hidden,'Hidden configured template link is hidden')
 const fallback=new JSDOM(navigation.connectTemplateNavigation('<footer><nav>Keep footer</nav></footer>',links)).window.document
 check(fallback.querySelector('body>nav a').getAttribute('href')==='/gioi-thieu' && fallback.querySelector('footer').textContent==='Keep footer','Missing menu is inserted before content without replacing footer')
 const Content=load('components/website/WebsiteContentPage').default
 const markup=renderToStaticMarkup(React.createElement(Content,{page}))
 check(markup.includes('&lt;script&gt;') && !markup.includes('<script>'),'Plain text body cannot execute HTML')
 await sql.exec('CREATE TABLE "SiteProfile" (id integer PRIMARY KEY,"isActive" boolean);CREATE TABLE "SystemConfig" (key text PRIMARY KEY,value jsonb);INSERT INTO "SiteProfile" VALUES(7,true),(8,true)')
 const key=pages.contentTemplateKey(7,'gioi-thieu'),template=rows.get(key)
 await sql.query('INSERT INTO "SystemConfig" VALUES($1,$2)',[key,JSON.stringify(template)])
 const pub=load('lib/website/public-page-template')
 check(await pub.readPublicPageTemplate(7,'gioi-thieu')===null,'Draft template not exposed publicly')
 rows.set(pages.websitePagesKey(7),published)
 check((await pub.readPublicPageTemplate(7,'gioi-thieu')).source===template.source,'Published template loads by page revision')
 rows.set(pages.websitePagesKey(7),{...published,pages:[page]})
 check(await pub.readPublicPageTemplate(7,'gioi-thieu')===null,'Unpublish wins over warm persistent template cache')
 const publicRoute=load('app/page/[slug]/[pageSlug]/page')
 await assert.rejects(()=>publicRoute.default({params:Promise.resolve({slug:'lucy',pageSlug:'gioi-thieu'})}),/404/);checks++
 rows.set(pages.websitePagesKey(7),published)
 check((await publicRoute.default({params:Promise.resolve({slug:'lucy',pageSlug:'gioi-thieu'})})).props.html.includes('Keep title'),'Public page selects own template')
 const presentation=load('lib/website/presentation-server')
 rows.set(pages.websitePagesKey(7),{...published,menu:[],pages:[{...page,published:true,showInMenu:false}]})
 const documentConfig=await presentation.domainWebsite({...profiles[0],title:'Lucy'})
 check(documentConfig.pages.some(p=>p.slug==='gioi-thieu') && !documentConfig.navigation.some(l=>l.href==='/gioi-thieu'),'Published page can stay accessible while excluded from native automatic menu')
 rows.set(pages.websitePagesKey(7),published)
 const Shell=load('components/website/DomainShell').default,brand={name:'Lucy',color:'#7c3aed',background:'#ffffff',ownerId:1,courses:true,crm:false,affiliate:false}
 const shell=renderToStaticMarkup(React.createElement(Shell,{brand,pages:[{title:'About',slug:'gioi-thieu'}],path:'/gioi-thieu',importedHome:true},'Imported content'))
 check(!shell.includes('<header') && !shell.includes('<footer') && !shell.includes('Đường dẫn trang'),'Imported subpage uses its own complete template chrome')
 const native=renderToStaticMarkup(React.createElement(Shell,{brand,path:'/khoa-hoc/OWN',importedHome:true},'Course'))
 check(native.includes('<header') && native.includes('<footer'),'Internal course pages keep the system shell')
 const fontHtml='<style>@font-face{src:url(data:font/ttf;base64,'+Buffer.alloc(4000,42).toString('base64')+')}</style>'
 check(load('lib/website/page-template-assets').externalizePageAssets(fontHtml,7,1,'gioi-thieu').html.includes('?page=gioi-thieu'),'Subpage asset URL keeps the independent template identity')
 check((await templates.POST(request({action:'builtin',revision:1},'gioi-thieu'))).status===200,'Owner can switch to plain content without deleting source')
 check(rows.get(key).source===template.source && !rows.get(key).active,'Old template retained on switch')
 const uiDom=new JSDOM('<div id="root"></div>',{url:'https://giautoandien.io.vn/tools/my-site/pages'})
 global.window=uiDom.window;global.document=uiDom.window.document;global.IS_REACT_ACT_ENVIRONMENT=true
 Object.defineProperty(global,'navigator',{value:uiDom.window.navigator,configurable:true})
 global.fetch=async(url,options={})=>url==='/api/websites/pages'?options.method==='POST'?api.POST(request(JSON.parse(options.body))):api.GET(request({})):new Response(null,{status:404})
 const {createRoot}=require('react-dom/client'),ui=createRoot(document.getElementById('root'))
 await React.act(async()=>{ui.render(React.createElement(load('components/website/WebsitePagesManager').default));await new Promise(r=>setTimeout(r,0))})
 check(document.querySelector('[href="/tools/my-site/pages/gioi-thieu/template"]'),'Saved page exposes its own native template importer')
 const findButton=text=>[...document.querySelectorAll('button')].find(b=>b.textContent===text)
 await React.act(async()=>findButton('+ Thêm mục menu').click())
 check(!document.querySelector('[href="/tools/my-site/pages/gioi-thieu/template"]'),'Unsaved changes block leaving for importer')
 check(document.querySelector('input[value="gioi-thieu"]').disabled,'Saved page slug stays stable')
 await React.act(async()=>{findButton('Lưu trang & menu').click();await new Promise(r=>setTimeout(r,0))})
 check(document.body.textContent.includes('Đã lưu trang và menu'),'Save button persists configuration through authenticated owner API')
 check(rows.get(pages.websitePagesKey(7)).menu.length===2,'UI save writes menu belonging to current owner')
 check(document.querySelector('[href="/tools/my-site/pages/gioi-thieu/template"]'),'Importer link restored after successful save')
 await React.act(async()=>ui.unmount());uiDom.window.close()
 await sql.close()
 console.log('Website pages:',checks,'checks passed: tenant isolation, drafts, revisions, origin, reserved routes, templates, trusted menu, source cache, text escaping and public routing; no live writes.')
}
run().catch(e=>{console.error(e);process.exitCode=1})
