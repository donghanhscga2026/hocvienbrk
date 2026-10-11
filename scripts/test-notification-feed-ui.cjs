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
  const originalMatches = window.Element.prototype.matches
  window.Element.prototype.matches = function(selector) { return selector === ':popover-open' ? !!this._open : originalMatches.call(this,selector) }
  window.HTMLElement.prototype.showPopover = function() { this._open=true }
  window.HTMLElement.prototype.hidePopover = function() { this._open=false }
  let user=0, read=false, defer=false, resolveOld, routed=null
  const all = Array.from({length:23},(_,i)=>({id:'notice-'+(i+1),title:'Thông báo '+(i+1),kind:'ENROLLMENT_ACTIVE',createdAt:'2026-10-12',readAt:null,href:'/khoa-hoc/C'+(i+1)}))
  const calls=[], savedFetch=global.fetch
  global.fetch=async(url,options={})=>{
    calls.push({url,options})
    if(options.method==='PATCH'){read=true;return {ok:true,json:async()=>({updated:1})}}
    const page=Number(new URL(url,window.location.origin).searchParams.get('page'))
    const data={notifications:user===0?all.slice((page-1)*10,page*10).map(n=>({...n,readAt:read?'now':null})):[],total:user===0?23:0,unread:user===0&&!read?23:0}
    if(defer&&page===2){defer=false;await new Promise(resolve=>{resolveOld=resolve})}
    return {ok:true,json:async()=>data}
  }
  const Bell=load('components/notifications/NotificationBell.tsx',{
    '@/lib/notification-pagination':load('lib/notification-pagination.ts'),
    './PushDeviceSettings':{__esModule:true,default:()=>React.createElement('p',null,'Thiết bị')},
    'next-auth/react':{useSession:()=>({data:user==null?null:{user:{id:user}}})},
    'next/navigation':{useRouter:()=>({push:href=>routed=href})},
    '@/lib/crm/shared':{formatCrmDate:date=>date},
    '@/components/website/DomainShell':{useDomainBrand:()=>null},
  }).default
  const {createRoot}=require('react-dom/client'),root=createRoot(document.getElementById('root'))
  const render=()=>root.render(React.createElement(Bell))
  const button=name=>[...document.querySelectorAll('button')].find(b=>b.textContent===name)
  const click=el=>el.dispatchEvent(new window.MouseEvent('click',{bubbles:true,cancelable:true}))
  const rows=()=>[...document.querySelectorAll('[aria-label="Danh sách thông báo"] button')]
  try{
    await act(async()=>render())
    assert.equal(rows().length,10)
    assert.match(document.querySelector('[aria-controls="platform-notification-feed"]').getAttribute('aria-label'),/23 chưa đọc/)
    await act(async()=>click(document.querySelector('[aria-controls="platform-notification-feed"]')))
    assert.equal(document.querySelector('[role="dialog"]')._open,true)
    assert.match(document.querySelector('[role="dialog"]').textContent,/Trang 1\/3/)
    defer=true
    await act(async()=>click(button('Sau')))
    assert.equal(rows().length,0,'Không gắn nhãn trang mới cho dữ liệu trang cũ')
    assert.match(document.querySelector('[role="dialog"]').textContent,/Trang 2\/3/)
    await act(async()=>click(button('Trước')))
    assert.equal(rows().length,10)
    await act(async()=>resolveOld())
    assert.ok(rows()[0].textContent.includes('Thông báo 1'))
    await act(async()=>click(button('Sau')))
    assert.equal(rows().length,10)
    assert.ok(rows()[0].textContent.includes('Thông báo 11'))
    await act(async()=>click(button('Sau')))
    assert.equal(rows().length,3)
    assert.equal(button('Sau').disabled,true)
    await act(async()=>click(rows()[0]))
    assert.equal(routed,'/khoa-hoc/C21')
    assert.deepEqual(JSON.parse(calls.find(c=>c.options.method==='PATCH').options.body),{ids:['notice-21']})
    assert.equal(document.querySelector('[role="dialog"]')._open,false)
    user=2
    await act(async()=>render())
    assert.equal(rows().length,0)
    assert.match(document.querySelector('[role="dialog"]').textContent,/Trang 1\/1/)
    assert.ok(!document.body.textContent.includes('Thông báo 21'),'Không hiện thông báo tài khoản trước')
    user=null
    await act(async()=>render())
    assert.equal(document.querySelector('[aria-controls="platform-notification-feed"]'),null)
    await act(async()=>root.unmount())
  }finally{global.fetch=savedFetch;dom.window.close()}
  console.log('Notification feed UI: 10/10/3 pages, no stale-page flash, aborted response guard, navigation/read state, account reset including admin 0 and anonymous hiding passed.')
}
run().catch(e=>{console.error(e);process.exitCode=1})
