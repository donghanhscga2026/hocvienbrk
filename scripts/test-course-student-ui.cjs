// Real student table and export dialog; fake API, image download and detail drawer.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript'),React=require('react'),{JSDOM}=require('jsdom')
const repo=path.resolve(__dirname,'..'),cache=new Map(),dom=new JSDOM('<div id="root"></div>',{url:'https://test.invalid/tools/courses/new?id=1'})
global.window=dom.window;global.document=dom.window.document;global.IS_REACT_ACT_ENVIRONMENT=true
Object.defineProperty(global,'navigator',{configurable:true,value:dom.window.navigator})
dom.window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')}
dom.window.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')}
dom.window.HTMLAnchorElement.prototype.click=function(){}
const originalFetch=global.fetch,originalUrl=URL.createObjectURL,originalRevoke=URL.revokeObjectURL
URL.createObjectURL=()=> 'blob:test';URL.revokeObjectURL=()=>{}
const exportRuns=[],images=[];let failImage=false
global.fetch=async(url,options={})=>{if(!options.body)return Response.json({summary:[{courseId:1,requests:2}]});const input=JSON.parse(options.body);exportRuns.push(input);return input.format==='GOOGLE'?Response.json({sheetUrl:'https://docs.google.com/spreadsheets/d/testsheet'}):new Response(new Uint8Array([1,2,3]),{headers:{'content-type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}})}
const mocks={
 './MemberDetailPanel':{__esModule:true,default:props=>React.createElement('div',{'data-detail':props.member.enrollmentId,'data-tab':props.initialTab},'Detail')},
 '@/lib/course/export-roster-image':{downloadRosterAsImage:async(...args)=>{images.push(args);if(failImage)throw new Error('Image fixture failed')}}
}
function load(file){
 if(cache.has(file))return cache.get(file)
 const module={exports:{}}
 const code=ts.transpileModule(fs.readFileSync(path.join(repo,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText
 new Function('require','module','exports',code)(name=>name in mocks?mocks[name]:name.startsWith('@/')||name.startsWith('./')?load((name.startsWith('@/')?name.slice(2):path.posix.join(path.posix.dirname(file),name))+'.tsx'):require(name),module,module.exports)
 cache.set(file,module.exports);return module.exports
}
const root=require('react-dom/client').createRoot(document.getElementById('root'))
async function click(text){await React.act(async()=>{const element=document.querySelector('[aria-label="'+text+'"]')||[...document.querySelectorAll('button')].find(node=>node.textContent.trim()===text);assert.ok(element,text);element.click()})}
async function value(label,value){await React.act(async()=>{const element=document.querySelector('[aria-label="'+label+'"]');assert.ok(element,label);const prototype=element.tagName==='SELECT'?window.HTMLSelectElement.prototype:window.HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(prototype,'value').set.call(element,value);element.dispatchEvent(new window.Event('input',{bubbles:true}));element.dispatchEvent(new window.Event('change',{bubbles:true}))})}
function snapshot(name){if(process.env.MANAGEMENT_UI_SNAPSHOT_DIR){fs.mkdirSync(process.env.MANAGEMENT_UI_SNAPSHOT_DIR,{recursive:true});fs.writeFileSync(path.join(process.env.MANAGEMENT_UI_SNAPSHOT_DIR,name+'.html'),document.getElementById('root').innerHTML)}}
async function run(){
 const members=Array.from({length:24},(_,i)=>({id:i+10,enrollmentStatus:i===3?'PENDING':'ACTIVE',memberRole:'TV',team:1,group:1,user:{id:i,name:'Học viên kiểm thử '+i,phone:'09000000'+String(i).padStart(2,'0'),email:'fixture'+i+'@example.invalid'},days:i===3?[]:[{order:1,status:i===1?'onTime':'late',submitted:i===1,submittedAt:i===1?'2026-10-14T03:00:00Z':null}],submittedCount:i===1?1:0,lastSubmittedAt:i===1?'2026-10-14T03:00:00Z':null,completionPercent:null,todayOrder:2,startDate:'2026-10-12T00:00:00Z'}))
 try{
  const Table=load('components/course/CourseStudentTable.tsx').default
  await React.act(async()=>root.render(React.createElement(Table,{courseId:1,courseName:'Khóa học kiểm thử',members,labels:{},totalLessons:12,canManage:true,reload(){},onEditAssignments(){}})))
  assert.equal(document.querySelectorAll('tbody tr').length,20);assert.ok(document.body.textContent.includes('1/12 bài'));snapshot('course-students')
  await click('Chọn tất cả học viên đang lọc');assert.ok(document.body.textContent.includes('Đã chọn 24 học viên'));await click('Chọn tất cả học viên đang lọc');assert.equal(document.querySelector('[aria-label="Chọn tất cả học viên đang lọc"]').checked,false)
  for(const id of [0,1,3])await click('Chọn học viên Học viên kiểm thử '+id)
  await value('Tìm học viên','fixture1@example.invalid');assert.equal(document.querySelectorAll('tbody tr').length,1);assert.ok(document.body.textContent.includes('Đã chọn 3 học viên'),'Filtering preserves selection')
  await click('Xuất dữ liệu');assert.equal(document.querySelector('[aria-label="Phạm vi học viên"]').value,'selected')
  const include=[...document.querySelectorAll('dialog label')].find(node=>node.textContent.includes('Kèm các sheet')).querySelector('input')
  await React.act(async()=>include.click())
  await value('Từ ngày xuất báo cáo','2026-10-12');await value('Đến ngày xuất báo cáo','2026-10-14');snapshot('course-student-export')
  await click('Tải Excel (.xlsx)')
  assert.deepEqual(exportRuns[0],{courseIds:[1],status:'ALL',reports:true,format:'EXCEL',userIds:[0,1,3],fromDate:'2026-10-12',toDate:'2026-10-14'})
  await click('Xuất dữ liệu');await value('Định dạng xuất','GOOGLE');await click('Tạo Google Sheet')
  assert.deepEqual({...exportRuns[1],format:'EXCEL'},exportRuns[0],'Excel and Google use identical selected students and date range')
  assert.ok(document.querySelector('a[href="https://docs.google.com/spreadsheets/d/testsheet"]'))
  await click('Đóng lựa chọn xuất');await click('Xuất dữ liệu');await React.act(async()=>document.querySelector('input[value="reports"]').click());await value('Định dạng xuất','PNG')
  await click('Tải ảnh báo cáo (.png)')
  assert.deepEqual(images[0][1].map(row=>row.code),[0,1],'PNG uses the same scope but only active enrollments')
  assert.deepEqual(images[0][3],{userIds:[0,1,3],fromDate:'2026-10-12',toDate:'2026-10-14'})
  await click('Xuất dữ liệu');failImage=true;await click('Tải ảnh báo cáo (.png)');assert.ok(document.querySelector('dialog[open]'));assert.ok(document.body.textContent.includes('Image fixture failed'),'Failed image export retains the dialog')
  await click('Đóng lựa chọn xuất');await click('Xem bài nộp →');assert.equal(document.querySelector('[data-tab]').dataset.tab,'history')
  await value('Tìm học viên','');await click('Thẻ');assert.equal(document.querySelectorAll('article').length,20)
  console.log('PASS student workspace: genuine submission ratio, contact search, pagination, cross-filter selection, Excel/Sheets parity, scoped PNG, range filters, failure retention and history')
 }finally{await React.act(async()=>root.unmount());dom.window.close();global.fetch=originalFetch;URL.createObjectURL=originalUrl;URL.revokeObjectURL=originalRevoke}
}
run().catch(error=>{console.error(error);process.exitCode=1})
