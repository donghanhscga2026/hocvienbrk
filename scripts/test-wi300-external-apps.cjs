const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
const ts=require('typescript'),React=require('react'),{JSDOM}=require('jsdom')
const {act}=React
function load(file,overrides={}){
  const m={exports:{}}
  const s=ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText
  new Function('require','module','exports',s)(n=>n in overrides?overrides[n]:require(n),m,m.exports)
  return m.exports
}
async function run(){
  const registry=load('lib/wi300/external-apps.ts')
  assert.equal(registry.externalApps.length,2)
  assert.equal(registry.findExternalApp('https://evil.invalid'),undefined)
  assert.equal(registry.findExternalApp('__proto__'),undefined)
  const titles=load('lib/wi300/default-pages.ts',{'./external-apps':registry})
  assert.equal(titles.defaultPageTitle('/tools/apps/cleanimage'),'CleanImage')
  assert.equal(titles.defaultPageTitle('/tools/apps/digital-biz-scan'),'Digital Biz Scan')
  const savedVariant=process.env.SITE_VARIANT
  try {
    for(const variant of ['wi300','legacy']){
      process.env.SITE_VARIANT=variant
      const config=load('next.config.ts').default
      const h=(await config.headers()).find(r=>r.source==='/:path*').headers
      const csp=h.find(h=>h.key==='Content-Security-Policy').value
      for(const app of registry.externalApps)assert.equal(csp.includes(new URL(app.url).origin),variant==='wi300')
      assert.ok(csp.includes("frame-ancestors 'self'"))
      assert.equal(h.find(h=>h.key==='X-Frame-Options').value,'SAMEORIGIN')
    }
  }finally{if(savedVariant==null)delete process.env.SITE_VARIANT;else process.env.SITE_VARIANT=savedVariant}
  const dom=new JSDOM('<div id="root"></div>',{url:'https://wi300.example/tools/apps/cleanimage'})
  global.window=dom.window;global.document=dom.window.document;global.IS_REACT_ACT_ENVIRONMENT=true
  Object.defineProperty(global,'navigator',{configurable:true,value:dom.window.navigator})
  const link={__esModule:true,default:({children,...props})=>React.createElement('a',props,children)}
  const ui=load('components/wi300/Wi300ExternalApps.tsx',{'next/link':link,'@/lib/wi300/external-apps':registry})
  const root=require('react-dom/client').createRoot(document.getElementById('root'))
  const click=name=>[...document.querySelectorAll('button')].find(b=>b.textContent===name).click()
  let brand={name:'WI300'}
  const missing=()=>{throw Error('not-found')}
  const overrides={'next/navigation':{notFound:missing},'@/lib/site-profile/deployment-runtime':{getCurrentDeploymentBrand:async()=>brand},'@/lib/site-profile/presentation':{getPagePresentation:async()=>brand?'wi300':'classic',getPresentationBrand:async()=>brand},'@/lib/wi300/external-apps':registry,'@/components/wi300/Wi300ExternalApps':ui}
  const page=load('app/tools/apps/[slug]/page.tsx',overrides).default
  const catalogPage=load('app/tools/apps/page.tsx',overrides).default
  try{
    await act(async()=>root.render(await catalogPage()))
    assert.equal(document.querySelectorAll('a[href^="/tools/apps/"]').length,2)
    assert.equal(document.querySelector('iframe'),null,'Danh mục không tải app')
    await act(async()=>root.render(await page({params:Promise.resolve({slug:'cleanimage'})})))
    const frame=document.querySelector('iframe')
    assert.equal(frame.src,'https://cleanimage.vercel.app/')
    assert.equal(frame.title,'CleanImage')
    assert.equal(frame.getAttribute('referrerpolicy'),'no-referrer')
    assert.ok(frame.getAttribute('sandbox').includes('allow-downloads'))
    assert.ok(!frame.getAttribute('sandbox').includes('allow-top-navigation'))
    assert.ok(frame.getAttribute('allow').includes('clipboard-read'))
    const external=document.querySelector('a[target="_blank"]')
    assert.equal(external.href,frame.src)
    assert.equal(external.rel,'noopener noreferrer')
    await act(async()=>click('Mở rộng khung'))
    assert.equal(document.querySelector('iframe'),frame,'Mở rộng không tải lại app hoặc mất ảnh đang xử lý')
    await act(async()=>click('Thu gọn khung'))
    assert.equal(document.querySelector('iframe'),frame)
    await act(async()=>click('Đóng khung'))
    assert.equal(document.querySelector('iframe'),null)
    await act(async()=>click('Thử mở trong WI300'))
    assert.ok(document.querySelector('iframe'))
    await act(async()=>root.render(await page({params:Promise.resolve({slug:'digital-biz-scan'})})))
    assert.equal(document.querySelector('iframe'),null,'App chưa xác minh không tự tải iframe')
    assert.equal(document.querySelector('a[target="_blank"]').href,'https://digital-biz-scan.lovable.app/')
    await act(async()=>click('Thử mở trong WI300'))
    assert.equal(document.querySelector('iframe').src,'https://digital-biz-scan.lovable.app/')
    await assert.rejects(page({params:Promise.resolve({slug:'unknown'})}),/not-found/)
    // GĐ2: không có brand wi300, ứng dụng ngoài vẫn mở với bản classic.
    brand=null
    await act(async()=>root.render(await catalogPage()))
    assert.equal(document.querySelectorAll('a[href^="/tools/apps/"]').length,2,'Classic catalog lists the same external apps')
    await act(async()=>root.render(await page({params:Promise.resolve({slug:'cleanimage'})})))
    assert.equal(document.querySelector('iframe').src,'https://cleanimage.vercel.app/','Classic viewer embeds the same app')
    await act(async()=>root.unmount())
  }finally{dom.window.close()}
  console.log('WI300 external apps: fixed registry, no database, exact-host WI300-only CSP, legacy headers retained, cards without iframe loading, dedicated pages/404, classic fallback without brand, safe new-tab links, optional embedding/download/clipboard and preserved frame on resize passed. Third-party iframe functions need live-browser testing.')
}
run().catch(e=>{console.error(e);process.exitCode=1})
