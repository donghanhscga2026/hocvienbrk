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
 const configured={...profile,slug:'owner',communityAvailable:false,themeId:'brand',siteConfig:{...profile.siteConfig,homepage:{type:'landing',landingSlug:'existing-sales'},branding:{name:'Owner',custom:'keep'},courseScope:{mode:'teacher',teacherIds:[42]},modules:{community:false,tools:false,surveys:false,roadmap:true}},domains:[{hostname:'owner.example',isPrimary:true,isActive:true}]}
 await act(async()=>mounted.render(React.createElement(Editor,{profile:configured})))
 ok(document.querySelectorAll('select').length===0,'Duplicate homepage, theme and data selectors are removed')
 ok(!control('Công cụ') && !control('Hiển thị bảng tin'),'No ineffective tools or missing community block controls')
 ok(document.body.textContent.includes('Sales page đã chọn'),'Existing landing homepage is shown without changing it')
 ok(!control('Tên miền chính') && !control('Tên miền phụ') && !document.body.textContent.includes('Tên miền do Admin cấp'),'Duplicate manual domain controls are removed')
 ok(document.querySelector('a[href="/page/owner"]'),'View link targets the edited profile')
 await click([...document.querySelectorAll('button')].find(el=>el.textContent.includes('Lưu thông tin')))
 ok(!('homepage' in saved.siteConfig) && !('courseScope' in saved.siteConfig) && !('theme' in saved.siteConfig) && !('themeId' in saved),'Save does not overwrite hidden homepage, course source or palette')
 ok(!('modules' in saved.siteConfig),'No modules overwritten when no community control')
 ok(saved.siteConfig.branding.custom==='keep','Unknown branding fields are preserved')
 ok(!('primaryDomain' in saved) && !('additionalDomains' in saved),'Unchanged domain mapping is not rewritten')
 failSave=true
 const saveButton=[...document.querySelectorAll('button')].find(el=>el.textContent.includes('Lưu thông tin'))
 await click(saveButton)
 ok(!saveButton.disabled && document.body.textContent.includes('Save rejected'),'Failed save restores controls and displays error')
 failSave=false
 await act(async()=>mounted.unmount())
 mounted=createRoot(document.getElementById('root'))
 await act(async()=>mounted.render(React.createElement(Editor,{profile:{...configured,communityAvailable:true}})))
 ok(!!control('Hiển thị bảng tin'),'Community control appears only when the profile declares a real board')
 await click(control('Hiển thị bảng tin'))
 await click([...document.querySelectorAll('button')].find(el=>el.textContent.includes('Lưu thông tin')))
 ok(saved.siteConfig.modules.community===true && saved.siteConfig.modules.tools===false && saved.siteConfig.modules.surveys===false && saved.siteConfig.modules.roadmap===true,'Community changes preserve every other module setting')
 await act(async()=>mounted.unmount())
 const Demo=load('app/website-demo/page').default
 mounted=createRoot(document.getElementById('root'))
 await act(async()=>mounted.render(React.createElement(Demo)))
 ok(document.querySelector('#course-offer h1')?.textContent==='Xây nền tảng chuyên môn','Demo starts with dedicated course sales template')
 const mainChoice=control('Khóa học chính')
 await act(async()=>{mainChoice.value='2';mainChoice.dispatchEvent(new window.Event('change',{bubbles:true}))})
 ok(document.querySelector('#course-offer h1')?.textContent==='Ứng dụng kiến thức vào công việc','Changing main course updates the hero')
 ok(document.querySelector('#course-offer a')?.getAttribute('href')==='/khoa-hoc/demo-2','Changing main course updates enrollment link')
 const mode=control('Cách dùng mẫu')
 await act(async()=>{mode.value='website';mode.dispatchEvent(new window.Event('change',{bubbles:true}))})
 ok(document.body.textContent.includes('Phát triển thương hiệu cá nhân'),'General demo still shows all sample courses')
 await click(control('Chỉ chọn khóa học'))
 ok(!document.body.textContent.includes('Phát triển thương hiệu cá nhân') && document.body.textContent.includes('Xây nền tảng chuyên môn'),'Course picker filters displayed cards')
 await click(control('Hiển thị khối Khóa học'))
 ok(!document.body.textContent.includes('Xây nền tảng chuyên môn'),'Demo course switch removes course block')
 await click(control('Thêm khối HTML'))
 ok(!!document.querySelector('iframe[sandbox=""]'),'HTML sample is rendered in an isolated frame')
 await click(control('Xem chiều rộng điện thoại'))
 ok([...document.querySelectorAll('div')].some(el=>el.style.width==='390px'),'Mobile demo uses a narrow preview')
 await click([...document.querySelectorAll('button')].find(el=>el.textContent==='Liên hệ'))
 ok(document.body.textContent.includes('Cùng trao đổi về mục tiêu của bạn'),'Demo contact navigation works')
 await click([...document.querySelectorAll('button')].find(el=>el.textContent.includes('Xem cấu trúc JSON')))
 ok(!!document.querySelector('pre') && !document.querySelector('pre').textContent.includes('demo-1'),'Export structure excludes mock course records')
 await act(async()=>mounted.unmount())
 console.log('Website cleanup: '+checks+' checks passed (mock data and DOM; no live writes).')
}
run().catch(error=>{console.error(error);process.exitCode=1})
