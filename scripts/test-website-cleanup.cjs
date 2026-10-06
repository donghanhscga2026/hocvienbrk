/* eslint-disable @typescript-eslint/no-require-imports -- Kiểm thử cô lập bằng CommonJS. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript')
const {JSDOM}=require('jsdom')
const dom=new JSDOM('<div id="root"></div>',{url:'https://giautoandien.io.vn/tools/site-profiles/7/edit'})
global.window=dom.window;global.document=dom.window.document;global.HTMLElement=dom.window.HTMLElement;global.IS_REACT_ACT_ENVIRONMENT=true
const React=require('react'),{act}=React,{createRoot}=require('react-dom/client'),{renderToStaticMarkup}=require('react-dom/server')
const root=path.resolve(__dirname,'..')
let checks=0,strictReads=0,legacyReads=0,saved=null,failSave=false
const ok=(value,label)=>{assert.ok(value,label);checks++}
const palette={primary:'#234567',background:'#f4f4f4',card:'#eeeeee',foreground:'#111111',foregroundSecondary:'#333333',primaryForeground:'#ffffff',accent:'#345678',border:'#ababab'}
const profile={id:7,userId:1,slug:'owner',title:'Owner',members:[],siteConfig:{modules:{community:false,surveys:false,roadmap:true},theme:{allowUserOverride:true},courseScope:{mode:'profile'}}}
const fake={
 post:{findMany:async()=>{strictReads++;return [{id:'post',title:'Public post',content:'<p>Public content</p>'}]}},
 courseTestimonial:{findMany:async()=>[]},
}
const actions={
 getCoursesForProfile:async()=>[],
 getPostsForProfile:async()=>{legacyReads++;return [{id:'post',title:'Public post',content:'<p>Public content</p>'}]},
 updateSiteProfileRuntime:async(id,value)=>{if(failSave)throw Error('Save rejected');saved={id,...value};return {success:true}},
}
const brand={color:palette.primary,background:palette.background,palette}
const overrides={
 'server-only':{},'@/lib/prisma':{__esModule:true,default:fake},
 '@/auth':{auth:async()=>null},'@/app/actions/site-profile-actions':actions,
 './DomainShell':{useDomainBrand:()=>brand},
 'next/link':{__esModule:true,default:({children,...props})=>React.createElement('a',props,children)},
}
const cache=new Map()
function load(relative){
 let file=path.resolve(root,relative)
 if(!path.extname(file))file+=fs.existsSync(file+'.ts')?'.ts':'.tsx'
 if(cache.has(file))return cache.get(file).exports
 const mod={exports:{}};cache.set(file,mod)
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText
 new Function('require','exports','module',code)(name=>{
  if(name in overrides)return overrides[name]
  if(name.startsWith('@/'))return load(name.slice(2))
  if(name.startsWith('.'))return load(path.relative(root,path.resolve(path.dirname(file),name)))
  return require(name)
 },mod.exports,mod)
 return mod.exports
}
global.fetch=async()=>({ok:true,json:async()=>({themes:[{id:'brand',name:'Brand'}]})})
const click=async(el)=>{ok(!!el,'Interactive control exists');await act(async()=>el.click())}
const change=async(el,value)=>{await act(async()=>{el.value=value;el.dispatchEvent(new window.Event('change',{bubbles:true}))})}
const control=label=>[...document.querySelectorAll('label')].find(el=>el.textContent.includes(label))?.querySelector('input,select')
async function run(){
 const {websiteTheme,normalizeWebsitePalette,contrastRatio}=load('lib/website/theme')
 const legacy={primary:palette.primary,background:palette.background,surface:palette.card,onSurface:palette.foreground,muted:palette.foregroundSecondary,onPrimary:palette.primaryForeground,accent:palette.accent,outline:palette.border}
 assert.deepEqual(normalizeWebsitePalette(palette),normalizeWebsitePalette(legacy));checks++
 const theme=websiteTheme(palette.primary,palette.background,palette)
 for(const [key,value] of Object.entries({'--color-primary':palette.primary,'--color-background':palette.background,'--color-surface':palette.card,'--color-on-surface':palette.foreground,'--color-muted':palette.foregroundSecondary,'--color-on-primary':palette.primaryForeground,'--color-accent':palette.accent,'--color-outline':palette.border}))ok(theme.style[key]===value,'Apply full palette '+key)
 ok(!normalizeWebsitePalette({primary:'red;}</style><script>bad</script>'}).primary,'Reject unsafe palette values')
 const mixed=websiteTheme('#eeeeee','#111111',{card:'#ffffff',foreground:'#ffffff'})
 ok(contrastRatio(mixed.surface,mixed.surfaceText)>=4.5,'Text remains readable on a bright card in a dark website')
 ok(contrastRatio(mixed.primary,mixed.onPrimary)>=4.5,'Button text remains readable')
 const server=load('lib/website/server')
 for(const strict of [true,false]){
  const result=await server.websiteData(profile,{strict,courses:false})
  ok(result.posts.length===0 && result.community===false,'Disabled community returns no posts: strict='+strict)
 }
 ok(strictReads===0 && legacyReads===0,'Disabled community does not query either data source')
 profile.siteConfig.modules.community=true
 ok((await server.websiteData(profile,{strict:true,courses:false})).posts.length===1,'Enabled community still loads domain posts')
 ok((await server.websiteData(profile,{courses:false})).posts.length===1,'Enabled community still loads platform posts')
 const {blankDocument,makeNode}=load('lib/website/document'),doc=blankDocument('Test')
 const post=makeNode('posts');post.text='Hidden board';doc.pages[0].nodes=[post,makeNode('button')]
 const View=load('components/website/WebsiteView').default
 const data={courses:[],testimonials:[],posts:[{id:'post',title:'Should not leak',content:'Should not leak'}],community:false}
 const html=renderToStaticMarkup(React.createElement(View,{document:doc,data,slug:'owner',customDomain:true}))
 ok(!html.includes('Should not leak') && !html.includes('Hidden board'),'Hidden post block cannot render even with stale post data')
 ok(html.includes(palette.primary),'Website content uses the same primary as its shell')
 const Editor=load('components/admin/SiteRuntimeConfigEditor').default
 let mounted=createRoot(document.getElementById('root'))
 await act(async()=>mounted.render(React.createElement(Editor,{profile:{...profile,domains:[{hostname:'owner.example',isPrimary:true,isActive:true}]}})))
 ok(!control('Mã giáo viên') && !control('Mã khóa học') && !control('Mã danh mục'),'Automatic source hides all ID inputs')
 ok(!control('Cho phép người dùng') && !control('Khảo sát') && !control('Lộ trình'),'Unsupported domain controls are hidden')
 const source=control('Nguồn khóa học')
 for(const [mode,label] of [['teacher','Mã giáo viên'],['ids','Mã khóa học'],['category','Mã danh mục']]){
  await change(source,mode);ok(!!control(label),'Only relevant ID control is shown: '+mode)
  ok(document.querySelectorAll('input[placeholder^="Ví dụ:"]').length===1,'No unrelated ID input remains visible')
 }
 await change(source,'profile')
 await click([...document.querySelectorAll('button')].find(el=>el.textContent.includes('Lưu cấu hình')))
 ok(saved.siteConfig.modules.surveys===false && saved.siteConfig.modules.roadmap===true && saved.siteConfig.theme.allowUserOverride===true,'Saving preserves hidden legacy settings')
 failSave=true
 const saveButton=[...document.querySelectorAll('button')].find(el=>el.textContent.includes('Lưu cấu hình'))
 await click(saveButton)
 ok(!saveButton.disabled && document.body.textContent.includes('Save rejected'),'Failed save restores controls and displays error')
 await act(async()=>mounted.unmount())
 mounted=createRoot(document.getElementById('root'))
 await act(async()=>mounted.render(React.createElement(Editor,{profile:{...profile,verifiedDomains:[{hostname:'verified.example'}]}})))
 ok(!control('Cho phép người dùng'),'Verified registry domains also hide unsupported controls')
 await act(async()=>mounted.unmount())
 mounted=createRoot(document.getElementById('root'))
 await act(async()=>mounted.render(React.createElement(Editor,{profile:{...profile,domains:[{hostname:'giautoandien.io.vn',isPrimary:true,isActive:true}]}})))
 ok(!!control('Cho phép người dùng') && !!control('Khảo sát') && !!control('Lộ trình'),'Platform controls remain available on the platform')
 await act(async()=>mounted.unmount())
 console.log('Website cleanup: '+checks+' checks passed (mock data and DOM; no live writes).')
}
run().catch(error=>{console.error(error);process.exitCode=1})
