const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
const ts=require('typescript'),React=require('react'),{JSDOM}=require('jsdom')
const {act}=React
function load(file,overrides={}){
  const m={exports:{}}
  const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText
  new Function('require','module','exports',code)(n=>n in overrides?overrides[n]:require(n),m,m.exports)
  return m.exports
}
async function run(){
  const model=load('lib/wi300/landing-ai.ts')
  const brief={...model.initialBrief,name:'Zalo Mastery',audience:'Chủ doanh nghiệp nhỏ',benefits:'Lợi ích do người dùng cung cấp'}
  for(const [kind,length] of [['course',9],['service',8],['gift',5]])assert.equal(model.makeLandingOutline({...brief,kind}).length,length)
  const custom=model.makeLandingOutline({...brief,mode:'custom',customOutline:'Mở đầu\nGiới thiệu\nLiên hệ'})
  assert.deepEqual(custom.map(s=>s.title),['Mở đầu','Giới thiệu','Liên hệ'])
  assert.ok(model.outlineError({...brief,mode:'custom',customOutline:Array(13).fill('phần').join('\n')}))
  assert.throws(()=>model.makeLandingOutline({...brief,name:''}),/Điền tên/)
  const draft=model.createLandingDraft(brief,model.makeLandingOutline(brief))
  assert.ok(draft.find(s=>s.kind==='proof').needsInput)
  assert.ok(draft.find(s=>s.kind==='offer').needsInput)
  assert.equal(draft.find(s=>s.kind==='benefits').body,brief.benefits)
  const moved=model.moveLandingSection(custom,1,-1)
  assert.equal(moved[0].id,custom[1].id)
  assert.equal(custom[0].title,'Mở đầu')
  for(const url of ['javascript:alert(1)','data:text/html,evil','http://example.com','https://user:pass@example.com'])assert.equal(model.safeLandingUrl(url),'')
  const html=model.landingHtml({...brief,name:'<script>alert(1)</script>',color:'red;bad',ctaUrl:'javascript:alert(1)'},[{...draft[0],title:'<img src=x onerror=evil()>',body:'<script>evil()</script>'}])
  assert.ok(!html.includes('<script>')&&!html.includes('<img src=x')&&!html.includes('href="javascript:'))
  assert.ok(html.includes('&lt;script&gt;')&&html.includes('#236c1e'))
  assert.ok(html.includes('@media(max-width:600px)'))
  assert.ok(!html.includes('cdn.tailwindcss.com'))
  let brand=null
  const savedEnv=process.env.VERCEL_ENV
  const Ui=()=>null
  const page=load('app/tools/landing-ai/page.tsx',{'next/navigation':{notFound:()=>{throw Error('not-found')}},'@/lib/site-profile/deployment-runtime':{getCurrentDeploymentBrand:async()=>brand},'@/components/wi300/WiLandingAI':{__esModule:true,default:Ui}}).default
  process.env.VERCEL_ENV='production'
  await assert.rejects(page(),/not-found/)
  process.env.VERCEL_ENV='preview'
  assert.ok(await page(),'Có thể thử giao diện trên preview chưa cấu hình WI300')
  process.env.VERCEL_ENV='production';brand={name:'WI300'}
  assert.ok(await page())
  if(savedEnv==null)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=savedEnv

  const dom=new JSDOM('<div id="root"></div>',{url:'https://wi300.example/tools/landing-ai',pretendToBeVisual:true})
  global.window=dom.window;global.document=dom.window.document;global.IS_REACT_ACT_ENVIRONMENT=true
  Object.defineProperty(global,'navigator',{configurable:true,value:dom.window.navigator})
  const root=require('react-dom/client').createRoot(document.getElementById('root'))
  const Builder=load('components/wi300/WiLandingAI.tsx',{'@/lib/wi300/landing-ai':model}).default
  const click=name=>[...document.querySelectorAll('button')].find(b=>b.textContent===name||b.getAttribute('aria-label')===name).click()
  const field=name=>[...document.querySelectorAll('label')].find(l=>l.textContent.startsWith(name)).querySelector('input,textarea,select')
  const fill=(el,value)=>{const proto=el.tagName==='TEXTAREA'?window.HTMLTextAreaElement.prototype:el.tagName==='SELECT'?window.HTMLSelectElement.prototype:window.HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(el,value);el.dispatchEvent(new window.Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}))}
  let blob,downloads=0
  const savedCreate=URL.createObjectURL,savedRevoke=URL.revokeObjectURL
  URL.createObjectURL=value=>{blob=value;return 'blob:test'};URL.revokeObjectURL=()=>{}
  window.HTMLAnchorElement.prototype.click=function(){downloads++}
  try{
    await act(async()=>root.render(React.createElement(Builder)))
    assert.match(document.body.textContent,/Chưa kết nối AI thật/)
    assert.equal(document.querySelector('iframe'),null)
    await act(async()=>document.querySelector('form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true})))
    assert.match(document.querySelector('[role="alert"]').textContent,/Điền tên/)
    await act(async()=>{fill(field('Tên sản phẩm'),'Khóa thử');fill(field('Khách hàng'),'Nhà đào tạo');fill(field('Lợi ích chính'),'Nội dung thật được cung cấp')})
    await act(async()=>click('Tạo dàn ý mẫu'))
    assert.equal(document.querySelectorAll('ol li').length,9)
    assert.equal(document.querySelector('iframe'),null,'Phải duyệt dàn ý trước khi tạo trang')
    const first=document.querySelector('[aria-label="Tên phần 1"]').value
    await act(async()=>click('Đưa phần 1 xuống'))
    assert.equal(document.querySelector('[aria-label="Tên phần 2"]').value,first)
    await act(async()=>click('Thêm phần'))
    assert.equal(document.querySelectorAll('ol li').length,10)
    await act(async()=>click('Xóa phần 10'))
    assert.equal(document.querySelectorAll('ol li').length,9)
    await act(async()=>click('Duyệt dàn ý và tạo bản nháp'))
    const frame=document.querySelector('iframe')
    assert.ok(frame.getAttribute('srcdoc').includes('Khóa thử'))
    assert.equal(frame.getAttribute('sandbox'),'')
    await act(async()=>fill(field('Nội dung phần'),'Nội dung tôi sửa'))
    assert.ok(frame.getAttribute('srcdoc').includes('Nội dung tôi sửa'))
    await act(async()=>click('Điện thoại'))
    assert.ok(frame.className.includes('w-[375px]'))
    await act(async()=>click('Máy tính'))
    assert.ok(frame.className.includes('w-full'))
    await act(async()=>click('Tải HTML bản nháp'))
    assert.equal(downloads,1)
    assert.ok((await blob.text()).includes('Nội dung tôi sửa'))
    await act(async()=>click('Sửa dàn ý'))
    await act(async()=>click('Sửa thông tin'))
    await act(async()=>document.querySelector('input[name="landing-mode"]').parentElement.parentElement.querySelectorAll('input')[2].click())
    await act(async()=>fill(field('Dàn ý riêng'),'Mở đầu\nChuyên gia\nLiên hệ'))
    await act(async()=>click('Tạo dàn ý mẫu'))
    assert.equal(document.querySelectorAll('ol li').length,3)
    await act(async()=>root.unmount())
  }finally{URL.createObjectURL=savedCreate;URL.revokeObjectURL=savedRevoke;dom.window.close()}
  console.log('Wi Landing AI prototype: three templates/custom outline, validation/reorder/add/remove/approval, no invented proof/price, editing and mobile/desktop preview, safe compiled-CSS HTML download, sandboxed preview and production/preview visibility passed. No AI or database calls.')
}
run().catch(e=>{console.error(e);process.exitCode=1})
