// Isolated fixtures only: never connects to or writes the live DB.
const assert=require('node:assert/strict'),React=require('react'),{JSDOM}=require('jsdom'),load=require('./helpers/load-ts.cjs')
async function run(){
 const shared=load('lib/offerings/shared.ts'),service=load('lib/offerings/service.ts')
 for(const model of Object.keys(service.serviceModels)){
  const details=shared.parseOfferingDetails({kind:'OTHER',service:{model,blocks:model==='HYBRID'?['PROJECT','SESSIONS']:[],category:'Accounting',scope:'Monthly scope',quantity:100,unit:'documents/month',fields:[{label:'Internal',value:'SECRET',public:false},{label:'Software',value:'MISA',public:true}],inputs:'PRIVATE INPUTS',questions:[{id:'name',label:'Company',type:'TEXT',required:true}]}})
  const facts=JSON.stringify(shared.offeringFacts('SERVICE',shared.publicOfferingDetails(details)))
  assert(!facts.includes('SECRET'));assert(!JSON.stringify(shared.publicOfferingDetails(details)).includes('PRIVATE INPUTS'));assert.equal(shared.publicOfferingDetails(details).service.questions.length,0)
  assert.equal(facts.includes('phút/buổi'),model==='SESSIONS'||model==='HYBRID')
  assert.equal(shared.resolvedWorkspace('SERVICE',details),model==='SESSIONS'?'SESSIONS':'DELIVERY')
 }
 assert.equal(service.effectiveService(shared.emptyOfferingDetails).model,'SESSIONS')
 assert.throws(()=>service.serviceSchema.parse({model:'HYBRID'}))
 assert.throws(()=>service.serviceSchema.parse({model:'PROJECT',questions:[{id:'dup',label:'A',type:'TEXT'},{id:'dup',label:'B',type:'TEXT'}]}))
 class CrmError extends Error{constructor(message,status){super(message);this.status=status}}
 let actor={id:0,role:'TEACHER'},active=true,writes=0
 let config=shared.parseOfferingDetails({service:{model:'RECURRING',questions:[{id:'company',label:'Company',type:'TEXT',required:true},{id:'tier',label:'Tier',type:'SELECT',options:['Small','Large'],required:true},{id:'file',label:'Docs',type:'LINK'}]}})
 const records=new Map(),db={systemConfig:{findUnique:async({where})=>records.has(where.key)?{value:records.get(where.key)}:null,upsert:async({where,update})=>{writes++;records.set(where.key,update.value)}},enrollment:{findUnique:async()=>active?{status:'ACTIVE'}:null},course:{findUnique:async()=>({id:9,teacherId:0,productGroup:'SERVICE'})},$executeRaw:async()=>{}}
 db.$transaction=fn=>fn(db)
 const mocks={'@/lib/prisma':{__esModule:true,default:db},'@/lib/course-page/permissions':{courseEditorActor:async()=>actor},'@/lib/crm/service':{CrmError},'@/lib/offerings/server':{readOfferingDetails:async()=>config},'@/lib/offerings/workspace':{WorkspaceError:CrmError,requireOfferingWorkspace:async()=>{if(!active)throw new CrmError('Forbidden',403);return{course:{id:9},userId:0,details:config}}}}
 const api=load('app/api/offerings/[slug]/intake/route.ts',mocks),params={params:Promise.resolve({slug:'ACCOUNTING'})}
 const request=(answers,version=0,origin='https://wi300.test')=>new Request('https://wi300.test/api/offerings/ACCOUNTING/intake',{method:'PUT',headers:{origin},body:JSON.stringify({answers,version})})
 assert.equal((await api.PUT(request({}),params)).status,400)
 assert.equal((await api.PUT(request({company:'A',tier:'Wrong'}),params)).status,400)
 assert.equal((await api.PUT(request({company:'A',tier:'Small',file:'javascript:alert(1)'}),params)).status,400)
 assert.equal((await api.PUT(request({company:'A',tier:'Small'},0,'https://evil.example'),params)).status,403)
 assert.equal(writes,0)
 assert.equal((await api.PUT(request({company:'A',tier:'Small',file:'https://docs.example/file'}),params)).status,200)
 assert.equal(records.get('catalog:service-intake:9:0').answers[0].label,'Company')
 assert.equal((await api.PUT(request({company:'A',tier:'Small'}),params)).status,409);assert.equal(writes,1)
 actor={id:8,role:'TEACHER'};assert.equal((await api.GET(new Request('https://wi300.test/api/offerings/ACCOUNTING/intake?userId=0'),params)).status,403)
 actor={id:0,role:'TEACHER'};const owner=await api.GET(new Request('https://wi300.test/api/offerings/ACCOUNTING/intake?userId=0'),params);assert.equal(owner.headers.get('cache-control'),'private, no-store');assert.equal((await owner.json()).state.answers[0].value,'A')
 active=false;assert.equal((await api.PUT(request({company:'B',tier:'Small'},1),params)).status,403);active=true
 const templates=load('app/api/offerings/service-templates/route.ts',mocks)
 const save=()=>new Request('https://wi300.test/api/offerings/service-templates',{method:'POST',headers:{origin:'https://wi300.test'},body:JSON.stringify({name:'Accounting',config:config.service})})
 assert.equal((await templates.POST(save())).status,200)
 actor={id:8,role:'TEACHER'};assert.equal((await(await templates.GET()).json()).templates.length,0,'Templates remain account scoped')
 const dom=new JSDOM('<div id="root"></div>',{url:'https://wi300.test/tools/courses/new'});global.window=dom.window;global.document=dom.window.document;global.IS_REACT_ACT_ENVIRONMENT=true;Object.defineProperty(global,'navigator',{configurable:true,value:dom.window.navigator})
 const Component=load('components/offerings/OfferingServiceFields.tsx').default,root=require('react-dom/client').createRoot(document.getElementById('root'))
 let value=shared.parseOfferingDetails({kind:'CONSULTING',service:{model:'PROJECT',scope:'KEEP',turnaround:'14 days',questions:[]}})
 function render(){root.render(React.createElement(Component,{value,onChange:next=>{value=next;render()}},React.createElement('input',{'data-session-field':true})))}
 try{
  window.confirm=()=>true
  await React.act(async()=>render());assert(document.querySelector('[data-session-field]').closest('[hidden]'))
  await React.act(async()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='Điền mẫu thiết kế website').click())
  assert.equal(value.service.model,'PROJECT');assert.equal(value.service.revisions,2);assert.equal(value.service.extraSessions,false);assert(!value.modules.includes('bookings'))
  assert(!JSON.stringify(shared.offeringFacts('SERVICE',shared.publicOfferingDetails(value))).includes('1:1'))
  value={...value,service:{...value.service,scope:'KEEP',turnaround:'14 days'}};await React.act(async()=>render())
  await React.act(async()=>{const select=document.querySelector('[aria-label="Cách cung cấp dịch vụ"]');select.value='RECURRING';select.dispatchEvent(new window.Event('change',{bubbles:true}))})
  assert.equal(value.service.scope,'KEEP');assert.equal(value.service.turnaround,'14 days');assert(document.querySelector('[aria-label="Chu kỳ cung cấp"]'));assert(!document.querySelector('[aria-label="Thời gian thực hiện"]'))
  await React.act(async()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='Áp dụng bố cục gợi ý').click());assert(!value.modules.includes('bookings'));assert(value.modules.includes('delivery'))
  const Viewer=load('components/offerings/OfferingViewer.tsx').default;const html=require('react-dom/server').renderToStaticMarkup(React.createElement(Viewer,{url:'https://app.example',title:'App'}));assert(!html.includes('Nếu nội dung trống'))
  const Fields=load('components/offerings/OfferingFields.tsx',{'next/link':{__esModule:true,default:({children,...props})=>React.createElement('a',props,children)}}).default
  let admin=false
  function renderFields(){root.render(React.createElement(Fields,{group:'SERVICE',section:'resources',value,canManageDomains:admin,onChange:next=>{value=next;renderFields()}}))}
  await React.act(async()=>renderFields())
  const optional=[...document.querySelectorAll('details')].find(item=>item.querySelector('summary')?.textContent==='+ Thêm tài liệu hoặc công cụ')
  assert(optional&&!optional.open,'Empty service resources are optional and collapsed')
  assert.equal(document.querySelector('[aria-label="Tìm trong thư viện quản trị"]'),null,'No empty library grid')
  await React.act(async()=>{optional.open=true;[...optional.querySelectorAll('button')].find(b=>b.textContent.trim()==='+ Công cụ / App').click()})
  assert.equal(value.resources.length,1)
  assert.equal(document.querySelector('a[href="/tools/settings/app-frame-domains"]'),null,'Teacher cannot see admin shortcut')
  await React.act(async()=>{const input=document.querySelector('[aria-label="Tên tài nguyên đang sửa"]');Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(input,'Shared service App');input.dispatchEvent(new window.Event('input',{bubbles:true}))})
  await React.act(async()=>{optional.open=false;optional.open=true})
  assert.equal(document.querySelector('[aria-label="Tên tài nguyên đang sửa"]').value,'Shared service App','Collapse preserves unsaved resource draft')
  admin=true;await React.act(async()=>renderFields());assert(document.querySelector('a[href="/tools/settings/app-frame-domains"]'))
  await React.act(async()=>{const select=document.querySelector('[aria-label="Loại tài nguyên đang sửa"]');select.value='EBOOK';select.dispatchEvent(new window.Event('change',{bubbles:true}))})
  assert.equal(document.querySelector('a[href="/tools/settings/app-frame-domains"]'),null,'Admin shortcut only appears for selected App')
 }finally{await React.act(async()=>root.unmount());dom.window.close()}
 console.log('Service models: dynamic form retention, non-session facts/layout, public/private fields, intake requirements/CSRF/ownership/version/account-zero, scoped templates and removed static viewer notice passed.')
}
run().catch(error=>{console.error(error);process.exitCode=1})
