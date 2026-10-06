const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const ts = require('typescript')
const { PGlite } = require('@electric-sql/pglite')
const root = path.resolve(__dirname, '..')
const pg = new PGlite()
let checks = 0
const ok = (value, label) => { assert.ok(value, label); checks++ }
const throws = (action, label) => { assert.throws(action, undefined, label); checks++ }
class CrmError extends Error { constructor(message, status = 400) { super(message); this.status = status } }
let sessionId = 1
const profiles = [{ id: 11, userId: 1, slug: 'owner-one', title: 'One', isActive: true, members: [], user: { role: 'TEACHER' } }, { id: 22, userId: 2, slug: 'owner-two', title: 'Two', isActive: true, members: [], user: { role: 'TEACHER' } }]
const rows = async (connection, sql, values = []) => (await connection.query(sql, values)).rows
let contacts = [], requests = []
function repository(connection) {
  const website = {
    findUnique: async ({ where }) => (await rows(connection,'SELECT * FROM "SiteWebsite" WHERE "profileId"=$1',[where.profileId]))[0] || null,
    findUniqueOrThrow: async (args) => { const row = await website.findUnique(args); assert.ok(row); return row },
    create: async ({ data }) => (await rows(connection,'INSERT INTO "SiteWebsite" ("profileId",draft,published,history,revision) VALUES ($1,$2,$3,$4,$5) RETURNING *',[data.profileId,JSON.stringify(data.draft),data.published ? JSON.stringify(data.published) : null,JSON.stringify(data.history),data.revision]))[0],
    updateMany: async ({ where, data }) => {
      const current = await website.findUnique({ where }); if(!current || current.revision !== where.revision) return { count: 0 }
      const Prisma = require('@prisma/client').Prisma
      const published = data.published === Prisma.DbNull ? null : data.published === undefined ? current.published : data.published
      const result = await connection.query('UPDATE "SiteWebsite" SET draft=$1,published=$2,history=$3,revision=revision+1 WHERE "profileId"=$4 AND revision=$5',[JSON.stringify(data.draft),published ? JSON.stringify(published) : null,JSON.stringify(data.history),where.profileId,where.revision]); return { count: result.affectedRows }
    },
  }
  return {
    siteWebsite: website,
    user: { findUnique: async ({ where }) => sessionId == null || !profiles.some(p => p.userId === where.id) ? null : { id: where.id } },
    siteProfile: { findUnique: async ({ where }) => { const p = profiles.find(p => where.userId !== undefined ? p.userId === where.userId : p.slug === where.slug); return p ? { ...p, website: await website.findUnique({ where: { profileId: p.id } }) } : null }, findFirst: async ({ where }) => profiles.find(p => p.id === where.id && p.userId === where.userId) || null },
    courseTestimonial: { findMany: async () => [{ id: 1,courseId: 7,name: 'Learner',role: null,content: 'Good',rating: 5 }] },
    crmRequest: { findUnique: async ({ where }) => requests.find(r => r.key === where.key), count: async ({ where }) => requests.filter(r => (!where.ipHash || r.ipHash === where.ipHash) && (!where.source || r.source.startsWith(where.source.startsWith))).length, create: async ({ data }) => { requests.push(data); return data } },
    crmContact: { findMany: async ({ where }) => contacts.filter(c => where.OR.some(filter => filter.email ? c.email === filter.email.equals : c.phone === filter.phone)), create: async ({ data }) => { const c = { ...data,id: contacts.length+1 }; contacts.push(c); return c } },
    $executeRaw: async () => 1,
  }
}
const fake = { ...repository(pg), $transaction: async action => pg.transaction(tx => action(repository(tx))) }
const cache = new Map()
function load(relative) {
  let file = path.resolve(root,relative)
  if(!path.extname(file)) file = fs.existsSync(file+'.ts') ? file+'.ts' : fs.existsSync(file+'.tsx') ? file+'.tsx' : path.join(file,'index.ts')
  if(file === path.join(root,'lib/crm/service.ts')) return { CrmError }
  if(cache.has(file)) return cache.get(file).exports
  const module = { exports: {} }; cache.set(file,module)
  const source = ts.transpileModule(fs.readFileSync(file,'utf8'),{ compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022 } }).outputText
  new Function('require','exports','module',source)(name => {
    if(name === 'server-only') return {}
    if(name === '@/auth') return { auth: async () => sessionId == null ? null : { user: { id: String(sessionId) } } }
    if(name === '@/lib/prisma') return { __esModule: true, default: fake }
    if(name === '@/lib/crm/service') return { CrmError }
    if(name === '@/lib/website/domains') return { activeDomain:async()=>null }
    if(name === '@/app/actions/site-profile-actions') return { getCoursesForProfile: async () => [{ id: 7,id_khoa: 'COURSE-7',name_lop: 'Course',name_khoa: null,link_anh_bia: null,mo_ta_ngan: null,teacherBankAccount: { accountNumber: 'private' } }],getPostsForProfile: async () => [{ id: 'post',title:'Post',content:'<p>Public text</p>' }] }
    if(name.startsWith('@/')) return load(name.slice(2))
    if(name.startsWith('.')) return load(path.relative(root,path.resolve(path.dirname(file),name)))
    return require(name)
  },module.exports,module)
  return module.exports
}
const document = load('lib/website/document')
const api = load('app/api/websites/route')
const lead = load('app/api/websites/lead/route')
const server = load('lib/website/server')
function request(body, origin = 'https://giautoandien.io.vn') { return new Request('https://giautoandien.io.vn/api/websites',{ method: 'POST',headers: { origin,host:'giautoandien.io.vn','Content-Type':'application/json' },body:JSON.stringify(body) }) }
async function post(body) { const response = await api.POST(request(body)); return { status: response.status, body: await response.json() } }
async function uiChecks() {
  const React = require('react')
  const { renderToStaticMarkup } = require('react-dom/server')
  const View = load('components/website/WebsiteView').default
  const complete=document.completeTemplateDocument('Lucy')
  const completeHtml=renderToStaticMarkup(React.createElement(View,{document:complete,data:{courses:[],testimonials:[],posts:[]},slug:'lucy'}))
  ok(completeHtml.includes('href="/page/lucy/dich-vu"') && completeHtml.includes('href="/page/lucy/lien-he"'),'Template CTA links stay inside the profile website')
  const domainHtml=renderToStaticMarkup(React.createElement(View,{document:complete,data:{courses:[],testimonials:[],posts:[]},slug:'lucy',customDomain:true}))
  ok(domainHtml.includes('href="/dich-vu"') && !domainHtml.includes('href="/page/lucy/dich-vu"'),'Custom-domain CTA links retain local paths')
  const expert=document.templateDocument('expert-sales','Teacher')
  ok(document.parseDocument(JSON.parse(JSON.stringify(expert))).pages.length===1,'Course sales template round trips through JSON')
  const main=expert.pages[0].nodes[0];main.courseIds=[7]
  const expertData={courses:[{id:7,title:'Actual course',image:'/actual-cover.png',description:'Actual description',href:'/khoa-hoc/COURSE-7'},{id:8,title:'Related course',image:'',description:'Other',href:'/khoa-hoc/COURSE-8'}],testimonials:[{id:1,courseId:7,name:'Actual learner',content:'Actual review',rating:5},{id:2,courseId:8,name:'Other learner',content:'Other review',rating:5}],posts:[]}
  const salesMarkup=renderToStaticMarkup(React.createElement(View,{document:expert,data:expertData,slug:'teacher'}))
  ok(salesMarkup.includes('<h1') && salesMarkup.includes('Actual course') && salesMarkup.includes('/actual-cover.png') && salesMarkup.includes('href="/khoa-hoc/COURSE-7"'),'Hero displays selected course fields and original enrollment route')
  ok(salesMarkup.includes('Actual review') && !salesMarkup.includes('Other review'),'Default testimonials follow only the selected course')
  ok((salesMarkup.match(/Actual course/g)||[]).length===2,'Selected course appears in hero title and image alt, not related cards')
  const emptyReviews=renderToStaticMarkup(React.createElement(View,{document:expert,data:{...expertData,testimonials:[]},slug:'teacher'}))
  ok(!emptyReviews.includes('Chia sẻ từ học viên'),'Public page hides testimonials without real reviews')
  main.courseIds=[999]
  const missing=renderToStaticMarkup(React.createElement(View,{document:expert,data:expertData,slug:'teacher'}))
  ok(!missing.includes('Xem học phí') && !missing.includes('Actual review'),'Missing or out-of-scope course never falls back to a different product')
  main.courseIds=[7]
  const blocked=renderToStaticMarkup(React.createElement(View,{document:expert,data:expertData,slug:'teacher',modules:{courses:false,crm:false,affiliate:false}}))
  ok(!blocked.includes('Actual course') && !blocked.includes('Actual review'),'Disabling course module suppresses hero and related data')
  const data = { courses: [],testimonials: [],posts: [] }
  const custom = document.blankDocument('Brand'); const html = document.makeNode('html'); html.html='<script>window.top.hacked=true</script><h2>HTML</h2>'; custom.pages[0].nodes=[html]
  const markup = renderToStaticMarkup(React.createElement(View,{ document:custom,data,slug:'brand' }))
  ok(markup.includes('sandbox=""') && markup.includes('default-src &#x27;none&#x27;'),'Custom HTML isolated by sandbox and CSP')
  custom.layout.showHeader=false; custom.layout.showFooter=false; custom.layout.padding=0
  const fullCustom=renderToStaticMarkup(React.createElement(View,{ document:custom,data,slug:'brand' }))
  ok(!fullCustom.includes('<header') && !fullCustom.includes('<footer'),'Automatic header and footer can be replaced completely')
  const unsafe = document.makeNode('text'); unsafe.text='<img src=x onerror=alert(1)>'; custom.pages[0].nodes=[unsafe]
  ok(renderToStaticMarkup(React.createElement(View,{ document:custom,data,slug:'brand' })).includes('&lt;img'),'Text content is escaped')
  const { JSDOM } = require('jsdom')
  const dom = new JSDOM('<!doctype html><div id="root"></div>',{ url:'https://test.invalid/tools/my-site/design' })
  global.window=dom.window; global.self=dom.window; global.document=dom.window.document; global.HTMLElement=dom.window.HTMLElement
  Object.defineProperty(global,'navigator',{ value:dom.window.navigator,configurable:true })
  global.IS_REACT_ACT_ENVIRONMENT=true; window.confirm=()=>true
  let saved = null; let calls=0
  global.fetch=async (_url,options) => { calls++; if(!options?.method) return { ok:true,json:async()=>({ profile:{ slug:'owner-one',isActive:true,canUseCrm:true },document:document.blankDocument('Brand'),revision:-1,history:[],published:false,data:expertData,templates:[] }) }; saved=JSON.parse(options.body); return { ok:true,json:async()=>({ revision:0,document:saved.document,history:[],published:saved.action==='publish' }) } }
  const { createRoot } = require('react-dom/client')
  const root = createRoot(global.document.getElementById('root'))
  const Editor = load('components/website/WebsiteEditor').default
  await React.act(async()=>{ root.render(React.createElement(Editor)); await new Promise(resolve=>setTimeout(resolve,0)) })
  const findButton=text=>[...global.document.querySelectorAll('button')].find(b=>b.textContent===text)
  const click=async text=>{ const button=findButton(text); assert.ok(button,'UI button '+text); await React.act(async()=>button.click()) }
  const edit=async(element,value)=>{ const setter=Object.getOwnPropertyDescriptor(element instanceof window.HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,'value').set; await React.act(async()=>{ setter.call(element,value); element.dispatchEvent(new window.Event('input',{bubbles:true})); element.dispatchEvent(new window.Event('change',{bubbles:true})) }) }
  ok(global.document.body.textContent.includes('Thương hiệu website'),'Editor loads own website')
  await React.act(async()=>{ window.history.replaceState({},'', '/tools/my-site/design?ref=REF-TEST'); window.dispatchEvent(new window.Event('popstate')) })
  ok([...global.document.querySelectorAll('a')].some(a=>a.getAttribute('href')==='/page/owner-one?ref=REF-TEST'),'Preserve referral on website navigation')
  await click('Tiêu đề')
  const text = global.document.querySelector('textarea')
  await edit(text,'My custom hero')
  ok(global.document.querySelector('main').textContent.includes('My custom hero'),'Content editing updates live preview')
  await click('Máy tính')
  const size = [...global.document.querySelectorAll('label')].find(e=>e.textContent==='Cỡ chữ').querySelector('input')
  await edit(size,'42')
  await click('Lưu nháp')
  ok(saved.document.pages[0].nodes[0].mobile.fontSize===42 && saved.document.pages[0].nodes[0].style.fontSize===undefined,'Mobile setting is independent of desktop')
  await click('+ Trang')
  ok(global.document.querySelectorAll('aside select')[0].options.length===2,'Create subpage in editor')
  await click('Hoàn tác')
  ok(global.document.querySelectorAll('aside select')[0].options.length===1,'Undo restores page structure')
  await click('Làm lại')
  ok(global.document.querySelectorAll('aside select')[0].options.length===2,'Redo restores subpage')
  await click('Bố cục / cột'); await click('Văn bản'); await click('Form tư vấn → CRM')
  await click('Lưu nháp')
  const container=saved.document.pages[1].nodes[0]
  ok(container.kind==='container' && container.children[0].kind==='text','Add component inside selected container')
  await click('Xem trước')
  ok(!global.document.querySelector('aside'),'Preview hides editing controls')
  await React.act(async()=>global.document.querySelector('form').dispatchEvent(new window.Event('submit',{ bubbles:true,cancelable:true })))
  ok(global.document.body.textContent.includes('form chỉ gửi sau khi website được xuất bản'),'Preview form does not send real leads')
  await click('Sửa thiết kế')
  await click('Xuất bản')
  ok(saved.action==='publish' && saved.document.pages.length===2,'Publish submits complete multi-page document')
  ok(calls===4,'Preview and local edits do not write automatically')
  const templateChoice=[...global.document.querySelectorAll('select')].find(select=>[...select.options].some(option=>option.value==='expert-sales'))
  await React.act(async()=>{templateChoice.value='expert-sales';templateChoice.dispatchEvent(new window.Event('change',{bubbles:true}))})
  const mainChoice=[...global.document.querySelectorAll('label')].find(label=>label.textContent.startsWith('Khóa học chính'))?.querySelector('select')
  ok(!!mainChoice && mainChoice.value==='','Applying sales template opens explicit course selection without choosing an arbitrary product')
  await React.act(async()=>{mainChoice.value='7';mainChoice.dispatchEvent(new window.Event('change',{bubbles:true}))})
  ok(global.document.querySelector('#course-offer h1')?.textContent==='Actual course','Editor selection updates main course preview')
  ok(global.document.querySelector('#course-offer a')?.getAttribute('href')==='/khoa-hoc/COURSE-7?ref=REF-TEST','Main course CTA retains referral')
  ok(calls===4,'Template selection and course selection do not write automatically')
  await click('Lưu nháp')
  ok(saved.document.pages[0].nodes[0].courseIds.length===1 && saved.document.pages[0].nodes[0].courseIds[0]===7,'Saving preserves chosen main course ID')
  await React.act(async()=>root.unmount()); dom.window.close()
}
async function run() {
  await pg.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE TABLE "SiteProfile" (id INTEGER PRIMARY KEY); INSERT INTO "SiteProfile" VALUES (11),(22);')
  await pg.exec(fs.readFileSync(root+'/prisma/migrations/20261005040000_site_website/migration.sql','utf8'))
  ok((await rows(pg,"SELECT relrowsecurity FROM pg_class WHERE relname='SiteWebsite'"))[0].relrowsecurity,'Draft table has RLS')
  for(const role of ['anon','authenticated']) ok(!(await rows(pg,"SELECT has_table_privilege($1,'\"SiteWebsite\"','SELECT') p",[role]))[0].p,'No direct draft reads: '+role)
  const doc = document.templateDocument('business','Business')
  const full=document.templateDocument('shared-complete','Lucy')
  ok(document.parseDocument(JSON.parse(JSON.stringify(full))).pages.length===5,'Full sample contains five valid editable pages')
  ok(full.pages[0].nodes.length>=10,'Full sample includes service, process, package, FAQ and intake sections')
  ok(document.walkNodes(full.pages[0].nodes).some(node=>node.kind==='image' && node.url==='/website-demo-preview.svg'),'Full sample has a bundled illustration')
  ok(document.parseDocument(doc).pages.length === 1,'Built-in template validates')
  for(const key of ['shared','shared-sales']) {
    const sample=document.templateDocument(key,'Demo')
    ok(document.parseDocument(JSON.parse(JSON.stringify(sample))).pages.length===2,'Shared template JSON round trip: '+key)
    const blocks=document.walkNodes(sample.pages[0].nodes)
    ok(blocks.some(node=>node.kind==='courses' && node.courseIds.length===0),'Shared template reads website course source: '+key)
    ok(sample.layout.showHeader===(key==='shared'),'Website and sales header differ: '+key)
    ok(sample.pages.some(page=>page.slug==='lien-he' && page.nodes.some(node=>node.kind==='form')),'Editable contact page: '+key)
  }
  const catalog=load('lib/website/sections')
  for(const [key] of catalog.sections) { const sample=document.blankDocument(); sample.pages[0].nodes=[catalog.makeSection(key)]; ok(document.parseDocument(sample).pages[0].nodes.length===1,'Editable section preset: '+key) }
  const attack = structuredClone(doc); attack.pages[0].nodes[0].children[2].url = 'javascript:alert(1)'; throws(() => document.parseDocument(attack),'Reject script URL')
  for(const url of ['//evil.invalid','/\\evil.invalid','data:text/html,test']) { const bad = structuredClone(doc); bad.pages[0].nodes[0].url=url; throws(() => document.parseDocument(bad),'Reject unsafe URL: '+url) }
  const duplicate = structuredClone(doc); duplicate.pages.push(structuredClone(duplicate.pages[0])); throws(() => document.parseDocument(duplicate),'Reject duplicate page/node IDs')
  const deep = document.blankDocument(); let nodes = deep.pages[0].nodes; for(let i=0;i<10;i++) { const n = document.makeNode('container'); nodes.push(n); nodes=n.children }; throws(() => document.parseDocument(deep),'Reject deeply nested designs')
  const huge = document.blankDocument(); const text = document.makeNode('html'); text.html='界'.repeat(100000); text.css='a'.repeat(30000); huge.pages[0].nodes=[text,document.cloneNode(text)]; throws(() => document.parseDocument(huge),'Limit UTF-8 byte size')
  throws(() => document.parseDocument(undefined),'Missing document fails validation')
  const parent = doc.pages[0].nodes[0], child=parent.children[0]
  ok(document.moveNode(doc.pages[0].nodes,parent.id,child.id) === doc.pages[0].nodes,'Cannot move parent into descendant')
  const moved = document.moveNode(doc.pages[0].nodes,child.id,null)
  ok(moved.at(-1).id === child.id && !moved[0].children.some(n => n.id===child.id),'Move nested element to page without duplication')
  const copied = document.cloneNode(parent); ok(copied.id !== parent.id && copied.children[0].id !== child.id,'Duplicate regenerates recursive IDs')
  for(const key of ['mfc-classic','wigrow']) { const adapted=load('lib/website/course-template').adaptCourseTemplate(key,'Brand'); document.parseDocument(adapted.document); ok(adapted.notes.length > 0 && document.walkNodes(adapted.document.pages[0].nodes).some(n => n.kind==='courses'),'Course template conversion: '+key) }
  sessionId = null; ok((await api.GET()).status===401,'Anonymous cannot read drafts'); sessionId=1
  const incomplete=document.templateDocument('expert-sales','Teacher')
  ok((await post({action:'publish',revision:-1,document:incomplete})).status===400,'Incomplete course offer cannot be published')
  const first=await post({ action:'save',revision:-1,document:doc }); ok(first.status===200 && first.body.revision===0,'Create own draft')
  ok(await server.publishedWebsite(11) === null,'Draft never renders publicly')
  ok((await post({ action:'publish',revision:-1,document:doc })).status===409,'Reject stale editor revision')
  ok((await api.POST(request({ action:'save',revision:0,document:doc },'https://evil.invalid'))).status===403,'Reject foreign origin writes')
  ok((await post({ action:'save',revision:0,document:doc,profileId:22 })).status===400,'Reject target-owner injection')
  profiles[0].isActive=false; ok((await post({ action:'publish',revision:0,document:doc })).status===403,'Inactive owner cannot activate page through publishing'); profiles[0].isActive=true
  profiles[0].user.role='STUDENT'; ok((await post({ action:'publish',revision:0,document:doc })).status===403,'Require CRM permission for form publishing'); profiles[0].user.role='TEACHER'
  const published = await post({ action:'publish',revision:0,document:doc }); ok(published.status===200 && published.body.history.length===1,'Publish creates history snapshot')
  const draft=structuredClone(doc); draft.name='Private draft'; ok((await post({ action:'save',revision:1,document:draft })).status===200,'Save after publishing')
  ok((await server.publishedWebsite(11)).name === 'Business','Editing draft preserves published content')
  sessionId=2; const other=await (await api.GET()).json(); ok(other.revision===-1 && !JSON.stringify(other).includes('Private draft'),'Other owner cannot read first owner draft'); sessionId=1
  const restored=await post({ action:'restore',revision:2,historyIndex:0 }); ok(restored.body.document.name==='Business','Restore into draft only')
  const data=await server.websiteData(profiles[0]); ok(!JSON.stringify(data).includes('accountNumber'),'Renderer data excludes teacher bank information')
  const form=document.walkNodes(doc.pages[0].nodes).find(n=>n.kind==='form')
  process.env.AUTH_SECRET='local-test-only'
  const leadInput={ slug:'owner-one',page:'',node:form.id,name:'Customer',email:'customer@example.com',phone:'',message:'Consultation',consent:true,website:'' }
  const capture=async overrides => lead.POST(request({ ...leadInput,...overrides }))
  ok((await capture({ node:'missing-form' })).status===404,'Only actual published forms accept intake')
  ok((await capture({ consent:false })).status===400,'Require explicit consent')
  ok((await capture({ website:'bot' })).status===200 && requests.length===0,'Honeypot writes nothing')
  ok((await capture({})).status===200 && requests[0].ownerId===1 && contacts[0].ownerId===1,'Lead reaches website owner CRM')
  ok((await capture({})).status===200 && requests.length===1,'Duplicate intake is idempotent')
  contacts.push({ id:99,email:'other@example.com',phone:null,ownerId:2,archived:false }); ok((await capture({ email:'other@example.com' })).status===200 && requests.at(-1).contactId==null && contacts.at(-1).ownerId===2,'Do not steal another owner contact')
  profiles[0].user.role='STUDENT'; ok((await capture({ email:'new@example.com' })).status===404,'Revoked CRM role closes published form'); profiles[0].user.role='TEACHER'
  requests = Array.from({length:1000},()=>({source:'Website:any'})); ok((await capture({ email:'rate@example.com' })).status===429,'Bound global hourly intake')
  const hidden=await post({ action:'unpublish',revision:3 }); ok(hidden.status===200 && await server.publishedWebsite(11)===null,'Unpublish returns to legacy page')
  const before=await rows(pg,'SELECT * FROM "SiteWebsite"'); await pg.exec('DELETE FROM "SiteProfile" WHERE id=11'); ok(before.length===1 && !(await rows(pg,'SELECT * FROM "SiteWebsite"')).length,'Delete profile cascades safely')
  await uiChecks()
  console.log(`Website builder: ${checks} checks passed (in-memory database and DOM; no live writes).`)
  await pg.close()
}
run().catch(async e=> { console.error(e); await pg.close(); process.exitCode=1 })
