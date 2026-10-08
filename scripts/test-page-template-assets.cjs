/* Isolated PostgreSQL/cache/browser regression checks. No live connections or writes. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript')
const {gzipSync}=require('node:zlib'),{PGlite}=require('@electric-sql/pglite'),{JSDOM}=require('jsdom')
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{createRoot}=require('react-dom/client')
const root=path.resolve(__dirname,'..'),modules=new Map(),dataCache=new Map(),sql=new PGlite()
let fullReads=0,freshReads=0
const db={
 $queryRaw:async(strings,...values)=>{freshReads++;return (await sql.query(strings.reduce((out,s,i)=>out+s+(i<values.length?'$'+(i+1):''),''),values)).rows},
 systemConfig:{findUnique:async({where})=>{fullReads++;return (await sql.query('SELECT value FROM "SystemConfig" WHERE key=$1',[where.key])).rows[0]||null}},
}
function load(rel){
 let file=path.resolve(root,rel);if(!path.extname(file))file=fs.existsSync(file+'.ts')?file+'.ts':file+'.tsx'
 if(modules.has(file))return modules.get(file).exports
 const mod={exports:{}};modules.set(file,mod)
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText
 new Function('require','exports','module',code)(name=>{
  if(name==='server-only')return {}
  if(name==='@/lib/prisma')return {__esModule:true,default:db}
  if(name==='react')return {...React,cache:fn=>fn}
  if(name==='next/cache')return {unstable_cache:(fn,keys)=>async(...args)=>{const key=JSON.stringify([keys,args]);if(!dataCache.has(key))dataCache.set(key,Promise.resolve(fn(...args)));return dataCache.get(key)}}
  if(name.startsWith('@/'))return load(name.slice(2))
  if(name.startsWith('.'))return load(path.relative(root,path.resolve(path.dirname(file),name)))
  return require(name)
 },mod.exports,mod);return mod.exports
}
async function run(){
 await sql.exec('CREATE TABLE "SiteProfile" (id integer PRIMARY KEY,"isActive" boolean);CREATE TABLE "SystemConfig" (key text PRIMARY KEY,value jsonb);INSERT INTO "SiteProfile" VALUES(7,true),(8,false)')
 const font='data:font/ttf;base64,'+Buffer.alloc(64000,42).toString('base64')
 const image='data:image/webp;base64,'+Buffer.alloc(20000,91).toString('base64')
 const svg='data:image/svg+xml;base64,'+Buffer.alloc(5000,65).toString('base64')
 const fixture=`<html><head><style>@font-face{font-family:Brand;src:url('${font}')}.hero{background-image:url('${image}')}</style></head><body><h1>Keep heading</h1><img src="${image}"><img src="${svg}"><div style="background:url('${image}')"></div><div id="courses"></div><script>window.effect=true;window.originalData='${font}';</script></body></html>`
 const assets=load('lib/website/page-template-assets'),server=load('lib/website/public-page-template'),compiler=load('lib/website/page-template')
 const optimized=assets.externalizePageAssets(fixture,7,1)
 assert.equal(optimized.assets.size,2,'Repeated resources must share one asset URL')
 const dom=new JSDOM(optimized.html),doc=dom.window.document
 assert.equal(doc.querySelector('script').textContent,`window.effect=true;window.originalData='${font}';`)
 assert.ok(doc.querySelector('style').textContent.includes('/api/websites/template-assets/7/1/'))
 assert.ok(!doc.querySelector('style').textContent.includes('data:font/ttf'))
 assert.ok(doc.querySelectorAll('img')[1].src.startsWith('data:image/svg+xml'),'SVG is never exposed as a standalone same-origin document')
 assert.ok(!doc.querySelector('[style]').getAttribute('style').includes('data:'))
 assert.equal(doc.querySelector('h1').textContent,'Keep heading');dom.window.close()
 assert.equal(assets.externalizePageAssets('<style>x{src:url(data:font/ttf;base64,AA==)}</style>',7,1).assets.size,0)
 const source=gzipSync(fixture).toString('base64'),template={name:'Test',active:true,revision:1,region:'courses',source}
 const save=async(id,value)=>sql.query('INSERT INTO "SystemConfig" VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=$2',[compiler.pageTemplateKey(id),JSON.stringify(value)])
 await save(7,template);await save(8,template)
 assert.equal((await server.readPublicPageTemplate(7)).source,source)
 assert.equal((await server.readPublicPageTemplate(7)).source,source)
 assert.equal(fullReads,1,'Immutable revision source is fetched once')
 assert.equal(freshReads,2,'Published/active decision is read afresh outside persistent cache')
 assert.equal(await server.readPublicPageTemplate(8),null)
 assert.equal(await server.readPublicPageTemplate(-1),null)
 const route=load('app/api/websites/template-assets/[profileId]/[revision]/[hash]/route')
 const [hash,asset]=[...optimized.assets][0]
 const get=(profileId='7',revision='1',digest=hash)=>route.GET(new Request('https://giautoandien.io.vn/api/websites/template-assets/test'),{params:Promise.resolve({profileId,revision,hash:digest})})
 const response=await get()
 assert.equal(response.status,200);assert.equal(response.headers.get('Content-Type'),asset.mime)
 assert.equal(response.headers.get('Access-Control-Allow-Origin'),'*','Opaque sandbox fonts need CORS')
 assert.equal(response.headers.get('Cross-Origin-Resource-Policy'),'cross-origin')
 assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff')
 assert.ok(response.headers.get('Cache-Control').includes('immutable'))
 assert.deepEqual(Buffer.from(await response.arrayBuffer()),asset.bytes)
 assert.equal(fullReads,1,'Asset requests reuse the source cache seeded by page render')
 for(const args of [['8'],['7','0'],['7','1','x'],['7','1','0'.repeat(64)],['../7'],['7','-1']])assert.equal((await get(...args)).status,404)
 await save(7,{...template,revision:2,active:false})
 assert.equal(await server.readPublicPageTemplate(7),null,'Builtin selection must take effect despite warm source cache')
 assert.equal((await get()).status,404)
 await save(7,{...template,revision:3});assert.equal((await server.readPublicPageTemplate(7)).revision,3)
 assert.equal((await get()).status,404,'Changed imports cannot serve an old revision at the origin')
 await sql.query('UPDATE "SiteProfile" SET "isActive"=false WHERE id=7')
 assert.equal(await server.readPublicPageTemplate(7),null,'Page revocation must take effect despite warm source cache')
 await sql.query('UPDATE "SiteProfile" SET "isActive"=true WHERE id=7')
 await save(7,{...template,revision:4,source:'x'.repeat(1800*1024)})
 const before=fullReads;await server.readPublicPageTemplate(7);await server.readPublicPageTemplate(7)
 assert.equal(fullReads,before+2,'Oversized imports bypass the 2MB Next cache limit')
 await save(7,{...template,revision:5,active:'yes'});assert.equal(await server.readPublicPageTemplate(7),null)
 await frameChecks()
 await sql.close()
 console.log('Template assets: PostgreSQL metadata, revision caching, permission freshness, oversized fallback, fonts/images, script preservation, CORS, invalid/private assets and single-transfer iframe passed; no live writes.')
}
async function frameChecks(){
 const Frame=load('components/website/ImportedPageFrame').default,html='<h1>Only one payload</h1><script>window.effect=true</script>'
 const markup=renderToStaticMarkup(React.createElement(Frame,{html,links:['/khoa-hoc/OWN'],deferDocument:true}))
 assert.ok(!markup.includes('Only one payload'),'SSR markup must not duplicate the RSC document')
 assert.ok(!markup.includes('srcDoc='));assert.ok(markup.includes('sandbox="allow-scripts"'))
 assert.ok(renderToStaticMarkup(React.createElement(Frame,{html,links:[],preview:true})).includes('Only one payload'),'Editor preview stays immediately available')
 const dom=new JSDOM('<div id="root"></div>',{url:'https://brk.io.vn'})
 global.window=dom.window;global.document=dom.window.document;global.IS_REACT_ACT_ENVIRONMENT=true
 Object.defineProperty(global,'navigator',{value:dom.window.navigator,configurable:true})
 const ui=createRoot(document.getElementById('root'))
 await React.act(async()=>ui.render(React.createElement(Frame,{html,links:['/khoa-hoc/OWN'],deferDocument:true})))
 const iframe=document.querySelector('iframe');assert.equal(iframe.srcdoc,html)
 assert.equal(iframe.getAttribute('sandbox'),'allow-scripts')
 await React.act(async()=>ui.render(React.createElement(Frame,{html:'<h1>New revision</h1>',links:[],deferDocument:true})))
 assert.equal(iframe.srcdoc,'<h1>New revision</h1>')
 await React.act(async()=>ui.unmount());dom.window.close()
}
run().catch(e=>{console.error(e);process.exitCode=1})
