const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript')
const {JSDOM}=require('jsdom'),root=path.resolve(__dirname,'..'),cache=new Map()
function load(file){file=path.extname(file)?file:file+'.ts';if(cache.has(file))return cache.get(file);const m={exports:{}};const code=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;new Function('require','exports','module',code)(name=>name.startsWith('@/')?load(name.slice(2)):name.startsWith('.')?load(path.posix.join(path.posix.dirname(file),name)):require(name),m.exports,m);cache.set(file,m.exports);return m.exports}
async function run(){
 const {detectTemplateControls}=load('lib/course-page/importer/detect-controls'),{controlsSchema,resolveControlAction}=load('lib/course-page/importer/controls')
 const fixture='<section id="hero"><h1>Hero</h1><a href="#info">Thông tin</a><button onclick="window.oldAction=true">Xem khóa học</button><button>Đăng ký</button><button>Đăng ký</button></section><section id="panels"><div id="summary">Summary</div><div id="info" style="display:none" hidden>Info</div></section><footer id="end">End</footer>'
 const found=detectTemplateControls(fixture),again=detectTemplateControls(found.html)
 assert.deepEqual(again.controls,found.controls,'Re-detection retains stable DOM keys')
 assert.equal(found.controls.items.length,4)
 assert.equal(new Set(found.controls.items.map(c=>c.id)).size,4,'Duplicate labels have unique keys')
 const target=found.controls.targets.find(t=>t.originalId==='info'),end=found.controls.targets.find(t=>t.originalId==='end')
 const configured={...found.controls,bindings:[{id:'control-1',action:'tab',target:target.id},{id:'control-2',action:'course',target:'/khoa-hoc/COURSE-7'},{id:'control-3',action:'register',target:''},{id:'control-4',action:'scroll',target:end.id}]}
 assert.deepEqual(controlsSchema.parse(configured),configured)
 assert.throws(()=>controlsSchema.parse({...configured,bindings:[{id:'control-1',action:'link',target:'javascript:alert(1)'}]}))
 assert.throws(()=>controlsSchema.parse({...configured,bindings:[{id:'control-1',action:'tab',target:'target-999'}]}))
 assert.throws(()=>controlsSchema.parse({...configured,bindings:[configured.bindings[0],configured.bindings[0]]}))
 const compact=load('lib/course-page/importer/compact-analysis').compactExactAnalysis({sourceType:'html',exactSource:{url:'https://source.invalid/a.html'},sections:[],controls:configured})
 assert.deepEqual(compact.controls,configured,'Metadata compaction keeps button mappings')
 const {BRIDGE}=load('lib/course-page/importer/zip-browser')
 const dom=new JSDOM(found.html+BRIDGE,{runScripts:'dangerously',url:'https://frame.invalid/api/course-template-source'})
 const events=[];dom.window.postMessage=e=>events.push(e)
 dom.window.dispatchEvent(new dom.window.MessageEvent('message',{source:dom.window,data:{source:'mfc-zip-parent',type:'configure',controlBindings:configured.bindings}}))
 const doc=dom.window.document
 const click=id=>doc.querySelector(`[data-mfc-control="${id}"]`).click()
 click('control-1');assert.equal(doc.getElementById('info').hidden,false);assert.notEqual(doc.getElementById('info').style.display,'none');assert.equal(doc.getElementById('summary').hidden,true);assert.equal(doc.getElementById('hero').hidden,false,'Tab does not hide unrelated section')
 click('control-2');assert.equal(dom.window.oldAction,undefined,'Configured action overrides old inline handler')
 click('control-3');click('control-4')
 assert.ok(events.some(e=>e.type==='scroll'))
 assert.deepEqual(events.filter(e=>e.type==='control_action').map(e=>e.controlId),['control-1','control-2','control-3','control-4'])
 assert.deepEqual(resolveControlAction(configured.bindings[2],'https://platform.invalid/khoa-hoc/COURSE-7'),{kind:'registration'})
 assert.deepEqual(resolveControlAction(configured.bindings[1],'https://brand.invalid/page/a?ref=REF',['/khoa-hoc/COURSE-7']),{kind:'link',url:'https://brand.invalid/khoa-hoc/COURSE-7?ref=REF'})
 assert.deepEqual(resolveControlAction(configured.bindings[1],'https://brand.invalid/page/a',[]),{kind:'blocked'})
 assert.deepEqual(resolveControlAction({id:'control-1',action:'register',target:'/khoa-hoc/COURSE-7'},'https://platform.invalid/page/a?ref=REF'),{kind:'link',url:'https://platform.invalid/khoa-hoc/COURSE-7?register=1&ref=REF'})
 assert.deepEqual(resolveControlAction({id:'control-1',action:'link',target:'//evil.invalid'},'https://platform.invalid/'),{kind:'blocked'})
 dom.window.close()
 // Kiểm tra component parent nhận đúng iframe và tra cấu hình, không tin URL gửi từ nguồn.
 const React=require('react'),{createRoot}=require('react-dom/client'),host=new JSDOM('<div id="root"></div>',{url:'https://platform.invalid/tools/design'})
 global.window=host.window;global.document=host.window.document;global.IS_REACT_ACT_ENVIRONMENT=true
 Object.defineProperty(global,'navigator',{value:host.window.navigator,configurable:true})
 const Frame=load('components/course-page/sections/ZipSourceSection.tsx').default,Editor=load('components/course-page/TemplateControlEditor.tsx').default
 const ui=createRoot(document.getElementById('root'));let registrations=0,changed=null
 await React.act(async()=>ui.render(React.createElement('div',null,React.createElement(Editor,{value:configured,courses:[{title:'Course 7',href:'/khoa-hoc/COURSE-7'}],onChange:v=>changed=v}),React.createElement(Frame,{content:{exactSource:{url:'https://source.invalid/a.html'},controls:configured},testMode:true}))))
 const action=document.querySelector('[aria-label="Hành động control-2"]')
 await React.act(async()=>{action.value='register';action.dispatchEvent(new window.Event('change',{bubbles:true}))})
 assert.equal(changed.bindings.find(b=>b.id==='control-2').action,'register','UI edits selected button only')
 assert.equal(changed.bindings.find(b=>b.id==='control-1').action,'tab')
 const send=async source=>React.act(async()=>window.dispatchEvent(new window.MessageEvent('message',{source,data:{source:'mfc-zip-source',type:'control_action',controlId:'control-2',target:'https://evil.invalid'}})))
 await send(null);assert.ok(!document.querySelector('[role="status"]'),'Foreign messages ignored')
 await send(document.querySelector('iframe').contentWindow);assert.ok(document.querySelector('[role="status"]').textContent.includes('/khoa-hoc/COURSE-7'));assert.ok(!document.querySelector('[role="status"]').textContent.includes('evil.invalid'))
 await React.act(async()=>ui.render(React.createElement(Frame,{content:{exactSource:{url:'https://source.invalid/a.html'},controls:configured},onAction:action=>{if(action==='open_registration')registrations++}})))
 await React.act(async()=>window.dispatchEvent(new window.MessageEvent('message',{source:document.querySelector('iframe').contentWindow,data:{source:'mfc-zip-source',type:'control_action',controlId:'control-3'}})))
 assert.equal(registrations,1,'Configured registration calls existing checkout')
 await React.act(async()=>ui.unmount());host.window.close()
 if(process.argv[2]){const actual=detectTemplateControls(fs.readFileSync(process.argv[2],'utf8'));controlsSchema.parse(actual.controls);console.log(`Actual template: ${actual.controls.items.length} controls, ${actual.controls.targets.length} content targets detected.`)}
 console.log('Template controls: stable detection, duplicate labels, tab groups, action override, navigation/referral, scope, persistence, UI editing, preview and message boundaries passed.')
}
run().catch(e=>{console.error(e);process.exitCode=1})
