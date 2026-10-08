/* In-memory API/DOM tests. Never connects to or writes a live database. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript'),{gzipSync}=require('node:zlib'),{JSDOM}=require('jsdom')
const root=path.resolve(__dirname,'..'),cache=new Map(),entries=new Map()
let user=1,profileId=7,coursesEnabled=true,query=null,writes=0
class CrmError extends Error{constructor(message,status=400){super(message);this.status=status}}
const profiles=[{id:7,userId:1,isActive:true,slug:'one',siteConfig:{courseScope:{mode:'all'},modules:{courses:true}}},{id:8,userId:2,isActive:true,slug:'two',siteConfig:{courseScope:{mode:'all'},modules:{courses:true}}}]
const db={
 systemConfig:{findUnique:async({where})=>entries.get(where.key)||null,upsert:async({where,create,update})=>{writes++;entries.set(where.key,{value:entries.has(where.key)?update.value:create.value})}},
 course:{findMany:async args=>{query=args;return [{id:11,id_khoa:'REAL',name_khoa:'Khóa học thật <safe>',name_lop:'Class',mo_ta_ngan:'<b>Mô tả thật</b>',link_anh_bia:'/real.png'}]}},
 $executeRaw:async()=>{},$transaction:async fn=>fn(db),
}
function load(rel){
 let file=path.resolve(root,rel);if(!path.extname(file))file=fs.existsSync(file+'.ts')?file+'.ts':file+'.tsx'
 if(file===path.join(root,'lib/crm/service.ts'))return {CrmError}
 if(cache.has(file))return cache.get(file).exports
 const mod={exports:{}};cache.set(file,mod)
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText
 new Function('require','exports','module',code)(name=>{
  if(name==='server-only')return {}
  if(name==='@/lib/prisma')return {__esModule:true,default:db}
  if(name==='@/lib/crm/service')return {CrmError}
  if(name==='@/lib/website/server')return {ownedProfile:async()=>{if(!user)throw new CrmError('Login',401);return profiles.find(p=>p.id===profileId)}}
  if(name==='@/lib/website/http')return {websiteFailure:e=>new Response(JSON.stringify({error:e.message}),{status:e instanceof CrmError?e.status:e.name==='ZodError'?400:500})}
  if(name.startsWith('@/'))return load(name.slice(2))
  if(name.startsWith('.'))return load(path.relative(root,path.resolve(path.dirname(file),name)))
  return require(name)
 },mod.exports,mod);return mod.exports
}
const fixture=`<!doctype html><html><head><script>window.effectsKept=true</script><style>.courses{display:grid}</style></head><body><h1 id="hero">My brand</h1><section id="khoa-hoc"><h2>Courses heading</h2><button class="filter" data-filter="coaching">Fake filter</button><div id="courses" class="courses"><article class="course reveal" data-category="retreat"><div class="course-cover"><span class="cover-index">01</span><span class="cover-title">Sample title</span><span class="cover-tag">Sample tag</span></div><div class="course-body"><span class="course-category">Fake category</span><h3>Sample title</h3><p>Sample description</p><span class="price">9.999.999đ</span><button class="detail-btn" onclick="throw Error('old handler')">Details</button></div></article></div></section><script>document.querySelectorAll('.detail-btn').forEach(b=>b.addEventListener('click',()=>window.wrongModal=true))</script><script data-mfc-zip-bridge>window.wrongBridge=true</script><script src="https://bad.invalid/tracking.js"></script></body></html>`
const source=gzipSync(fixture).toString('base64')
const request=(body,origin='https://giautoandien.io.vn',host='giautoandien.io.vn')=>new Request('https://'+host+'/api/websites/page-template',{method:body?'POST':'GET',headers:{host,origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})})
async function run(){
 const compiler=load('lib/website/page-template'),server=load('lib/website/page-template-server'),api=load('app/api/websites/page-template/route')
 const courses=await server.pageCourses(profiles[0]);assert.deepEqual(query.where,{AND:[{status:true},{teacherId:1}]});assert.equal(courses[0].href,'https://giautoandien.io.vn/khoa-hoc/REAL')
 assert.equal('teacherBankAccount' in query.select,false)
 profiles[0].siteConfig.modules.courses=false;assert.deepEqual(server.pageCourseWhere(profiles[0]),{AND:[{id:-1},{teacherId:1}]});profiles[0].siteConfig.modules.courses=true
 assert.deepEqual(await server.pageCourses(profiles[0],false),[])
 assert.deepEqual(await server.pageCourses({userId:null}),[])
 const html=compiler.renderPageTemplate(fixture,'courses',courses)
 const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://preview.invalid'}),doc=dom.window.document,events=[]
 dom.window.parent.postMessage=e=>events.push(e)
 assert.equal(doc.querySelector('head').firstElementChild.httpEquiv,'Content-Security-Policy')
 assert.equal(doc.querySelectorAll('#courses .course').length,1);assert.equal(doc.querySelector('#courses h3').textContent,courses[0].title)
 assert.equal(doc.querySelector('#courses h3 safe'),null);assert.ok(!doc.querySelector('#courses').textContent.includes('9.999.999'))
 assert.equal(doc.querySelector('#courses p').textContent,'Mô tả thật');assert.equal(doc.querySelector('#hero').textContent,'My brand');assert.equal(doc.querySelector('#khoa-hoc h2').textContent,'Courses heading')
 assert.equal(doc.querySelector('.filter').hidden,true);assert.equal(doc.querySelectorAll('[data-mfc-zip-bridge],script[src],[onclick]').length,0)
 assert.equal(dom.window.effectsKept,true);doc.querySelector('.detail-btn').click();assert.equal(dom.window.wrongModal,undefined);assert.equal(events[0].href,courses[0].href)
 assert.ok(doc.querySelector('.course').classList.contains('visible'));dom.window.close()
 const empty=new JSDOM(compiler.renderPageTemplate(fixture,'courses',[]));assert.ok(empty.window.document.querySelector('#courses').textContent.includes('Chưa có'));assert.ok(!empty.window.document.querySelector('#courses').textContent.includes('Sample'));empty.window.close()
 assert.throws(()=>compiler.renderPageTemplate(fixture,'missing',[]),/duy nhất/)
 assert.throws(()=>compiler.renderPageTemplate(fixture.replace('id="hero"','id="courses"'),'courses',[]),/duy nhất/)
 assert.throws(()=>compiler.renderPageTemplate(fixture,'hero',[]),/duy nhất/)
 const appended=new JSDOM(compiler.renderPageTemplate('<h1>Generic</h1>','__append__',courses));assert.equal(appended.window.document.querySelector('.system-course-card h3').textContent,courses[0].title);appended.window.close()
 assert.equal(server.decodePageSource(source),fixture);assert.throws(()=>server.decodePageSource('invalid!'))
 assert.throws(()=>server.decodePageSource(gzipSync('x'.repeat(compiler.PAGE_HTML_LIMIT+1)).toString('base64')))
 const apply={action:'apply',revision:0,name:'Test HTML',region:'courses',source}
 user=null;assert.equal((await api.GET(request())).status,401);user=1
 assert.equal((await api.POST(request(apply,'https://evil.invalid'))).status,403)
 assert.equal((await api.POST(request({...apply,profileId:8}))).status,400)
 assert.equal((await api.POST(request(apply,undefined,'owner.example'))).status,403)
 profiles[0].isActive=false;assert.equal((await api.POST(request(apply))).status,403);profiles[0].isActive=true
 assert.equal((await api.POST(request({...apply,region:'missing'}))).status,400)
 assert.equal(writes,0)
 assert.equal((await api.POST(request(apply))).status,200);assert.equal(entries.get(compiler.pageTemplateKey(7)).value.active,true)
 assert.equal((await api.POST(request(apply))).status,409)
 const summary=await (await api.GET(new Request('https://giautoandien.io.vn/api/websites/page-template?summary=1',{headers:{host:'giautoandien.io.vn'}}))).json();assert.equal(summary.template.active,true);assert.equal(summary.template.source,undefined)
 profileId=8;user=2;assert.equal((await (await api.GET(request())).json()).template,null);profileId=7;user=1
 assert.equal((await api.POST(request({action:'builtin',revision:1}))).status,200);assert.equal(entries.get(compiler.pageTemplateKey(7)).value.active,false);assert.equal(entries.get(compiler.pageTemplateKey(7)).value.source,source)
 await uiChecks(courses,entries.get(compiler.pageTemplateKey(7)).value)
 console.log('Page import: owner/course scope, empty and generic slots, preserved effects, real navigation, CSP isolation, gzip limits, authentication, origin, revisions, responsive preview, network failure and builtin fallback passed; no live writes.')
}
async function uiChecks(courses,initial){
 const React=require('react'),{createRoot}=require('react-dom/client')
 const dom=new JSDOM('<div id="root"></div>',{url:'https://giautoandien.io.vn/tools/my-site/template'})
 global.window=dom.window;global.document=dom.window.document;global.DOMParser=dom.window.DOMParser;global.IS_REACT_ACT_ENVIRONMENT=true
 Object.defineProperty(global,'navigator',{value:dom.window.navigator,configurable:true})
 let state=initial,posts=[],fail=false
 global.fetch=async (_url,options)=>{
  if(!options?.method)return {ok:true,json:async()=>({template:state,courses,slug:'one'})}
  if(fail)throw new Error('Mất kết nối kiểm tra')
  const input=JSON.parse(options.body);posts.push(input)
  state={...state,...(input.action==='apply'?{source:input.source,region:input.region,name:input.name}:{}),active:input.action==='apply',revision:state.revision+1}
  return {ok:true,json:async()=>({template:state})}
 }
 const ui=createRoot(document.getElementById('root'))
 await React.act(async()=>{ui.render(React.createElement(load('components/website/PageTemplateImport').default));await new Promise(r=>setTimeout(r,100))})
 // Wait for asynchronous gzip decoding inside the initial fetch effect.
 for(let i=0;i<20 && !document.querySelector('iframe');i++)await React.act(async()=>new Promise(r=>setTimeout(r,20)))
 assert.ok(document.querySelector('iframe'));assert.ok(document.querySelector('iframe').srcdoc.includes('Khóa học thật'))
 assert.equal(posts.length,0,'Preview must not write')
 const button=label=>[...document.querySelectorAll('button')].find(b=>b.textContent===label)
 await React.act(async()=>button('Điện thoại').click());assert.equal(document.querySelector('iframe').parentElement.style.width,'390px')
 await React.act(async()=>button('Tablet').click());assert.equal(document.querySelector('iframe').parentElement.style.width,'768px')
 await React.act(async()=>button('Máy tính').click());assert.equal(document.querySelector('iframe').parentElement.style.width,'100%')
 const select=document.querySelector('select');await React.act(async()=>{select.value='__append__';select.dispatchEvent(new window.Event('change',{bubbles:true}))})
 assert.ok(document.querySelector('iframe').srcdoc.includes('system-course-card'));assert.equal(posts.length,0)
 fail=true;await React.act(async()=>{button('Áp dụng template cho Page').click();await new Promise(r=>setTimeout(r,100))})
 assert.ok(document.querySelector('[role="alert"]').textContent.includes('Mất kết nối'));assert.equal(button('Áp dụng template cho Page').disabled,false)
 fail=false;await React.act(async()=>{button('Áp dụng template cho Page').click();await new Promise(r=>setTimeout(r,100))})
 assert.equal(posts.length,1);assert.equal(posts[0].region,'__append__');assert.equal(load('lib/website/page-template-server').decodePageSource(posts[0].source),fixture)
 assert.equal(button('Dùng lại giao diện có sẵn').disabled,false)
 await React.act(async()=>{button('Dùng lại giao diện có sẵn').click();await new Promise(r=>setTimeout(r,30))});assert.equal(posts[1].action,'builtin');assert.equal(state.active,false)
 await React.act(async()=>ui.unmount());dom.window.close()
}
run().catch(e=>{console.error(e);process.exitCode=1})
