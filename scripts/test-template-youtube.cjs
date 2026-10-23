// Compile/save/reopen + sandbox messaging regression checks; no live data writes.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript')
const {JSDOM}=require('jsdom'),React=require('react'),{createRoot}=require('react-dom/client')
const root=path.resolve(__dirname,'..'),cache=new Map()
function load(rel){
  let file=path.resolve(root,rel)
  if(!path.extname(file))file+=fs.existsSync(file+'.ts')?'.ts':'.tsx'
  if(cache.has(file))return cache.get(file).exports
  const mod={exports:{}};cache.set(file,mod)
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText
  new Function('require','module','exports',code)(name=>name.startsWith('@/')?load(name.slice(2)):name.startsWith('.')?load(path.relative(root,path.resolve(path.dirname(file),name))):require(name),mod,mod.exports)
  return mod.exports
}
const url='https://www.youtube.com/embed/vTUWuunXjDY'
async function run(){
  const media=load('lib/course-page/youtube-embed'),compiler=load('lib/course-page/template-source')
  for(const unsafe of ['http://www.youtube.com/embed/vTUWuunXjDY','https://www.youtube.com.evil.test/embed/vTUWuunXjDY','https://evil.test/embed/vTUWuunXjDY','https://www.youtube.com@evil.test/embed/vTUWuunXjDY','https://www.youtube.com:444/embed/vTUWuunXjDY','javascript:alert(1)','data:text/html,hi','/embed/vTUWuunXjDY',url+'/other','https://www.youtube.com/watch?v=vTUWuunXjDY'])assert.equal(media.youtubeEmbedUrl(unsafe),null,unsafe)
  assert.equal(media.youtubeEmbedUrl(url+'?start=12&origin=https://evil.test&autoplay=1'),url+'?playsinline=1&start=12')
  assert.match(media.youtubeEmbedUrl(url.replace('youtube.com','youtube-nocookie.com')),/www.youtube-nocookie.com/)
  const raw=`<html><body><h1>Wi.Tech</h1><section style="aspect-ratio:16/9;position:relative"><iframe width="1059" height="595" src="${url}" title="Core team" style="position:absolute;inset:0;width:100%;height:100%" srcdoc="unsafe" onload="bad()"></iframe></section><iframe src="https://evil.test"></iframe></body></html>`
  const saved=compiler.compileTemplateSource(compiler.sourceFromHtml(raw))
  const doc=new JSDOM(saved.html).window.document,slot=doc.querySelector('[data-mfc-youtube]')
  assert.ok(slot);assert.equal(slot.tagName,'DIV');assert.equal(slot.hasAttribute('onload'),false);assert.equal(slot.hasAttribute('srcdoc'),false)
  assert.equal(doc.querySelectorAll('iframe').length,0)
  assert.match(doc.querySelector('meta[http-equiv]').content,/frame-src 'none'/,'Templates keep child frame/network isolation')
  const reopened=compiler.compileTemplateSource(compiler.sourceFromHtml(saved.html))
  const again=new JSDOM(reopened.html).window.document
  assert.equal(again.querySelectorAll('[data-mfc-youtube]').length,1)
  assert.equal(again.querySelectorAll('script[data-mfc-youtube-bridge]').length,1)
  const page=load('lib/website/page-template').renderPageTemplate(raw,null,[])
  assert.equal(new JSDOM(page).window.document.querySelectorAll('[data-mfc-youtube]').length,1)
  await bridgeChecks(saved.html)
  await overlayChecks()
  console.log('PASS YouTube: exact hosts/URLs, privacy host, compile-save-reopen, Page, responsive geometry, spoof rejection, safe parent player/fullscreen, stable playback on scroll and hidden-slot cleanup; no live writes.')
}
async function bridgeChecks(html){
  const dom=new JSDOM(html,{runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,el=w.document.querySelector('[data-mfc-youtube]'),messages=[]
  el.getBoundingClientRect=()=>({left:20,top:40,right:580,bottom:355,width:560,height:315})
  el.getClientRects=()=>[el.getBoundingClientRect()]
  w.postMessage=data=>messages.push(data)
  w.eval(w.document.querySelector('[data-mfc-youtube-bridge]').textContent)
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'))
  await new Promise(r=>setTimeout(r,35))
  assert.equal(messages.at(-1).slots[0].width,560)
  el.getClientRects=()=>[];w.dispatchEvent(new w.Event('resize'))
  await new Promise(r=>setTimeout(r,35));assert.equal(messages.at(-1).slots.length,0)
  w.requestAnimationFrame=()=>0
  await new Promise(r=>setTimeout(r,35))
  dom.window.close()
}
async function overlayChecks(){
  const dom=new JSDOM('<div id="root"></div>',{url:'https://www.wi300.vn'})
  global.window=dom.window;global.document=dom.window.document;global.IS_REACT_ACT_ENVIRONMENT=true
  Object.defineProperty(global,'navigator',{value:dom.window.navigator,configurable:true})
  const Component=load('components/course/TemplateVideoOverlays').default,frame=React.createRef()
  function Host(){return React.createElement('div',{style:{position:'relative'}},React.createElement('iframe',{ref:frame,title:'Template',sandbox:'allow-scripts'}),React.createElement(Component,{frame,revision:'1'}))}
  const ui=createRoot(document.getElementById('root'))
  await React.act(async()=>ui.render(React.createElement(Host)))
  const template=frame.current
  Object.defineProperty(template,'offsetWidth',{value:1000});template.getBoundingClientRect=()=>({width:500})
  const item={id:'1',src:url,title:'Core team',left:40,top:100,width:560,height:315,radius:'16px',clip:[0,0,0,0]}
  const send=async(slots,source=template.contentWindow)=>React.act(async()=>window.dispatchEvent(new window.MessageEvent('message',{source,data:{source:'mfc-youtube-slots',slots}})))
  await send([item],window);assert.equal(document.querySelectorAll('iframe').length,1)
  await send([{...item,src:'https://evil.test'}]);assert.equal(document.querySelectorAll('iframe').length,1)
  await send([{...item,left:NaN}]);assert.equal(document.querySelectorAll('iframe').length,1)
  await send([item]);const player=document.querySelectorAll('iframe')[1]
  assert.ok(player);assert.equal(player.getAttribute('referrerpolicy'),'strict-origin-when-cross-origin')
  assert.equal(player.hasAttribute('allowfullscreen'),true);assert.equal(player.hasAttribute('sandbox'),false)
  assert.equal(template.getAttribute('sandbox'),'allow-scripts')
  assert.equal(player.parentElement.style.width,'280px');assert.equal(player.parentElement.style.top,'50px')
  await send([{...item,top:-20,clip:[20,0,0,0]}]);assert.equal(document.querySelectorAll('iframe')[1],player,'Scrolling must preserve the playing iframe')
  assert.equal(player.parentElement.style.clipPath,'inset(10px 0px 0px 0px)')
  await send([]);assert.equal(document.querySelectorAll('iframe').length,1)
  await React.act(async()=>ui.unmount());dom.window.close()
}
run().catch(error=>{console.error(error);process.exitCode=1})
