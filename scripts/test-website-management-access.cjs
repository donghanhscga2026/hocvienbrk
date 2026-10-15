/* Isolated authorization and tab-scoping checks; no production database writes. */
const assert=require('node:assert/strict'),load=require('./helpers/load-ts.cjs')
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server')
let actor={id:1,role:'TEACHER'},sessionRole='ADMIN',host='giautoandien.io.vn',selection='7'
const profiles=[{id:7,userId:1,slug:'lucy',members:[{userId:2,role:'ASSOCIATE'},{userId:3,role:'WEBSITE_MANAGER'}],user:{role:'TEACHER'},isActive:true},{id:8,userId:4,slug:'other',members:[],user:{role:'ADMIN'},isActive:true}]
const configs=new Map();let writes=0,listing
const db={user:{findUnique:async({where})=>actor && where.id===actor.id?actor:[1,2,3,4].includes(where.id)?{id:where.id,role:'TEACHER'}:null},siteProfile:{findUnique:async({where})=>profiles.find(p=>where.id===undefined?p.userId===where.userId:p.id===where.id),findMany:async query=>{listing=query;return profiles.map(p=>({...p,user:{name:p.slug}}))},update:async({where,data})=>{writes++;const p=profiles.find(p=>p.id===where.id);Object.assign(p,data);return p}},systemConfig:{findUnique:async({where})=>configs.has(where.key)?{value:configs.get(where.key)}:null,upsert:async({where,create})=>{writes++;configs.set(where.key,create.value)}},siteDomain:{findMany:async()=>[]},siteProfileDomain:{findMany:async()=>[]}}
db.siteProfileMember={upsert:async({where,create,update})=>{writes++;const p=profiles.find(p=>p.id===where.profileId_userId.profileId);let member=p.members.find(m=>m.userId===where.profileId_userId.userId);if(member)Object.assign(member,update);else p.members.push(member={...create});return member},delete:async({where})=>{writes++;const p=profiles.find(p=>p.id===where.profileId_userId.profileId);p.members=p.members.filter(m=>m.userId!==where.profileId_userId.userId)}}
const mocks={'server-only':{},'@/auth':{auth:async()=>actor?{user:{id:String(actor.id),role:sessionRole}}:null},'@/lib/prisma':{__esModule:true,default:db},'next/headers':{headers:async()=>new Headers({host})},'@/lib/api-auth':{requireAdminAction:async()=>actor?.role==='ADMIN'?null:{error:'Admin only'}},'next/cache':{unstable_cache:fn=>fn,revalidatePath:()=>{},revalidateTag:()=>{}},'@/lib/site-profile/runtime':{getCourseWhereForProfile:()=>({}),getSiteRuntimeConfig:()=>({homepage:{type:'profile'}}),normalizeSiteHostname:s=>s},'@/lib/website/server':{ownedProfile:async request=>management.managedProfile(request?Number(new URL(request.url).searchParams.get('profileId')):undefined,false,request)},'next/navigation':{useSearchParams:()=>new URLSearchParams('profileId='+selection)}}
const management=load('lib/website/management.ts',mocks)
const request=id=>new Request('https://'+host+'/api/websites/access?profileId='+id,{headers:{host}})
async function run(){
 assert.equal((await management.managedProfile()).id,7)
 await assert.rejects(management.managedProfile(8),e=>e.status===404)
 actor={id:2,role:'TEACHER'};await assert.rejects(management.managedProfile(7),e=>e.status===404)
 actor={id:3,role:'STUDENT'};assert.equal((await management.managedProfile(7)).id,7)
 await assert.rejects(management.managedProfile(7,true),e=>e.status===404)
 profiles[0].members[1].role='ASSOCIATE';await assert.rejects(management.managedProfile(7),e=>e.status===404)
 profiles[0].members[1].role='WEBSITE_MANAGER'
 actor={id:0,role:'ADMIN'};assert.equal((await management.managedProfile(8)).id,8)
 await assert.rejects(management.managedProfile(NaN),e=>e.status===400)
 host='brk.io.vn';await assert.rejects(management.managedProfile(7),e=>e.status===403);host='giautoandien.io.vn'
 const api=load('app/api/websites/access/route.ts',mocks)
 actor={id:3,role:'STUDENT'};let r=await api.GET(request(7));assert.equal(r.status,200);let data=await r.json();assert.equal(data.admin,false);assert.equal(data.canManageMembers,false)
 actor={id:1,role:'TEACHER'};r=await api.GET(request(7));data=await r.json();assert.equal(data.admin,false);assert.equal(data.canManageMembers,true)
 actor={id:0,role:'ADMIN'};r=await api.GET(request(8));data=await r.json();assert.equal(data.admin,true)
 const list=load('app/api/websites/manageable/route.ts',mocks)
 actor={id:3,role:'STUDENT'};r=await list.GET(request(7));assert.equal(r.status,200);assert.equal(listing.where.OR[1].members.some.role,'WEBSITE_MANAGER');assert.equal(listing.select.user.select.name,true);assert.equal(listing.take,51)
 const actions=load('app/actions/site-profile-actions.ts',mocks)
 actor={id:3,role:'STUDENT'};let result=await actions.updateSiteProfile(7,{title:'Edited',userId:3,isDefault:true,isActive:false,siteConfig:{},members:{deleteMany:{}}});assert.equal(result.success,true);assert.equal(profiles[0].title,'Edited');assert.equal(profiles[0].userId,1);assert.equal(profiles[0].isActive,true);assert.ok(Array.isArray(profiles[0].members))
 let before=writes;assert.ok((await actions.addProfileMember(7,3,'WEBSITE_MANAGER')).error);assert.equal(writes,before)
 profiles[0].members[1].role='ASSOCIATE';assert.ok((await actions.updateSiteProfile(7,{title:'Denied'})).error);assert.equal(writes,before)
 actor={id:1,role:'TEACHER'};assert.equal((await actions.addProfileMember(7,2,'WEBSITE_MANAGER')).success,true);assert.equal(profiles[0].members.find(m=>m.userId===2).role,'WEBSITE_MANAGER');assert.ok((await actions.addProfileMember(7,2,'ADMIN')).error);assert.equal((await actions.addProfileMember(7,2)).success,true);assert.equal(profiles[0].members.find(m=>m.userId===2).role,'ASSOCIATE');assert.equal((await actions.removeProfileMember(7,2)).success,true)
 actor={id:0,role:'ADMIN'};assert.equal((await actions.updateSiteProfile(8,{title:'Admin edit'})).success,true)
 actor=null;await assert.rejects(management.managedProfile(7),e=>e.status===401)
 const scope=load('components/website/WebsiteScope.tsx',mocks);let href,fetchPath
 global.fetch=async path=>{fetchPath=path;return {ok:true}}
 function Probe(){const context=scope.useWebsiteScope();href=context.href;context.fetch('/api/websites/pages?slug=about');return React.createElement('a',{href:context.href('/tools/my-site/pages?slug=about#edit')},'Edit')}
 let html=renderToStaticMarkup(React.createElement(scope.WebsiteScopeProvider,null,React.createElement(Probe)));assert.ok(html.includes('profileId=7'));assert.equal(fetchPath,'/api/websites/pages?slug=about&profileId=7');const first=href
 selection='8';renderToStaticMarkup(React.createElement(scope.WebsiteScopeProvider,null,React.createElement(Probe)));assert.equal(href('/api/websites/pages'),'/api/websites/pages?profileId=8');assert.equal(first('/api/websites/pages'),'/api/websites/pages?profileId=7')
 // Exercise the rendered list and the actual collaborator permission checkbox.
 const {JSDOM}=require('jsdom'),dom=new JSDOM('<div id="root"></div>',{url:'https://giautoandien.io.vn/tools/pages'})
 global.window=dom.window;global.document=dom.window.document;global.IS_REACT_ACT_ENVIRONMENT=true
 const {createRoot}=require('react-dom/client'),ui=createRoot(document.getElementById('root'))
 global.fetch=async()=>({ok:true,json:async()=>({profiles:[{id:7,slug:'lucy',title:'Lucy',isActive:true,user:{name:'Lucy'},access:'collaborator'}],nextPage:null})})
 const List=load('components/website/WebsiteList.tsx',mocks).default
 await React.act(async()=>{ui.render(React.createElement(List));await new Promise(resolve=>setTimeout(resolve,0))})
 assert.ok(document.body.textContent.includes('Website tôi được cộng tác'));assert.ok(document.querySelector('a[href="/tools/my-site/manage?profileId=7"]'))
 let grant
 const Member=load('components/admin/ProfileMemberManager.tsx',{'@/app/actions/site-profile-actions':{addProfileMember:async(...args)=>{grant=args;return {success:true}},removeProfileMember:async()=>({success:true})}}).default
 const member={userId:2,role:'ASSOCIATE',user:{id:2,name:'Teacher',email:null,image:null}}
 await React.act(async()=>ui.render(React.createElement(Member,{profileId:7,initialMembers:[member]})))
 const toggle=[...document.querySelectorAll('label')].find(label=>label.textContent.trim()==='Cho phép quản trị website').querySelector('input')
 await React.act(async()=>toggle.click());assert.deepEqual(grant,[7,2,'WEBSITE_MANAGER'])
 await React.act(async()=>ui.render(React.createElement(Member,{profileId:7,initialMembers:[member],canManage:false})))
 assert.ok([...document.querySelectorAll('input[type="checkbox"]')].every(input=>input.disabled));assert.ok(!document.querySelector('button[title="Xóa cộng sự"]'))
 await React.act(async()=>ui.unmount());dom.window.close()
 console.log('PASS website management: owner/admin/delegate permissions, revocation, fresh roles, ID 0, host isolation, list projection, protected member grants, safe edits and independent tab scope.')
}
run().catch(e=>{console.error(e);process.exitCode=1})
