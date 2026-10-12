const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict')
const ts = require('typescript'), React = require('react'), { JSDOM } = require('jsdom')
const { act } = React
function load(file, overrides = {}) {
  const module = { exports: {} }
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  new Function('require','module','exports',source)(name => name in overrides ? overrides[name] : require(name),module,module.exports)
  return module.exports
}
async function run() {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://wi300.example/', pretendToBeVisual: true })
  global.window=dom.window; global.document=dom.window.document; global.IS_REACT_ACT_ENVIRONMENT=true
  Object.defineProperty(global,'navigator',{configurable:true,value:dom.window.navigator})
  Object.defineProperty(document.documentElement,'clientWidth',{value:window.innerWidth})
  const originalMatches = window.Element.prototype.matches
  window.Element.prototype.matches = function(selector) { return selector === ':popover-open' ? !!this._open : originalMatches.call(this,selector) }
  window.HTMLElement.prototype.showPopover = function() { this._open=true }
  window.HTMLElement.prototype.hidePopover = function() { this._open=false }
  let user=0, role='ADMIN', read=false, defer=false, fail=false, resolveOld, routed=null
  const all = Array.from({length:23},(_,i)=>({id:'notice-'+(i+1),title:'Thông báo '+(i+1),kind:'ENROLLMENT_ACTIVE',createdAt:'2026-10-12',readAt:null,href:'/khoa-hoc/C'+(i+1)}))
  const calls=[], savedFetch=global.fetch
  global.fetch=async(url,options={})=>{
    calls.push({url,options})
    if(options.method==='PATCH'){read=true;return {ok:true,json:async()=>({updated:1})}}
    const params=new URL(url,window.location.origin).searchParams
    assert.equal(params.get('stream'),'1')
    assert.equal(params.has('page'),false)
    const cursor=params.get('cursor'), offset=Number(cursor||0), size=cursor?3:10
    const data={notifications:user===0?all.slice(offset,offset+size).map(n=>({...n,readAt:read?'now':null})):[],total:user===0?23:0,unread:user===0&&!read?23:0,nextCursor:user===0&&offset+size<23?String(offset+size):null}
    if(defer&&cursor){defer=false;await new Promise(resolve=>{resolveOld=resolve})}
    if(fail&&cursor){fail=false;return {ok:false,json:async()=>({error:'Mạng gián đoạn'})}}
    return {ok:true,json:async()=>data}
  }
  const Bell=load('components/notifications/NotificationBell.tsx',{
    './PushDeviceSettings':{__esModule:true,default:()=>React.createElement('p',null,'Thiết bị')},
    'next-auth/react':{useSession:()=>({data:user==null?null:{user:{id:user,role}}})},
    'next/navigation':{useRouter:()=>({push:href=>routed=href})},
    '@/lib/crm/shared':{formatCrmDate:date=>date},
    '@/components/website/DomainShell':{useDomainBrand:()=>null},
  }).default
  const {createRoot}=require('react-dom/client'),root=createRoot(document.getElementById('root'))
  const render=()=>root.render(React.createElement(Bell))
  const button=name=>[...document.querySelectorAll('button')].find(b=>b.textContent===name)
  const click=el=>el.dispatchEvent(new window.MouseEvent('click',{bubbles:true,cancelable:true}))
  const list=()=>document.querySelector('[aria-label="Danh sách thông báo"]')
  const rows=()=>[...list().querySelectorAll('button')].filter(b=>b.textContent.startsWith('Thông báo '))
  const trigger=()=>document.querySelector('[aria-controls="platform-notification-feed"]')
  const scroll=()=>list().dispatchEvent(new window.Event('scroll'))
  const continuationCalls=()=>calls.filter(c=>c.url.includes('cursor=')).length
  try{
    document.body.style.overflow='auto'
    await act(async()=>render())
    assert.equal(rows().length,10)
    assert.match(trigger().getAttribute('aria-label'),/23 chưa đọc/)
    await act(async()=>click(trigger()))
    assert.equal(document.querySelector('[role="dialog"]')._open,true)
    assert.equal(document.body.style.overflow,'hidden')
    assert.equal(button('Sau'),undefined)
    assert.equal(button('Trước'),undefined)
    assert.ok(!document.querySelector('[role="dialog"]').textContent.includes('Trang '))
    assert.ok(list().className.includes('[scrollbar-width:none]'))
    Object.defineProperty(list(),'scrollHeight',{configurable:true,value:1000})
    Object.defineProperty(list(),'clientHeight',{configurable:true,value:300})
    list().scrollTop=0
    await act(async()=>scroll())
    assert.equal(continuationCalls(),0,'Không tải khi còn xa cuối khung')
    const firstNode=rows()[0]
    list().scrollTop=700
    defer=true
    await act(async()=>{scroll();scroll();scroll()})
    assert.equal(continuationCalls(),1,'Chỉ một yêu cầu trong lúc đang tải')
    assert.equal(rows().length,10,'Giữ danh sách cũ trong lúc chờ')
    await act(async()=>resolveOld())
    assert.equal(rows().length,13)
    assert.equal(rows()[0],firstNode,'Không thay DOM hoặc đổi trang')
    assert.equal(list().scrollTop,700,'Không đặt lại vị trí cuộn')
    assert.equal(continuationCalls(),1,'Không tự tải nối hàng loạt khi kết thúc một lượt')
    await act(async()=>window.dispatchEvent(new window.Event('focus')))
    assert.equal(rows().length,13,'Làm mới số chưa đọc giữ các mục đã tải')
    fail=true
    await act(async()=>scroll())
    assert.equal(rows().length,13)
    assert.match(document.querySelector('[role="alert"]').textContent,/Mạng gián đoạn/)
    const failedUrl=calls.at(-1).url
    await act(async()=>click(button('Thử lại')))
    assert.equal(calls.at(-1).url,failedUrl,'Thử lại đúng mốc, không bỏ thông báo')
    assert.equal(rows().length,16)
    await act(async()=>click(button('Đọc tất cả')))
    assert.equal(rows().length,16,'Đọc tất cả không thay thế danh sách đã nối')
    assert.ok(rows().every(row=>!row.querySelector('[aria-label="Chưa đọc"]')))
    for(const expected of [19,22,23]){await act(async()=>scroll());assert.equal(rows().length,expected)}
    const count=continuationCalls()
    await act(async()=>scroll())
    assert.equal(continuationCalls(),count,'Dừng khi hết dữ liệu')
    assert.equal(new Set(rows().map(row=>row.textContent)).size,23)
    await act(async()=>click(rows()[20]))
    assert.equal(routed,'/khoa-hoc/C21')
    assert.deepEqual(JSON.parse(calls.filter(c=>c.options.method==='PATCH').at(-1).options.body),{ids:['notice-21']})
    assert.equal(document.querySelector('[role="dialog"]')._open,false)
    assert.equal(document.body.style.overflow,'auto')
    await act(async()=>click(trigger()))
    list().scrollTop=700
    defer=true
    await act(async()=>scroll())
    const oldRequest=calls.at(-1)
    user=2;role='STUDENT'
    await act(async()=>render())
    assert.equal(oldRequest.options.signal.aborted,true)
    assert.equal(rows().length,0)
    await act(async()=>resolveOld())
    assert.equal(rows().length,0,'Không đưa phản hồi tài khoản trước vào tài khoản mới')
    assert.ok(!document.body.textContent.includes('Thông báo 21'))
    assert.equal(document.body.style.overflow,'auto')
    user=null
    await act(async()=>render())
    assert.equal(trigger(),null)
    await act(async()=>root.unmount())
  }finally{global.fetch=savedFetch;dom.window.close()}
  console.log('Notification continuous UI: 10 initial + 3 appended, preserved DOM/scroll, no duplicate/inflight batch, network retry, read/navigation, background scroll lock, stale account guard including admin 0 passed.')
}
run().catch(e=>{console.error(e);process.exitCode=1})
