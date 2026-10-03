const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const {spawn} = require('node:child_process')
const {chromium} = require('playwright')

// Kiểm tra giao diện thật với dữ liệu mẫu; thẻ thanh toán và nội dung phụ được thay thế.
async function run() {
  const repo = path.resolve(__dirname,'..')
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(),'course-catalog-ui-'))
  const base = 'http://127.0.0.1:3108'
  let browser, server, page, logs='', checks=0
  const write = (file,content) => {
    const target=path.join(fixture,file)
    fs.mkdirSync(path.dirname(target),{recursive:true})
    fs.writeFileSync(target,content,'utf8')
  }
  const copy = file => write(file,fs.readFileSync(path.join(repo,file),'utf8'))
  const noOverflow = async page => {
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth+1),'Mobile must not overflow horizontally')
    checks++
  }
  try {
    fs.symlinkSync(path.join(repo,'node_modules'),path.join(fixture,'node_modules'),'dir')
    write('package.json','{"name":"catalog-fixture","private":true}')
    // Nút debug Next.js che thanh menu dưới; chỉ tắt trong fixture kiểm thử.
    write('next.config.mjs','export default {devIndicators:false}')
    write('tsconfig.json',JSON.stringify({compilerOptions:{target:'ES2017',jsx:'preserve',module:'esnext',moduleResolution:'bundler',esModuleInterop:true,baseUrl:'.',paths:{'@/*':['./*']}}}))
    copy('postcss.config.mjs')
    fs.mkdirSync(path.join(fixture,'public'),{recursive:true})
    fs.copyFileSync(path.join(repo,'public/og-image.png'),path.join(fixture,'public/og-image.png'))
    copy('components/course/CourseInstructor.tsx')
    copy('components/course/CourseDiscoveryCard.tsx')
    copy('components/home/HomeAreaLink.tsx')
    copy('components/home/CourseDiscoveryPreview.tsx')
    copy('components/home/CourseCatalog.tsx')
    copy('components/home/HomeOverview.tsx')
    copy('components/home/PersonalCourses.tsx')
    copy('components/home/PersonalSpace.tsx')
    copy('components/crm/MyRequests.tsx')
    copy('lib/crm/shared.ts')
    write('components/mbw/MbwDashboardContext.tsx', `'use client';export function useMbwDashboard(){return {open:()=>{window.__walletOpened=true}}}`)
    copy('lib/course-catalog.ts')
    copy('lib/image-validation.ts')
    write('components/course/CourseCard.tsx',`import Instructor from './CourseInstructor';export default function Card({course}:{course:{name_lop:string;teacher?:{name:string}}}) {return <article data-testid="gallery-card" className="rounded-2xl border p-5"><h3>{course.name_lop}</h3><Instructor name={course.teacher?.name}/></article>}`)
    write('app/globals.css',`@import "tailwindcss"; @theme {--color-brk-primary:#047857;--color-brk-accent:#10b981;--color-brk-on-primary:#ffffff;--color-brk-on-surface:#1f2937;--color-brk-surface:#ffffff;--color-brk-background:#f1f5f9;--color-brk-muted:#64748b;--color-brk-outline:#dbe2ea;} body {font-family:Arial,sans-serif;}`)
    write('app/layout.tsx',`import './globals.css';export default function Layout({children}:{children:React.ReactNode}){return <html><body>{children}<footer><a href="/contact">Liên hệ</a></footer></body></html>}`)
    const courses=Array.from({length:14},(_,index)=>({
      id:index+1,id_khoa:'KH'+(index+1),name_lop:index===0?'Thiết kế website':index===1?'Đào tạo AI':'Khóa học '+(index+1),
      phi_coc:index===0?0:index===1?500000:1000000+index,feeType:index===0?'MIEN_PHI':'PHI_CAM_KET',
      category:index<2?'Công nghệ':'Kinh doanh',teacher:{id:index===0?10:20,name:index===0?'Hương Lucy':'Thầy Cường'},activeStudentCount:7,_count:{lessons:12},updatedAt:'2026-10-01',
    }))
    const enrollments={1:{status:'ACTIVE',startedAt:null,completedCount:4,totalLessons:12},2:{status:'PENDING',startedAt:null,completedCount:0,totalLessons:12},3:{status:'COMPLETED',startedAt:null,completedCount:12,totalLessons:12},4:{status:'ACTIVE',hiddenFromGifts:true,startedAt:null,completedCount:1,totalLessons:12}}
    write('app/page.tsx',`'use client';import {useEffect,useState} from 'react';import {useSearchParams,usePathname} from 'next/navigation';import Space from '@/components/home/PersonalSpace';import Catalog from '@/components/home/CourseCatalog';import Overview from '@/components/home/HomeOverview';import Preview from '@/components/home/CourseDiscoveryPreview';import Personal from '@/components/home/PersonalCourses';import {catalogCategory,splitHomeCourses} from '@/lib/course-catalog';const baseCourses=${JSON.stringify(courses)};const enrollments=${JSON.stringify(enrollments)};export default function Page(){const [ready,setReady]=useState(false);useEffect(()=>setReady(true),[]);const params=useSearchParams();const pathname=usePathname();const courses=params.get('many')==='1'?baseCourses.slice(0,12).map((course,index)=>({...course,category:["Khác","AI - Công nghệ","Nâng cao - Coaching","Ngoại Ngữ","Nền tảng - Cơ bản","Marketing & Sales","Huyền học - Tâm linh","Sức khỏe - Thể chất","Dành Cho Con Yêu","Video - Livestream","Nội tâm - triết lý nhân sinh","Tài chính - kinh doanh - đầu tư"][index]})):baseCourses;const guest=params.get('guest')==='1';const canDiscover=params.get('nocatalog')!=='1';const canCommunity=params.get('nocommunity')!=='1';const personal=splitHomeCourses(courses,enrollments,guest?null:10,params.get('role')==='student'?'STUDENT':'TEACHER');const category=params.get('category')||'';if(params.get('space')==='1'||pathname==='/my-space')return <Space user={{id:10,name:'Học viên',phone:null,role:params.get('role')==='student'?'STUDENT':'TEACHER'}} learning={personal.learning} teaching={personal.teaching} enrollments={enrollments} continueHref="/courses/KH1/learn?lesson=last-lesson"/>;return <div data-testid="fixture" data-ready={ready}><Overview title="Học tập và phát triển cùng nhau" courses={courses} activeCourses={personal.learning.filter(course=>enrollments[course.id].status==='ACTIVE')} enrollments={guest?{}:enrollments} isLoggedIn={!guest} userName="Học viên" myCourses={guest?undefined:<Personal learning={personal.learning} teaching={personal.teaching} enrollments={enrollments} userPhone={null} userId={10} canDiscover={canDiscover}/>} roadmapTitle="Thiết kế lộ trình" roadmap={<p>Nội dung lộ trình</p>} community={canCommunity?<h2>Cộng đồng và chia sẻ</h2>:undefined} communityPreview={canCommunity?<h2>Hoạt động cộng đồng gần đây</h2>:undefined} message={<p>Thông điệp của trang</p>} discoveryPreview={canDiscover?<Preview courses={guest?courses:personal.discover} enrollments={guest?{}:enrollments}/>:undefined} catalog={canDiscover?<Catalog key={category} initialExpanded={params.get('expanded')==='1'} initialCategory={courses.some(course=>catalogCategory(course)===category)?category:''} title="Tất cả khóa học" courses={courses} discoveryCourses={guest?undefined:personal.discover} enrollmentsMap={guest?{}:enrollments} isLoggedIn={!guest} userPhone={null} userId={guest?null:10} featuredIds={[1]} latestIds={[2,3]}/>:undefined}/></div>}`)
    write('app/my-space/page.tsx',`'use client';export {default} from '../page'`)
    write('app/page/[slug]/page.tsx',`'use client';export {default} from '../../page'`)
    server=spawn(process.execPath,[path.join(repo,'node_modules/next/dist/bin/next'),'dev','--webpack','-H','127.0.0.1','-p','3108'],{cwd:fixture,env:{...process.env,NODE_ENV:'development',NEXT_TELEMETRY_DISABLED:'1'},stdio:['ignore','pipe','pipe']})
    server.stdout.on('data',chunk=>{logs+=chunk});server.stderr.on('data',chunk=>{logs+=chunk})
    let ready=false
    for(let i=0;i<100;i++){
      if(server.exitCode!==null)throw new Error('Fixture stopped: '+logs)
      try{if((await fetch(base,{signal:AbortSignal.timeout(15000)})).ok){ready=true;break}}catch{}
      await new Promise(resolve=>setTimeout(resolve,300))
    }
    assert.ok(ready,'Fixture must start')
    browser=await chromium.launch({headless:true,args:['--no-sandbox']})
    const context=await browser.newContext({viewport:{width:1440,height:1000}})
    page=await context.newPage()
    const errors=[];page.on('pageerror',error=>errors.push(error.message))
    await page.goto(base)
    await page.waitForFunction(()=>document.querySelector('[data-testid="fixture"]')?.getAttribute('data-ready')==='true')
    const desktopMenu=page.getByRole('navigation',{name:'Điều hướng hệ sinh thái'})
    const mobileMenu=desktopMenu
    assert.equal(await desktopMenu.getByRole('link').count(),6);checks++
    assert.equal(await page.locator('#catalog').count(),0);checks++
    assert.equal(await page.locator('#my-courses').count(),0);checks++
    assert.equal(await page.locator('#continue-learning article').count(),1);checks++
    assert.equal(await page.locator('#course-preview').count(),0);checks++
    assert.equal(await page.locator('#learning-path').count(),0);checks++
    assert.equal(await page.locator('#ecosystem').count(),0);checks++
    assert.equal(await page.locator('#community-preview').count(),0);checks++
    assert.equal(await page.locator('#home-shortcuts a').count(),5);checks++
    assert.ok(await page.evaluate(()=>document.querySelector('[aria-label="Thông điệp"]').compareDocumentPosition(document.querySelector('#home-shortcuts')) & Node.DOCUMENT_POSITION_FOLLOWING));checks++
    await desktopMenu.getByRole('link',{name:'Lộ trình',exact:true}).click()
    await page.locator('#learning-path').waitFor();checks++
    assert.equal(await page.locator('#home-shortcuts').count(),0);checks++
    await page.reload()
    await page.locator('#learning-path').waitFor();checks++
    await page.waitForFunction(()=>document.querySelector('[data-testid="fixture"]')?.getAttribute('data-ready')==='true')
    await desktopMenu.getByRole('link',{name:'Tổng quan',exact:true}).click()
    await page.locator('[data-home-area="home"]').waitFor()
    let navigations=0
    page.on('request',request=>{if(request.resourceType()==='document'||request.url().includes('_rsc='))navigations++})
    await page.evaluate(()=>window.__homeTestMarker='same-document')
    await desktopMenu.getByRole('link',{name:'Học tập',exact:true}).click()
    await page.locator('[data-home-area="learning"]').waitFor()
    assert.equal(new URL(page.url()).searchParams.get('section'),'learning');checks++
    assert.equal(await page.evaluate(()=>window.__homeTestMarker),'same-document');checks++
    assert.equal(navigations,0);checks++
    assert.equal(await page.getByRole('region',{name:'Thông điệp'}).count(),0);checks++
    await page.goBack()
    await page.locator('[data-home-area="home"]').waitFor();checks++
    await page.setViewportSize({width:390,height:844})
    assert.ok(await mobileMenu.isVisible());checks++
    assert.ok(await desktopMenu.isVisible());checks++
    assert.ok(await desktopMenu.getByRole('link',{name:'Công cụ',exact:true}).evaluate(el=>el.getBoundingClientRect().top>el.parentElement.firstElementChild.getBoundingClientRect().top));checks++
    assert.equal(await page.locator('[data-home-mobile-navigation]').count(),0);checks++
    await noOverflow(page)
    await page.getByRole('link',{name:'Liên hệ',exact:true}).scrollIntoViewIfNeeded()
    assert.ok(await page.getByRole('link',{name:'Liên hệ',exact:true}).isVisible());checks++
    await mobileMenu.getByRole('link',{name:'Khám phá',exact:true}).click()
    await page.locator('[data-home-area="discover"]').waitFor();checks++
    const wrappedTabs=page.getByRole('tablist',{name:'Danh mục khóa học'})
    assert.ok(await wrappedTabs.evaluate(el=>el.scrollWidth<=el.clientWidth+1));checks++
    assert.ok(await wrappedTabs.getByRole('tab',{name:'Kinh doanh',exact:true}).evaluate(el=>el.getBoundingClientRect().top>el.parentElement.firstElementChild.getBoundingClientRect().top));checks++
    await wrappedTabs.getByRole('tab',{name:'Kinh doanh',exact:true}).click()
    assert.equal(await page.locator('#catalog article').count(),2);checks++
    await page.getByRole('button',{name:'Xem toàn bộ danh mục Kinh doanh',exact:true}).click()
    assert.equal(await page.locator('#catalog article').count(),10);checks++
    await page.goBack()
    await page.locator('[data-home-area="home"]').waitFor();checks++
    await mobileMenu.getByRole('link',{name:'Công cụ',exact:true}).click()
    await page.locator('[data-home-area="tools"]').waitFor()
    assert.equal(await page.locator('#course-preview').count(),0);checks++
    assert.equal(await page.locator('#ecosystem a[href="/tools"]').count(),1);checks++
    await mobileMenu.getByRole('link',{name:'Cộng đồng',exact:true}).click()
    await page.locator('#community').waitFor();checks++
    await page.setViewportSize({width:1440,height:1000})
    await page.goto(base+'?section=discover&expanded=1')
    await page.waitForFunction(()=>document.querySelector('[data-testid="fixture"]')?.getAttribute('data-ready')==='true')
    const catalog=page.locator('#catalog')
    await catalog.getByRole('button',{name:'← Quay lại các danh mục',exact:true}).click()
    await catalog.getByRole('combobox',{name:'Phạm vi khám phá'}).waitFor()
    await page.waitForFunction(()=>document.querySelectorAll('#catalog article').length===6);checks++
    assert.equal(await catalog.getByRole('region',{name:'Khóa học danh mục Kinh doanh'}).count(),1);checks++
    await page.setViewportSize({width:390,height:844})
    await page.waitForFunction(()=>document.querySelectorAll('#catalog article').length===2);checks++
    await noOverflow(page)
    await catalog.getByRole('button',{name:'Xem toàn bộ danh mục Kinh doanh',exact:true}).click()
    await page.waitForFunction(()=>document.querySelectorAll('#catalog article').length===10);checks++
    await catalog.getByRole('button',{name:'← Quay lại các danh mục',exact:true}).click()
    await page.waitForFunction(()=>document.querySelectorAll('#catalog article').length===2);checks++
    assert.equal(await catalog.getByRole('tab',{name:'Tất cả danh mục',exact:true}).getAttribute('aria-selected'),'true');checks++
    await page.setViewportSize({width:1440,height:1000})
    await catalog.getByRole('combobox',{name:'Phạm vi khám phá'}).selectOption('all')
    await page.waitForFunction(()=>document.querySelectorAll('#catalog article').length===8)
    assert.equal(await catalog.getByRole('region',{name:'Khóa học danh mục Công nghệ'}).count(),1);checks++
    const instructor=catalog.locator('article').getByText('Hương Lucy',{exact:true}).first()
    assert.equal(await instructor.evaluate(el=>getComputedStyle(el).fontSize),'16px');checks++
    assert.ok(await instructor.evaluate(el=>!!el.closest('article')));checks++
    await catalog.getByRole('button',{name:'Xem toàn bộ khóa học',exact:true}).click()
    await catalog.getByRole('button',{name:'Danh sách',exact:true}).click()
    await page.waitForFunction(()=>document.querySelectorAll('#catalog article').length===12)
    await catalog.getByRole('button',{name:'Danh sách',exact:true}).waitFor()
    assert.equal(await catalog.getByRole('button',{name:'Danh sách',exact:true}).getAttribute('aria-pressed'),'true');checks++
    assert.equal(await page.locator('#catalog article').count(),12);checks++
    await page.getByRole('button',{name:'Xem thêm 2 khóa học'}).click()
    await page.waitForFunction(()=>document.querySelectorAll('#catalog article').length===14)
    assert.equal(await page.locator('#catalog article').count(),14);checks++
    const categoryTabs=catalog.getByRole('tablist',{name:'Danh mục khóa học'})
    await categoryTabs.getByRole('tab',{name:'Công nghệ',exact:true}).click()
    await page.waitForFunction(()=>document.querySelectorAll('#catalog article').length===2);checks++
    await categoryTabs.getByRole('tab',{name:'Công nghệ',exact:true}).press('ArrowRight')
    await page.waitForFunction(()=>document.querySelectorAll('#catalog article').length===12);checks++
    await categoryTabs.getByRole('tab',{name:'Tất cả danh mục',exact:true}).click()
    assert.equal(await catalog.getByRole('combobox',{name:'Danh mục',exact:true}).count(),0);checks++
    assert.equal(await catalog.getByRole('region',{name:'Bộ lọc khóa học'}).count(),0);checks++
    await catalog.getByRole('button',{name:'Bộ lọc',exact:true}).click()
    await catalog.getByRole('combobox',{name:'Hiển thị khóa học'}).selectOption('free')
    await page.waitForFunction(()=>document.querySelectorAll('#catalog article').length===1);checks++
    await catalog.getByRole('combobox',{name:'Hiển thị khóa học'}).selectOption('all')
    const search=page.getByRole('searchbox',{name:'Tìm khóa học'})
    await catalog.getByRole('combobox',{name:'Hiển thị khóa học'}).selectOption('featured')
    await page.waitForFunction(()=>document.querySelectorAll('#catalog article').length===1);checks++
    await catalog.getByRole('combobox',{name:'Hiển thị khóa học'}).selectOption('all')
    await search.fill('huong')
    await page.waitForFunction(()=>document.querySelector('#catalog [role="status"]').textContent.startsWith('1 khóa'))
    assert.equal(await page.locator('#catalog article').count(),1);checks++
    await catalog.getByRole('button',{name:'Thẻ',exact:true}).click()
    await catalog.getByTestId('gallery-card').first().waitFor()
    assert.equal(await catalog.getByTestId('gallery-card').count(),1);checks++
    await page.reload()
    await page.waitForFunction(()=>document.querySelector('[data-testid="fixture"]')?.getAttribute('data-ready')==='true')
    await page.waitForFunction(()=>document.querySelector('#catalog button[aria-label="Thẻ"]').getAttribute('aria-pressed')==='true')
    checks++
    await catalog.getByRole('button',{name:'Danh sách',exact:true}).click()
    await catalog.getByRole('combobox',{name:'Phạm vi khám phá'}).selectOption('all')
    await page.waitForFunction(()=>document.querySelectorAll('#catalog article').length===12)
    await catalog.getByRole('button',{name:'Bộ lọc',exact:true}).click()
    const sidebar=page.getByRole('region',{name:'Bộ lọc khóa học'})
    await sidebar.getByRole('combobox',{name:'Giáo viên',exact:true}).selectOption('10')
    await page.waitForFunction(()=>document.querySelector('#catalog [role="status"]').textContent.startsWith('1 khóa'))
    assert.equal(await page.locator('#catalog article').count(),1);checks++
    await catalog.getByRole('button',{name:'Xong, xem khóa học'}).click()
    assert.equal(await sidebar.count(),0);checks++
    assert.ok(await page.getByRole('button',{name:'Bỏ lọc Giáo viên: Hương Lucy'}).isVisible());checks++
    await page.getByRole('button',{name:'Bỏ lọc Giáo viên: Hương Lucy'}).click()
    await catalog.getByRole('button',{name:'Bộ lọc',exact:true}).click()
    await page.waitForFunction(()=>document.querySelector('#catalog [role="status"]').textContent==='14 khóa học');checks++
    await sidebar.getByRole('combobox',{name:'Khoảng phí niêm yết'}).selectOption('to1m')
    await page.waitForFunction(()=>document.querySelector('#catalog [role="status"]').textContent.startsWith('1 khóa'))
    assert.ok(await page.getByRole('heading',{name:'Đào tạo AI',exact:true}).isVisible());checks++
    await sidebar.getByRole('button',{name:'Xóa bộ lọc'}).click()
    await page.setViewportSize({width:390,height:844})
    assert.equal(await sidebar.isVisible(),true);checks++
    await noOverflow(page)
    await sidebar.getByRole('combobox',{name:'Trạng thái của tôi'}).selectOption('active')
    await page.waitForFunction(()=>document.querySelector('#catalog [role="status"]').textContent.startsWith('2 khóa'))
    assert.equal(await catalog.getByRole('link',{name:'Tiếp tục học'}).count(),2);checks++
    assert.equal(await catalog.getByRole('link',{name:'Tiếp tục học'}).first().getAttribute('href'),'/courses/KH1/learn');checks++
    await page.getByRole('button',{name:'Bỏ lọc Đang học'}).click()
    await search.fill('x'.repeat(250))
    await page.getByRole('heading',{name:'Không có khóa học phù hợp'}).waitFor()
    await noOverflow(page)
    await page.getByRole('button',{name:'Xem tất cả khóa học',exact:true}).click()
    await page.setViewportSize({width:360,height:780})
    await noOverflow(page)
    await mobileMenu.getByRole('link',{name:'Tổng quan',exact:true}).click()
    await page.locator('[data-home-area="home"]').waitFor()
    assert.equal(await page.getByText('Nội dung lộ trình',{exact:true}).count(),0);checks++
    assert.equal(await page.locator('#catalog').count(),0);checks++
    await mobileMenu.getByRole('link',{name:'Học tập',exact:true}).click()
    await page.locator('[data-home-area="learning"]').waitFor()
    const personal=page.locator('#my-courses')
    assert.equal(await page.getByRole('heading',{name:'Không gian của tôi',exact:true}).count(),0);checks++
    assert.equal(await page.getByRole('heading',{name:'Học tập',exact:true}).evaluate(el=>getComputedStyle(el).fontWeight),'600');checks++
    assert.equal(await personal.locator('details').count(),0);checks++
    assert.ok(await personal.getByRole('link',{name:'Tiếp tục học',exact:true}).isVisible());checks++
    await personal.getByRole('button',{name:'Chờ kích hoạt (1)',exact:true}).click()
    await personal.getByRole('heading',{name:'Đào tạo AI',exact:true}).waitFor();checks++
    await personal.getByRole('button',{name:'Đã hoàn thành (1)',exact:true}).click()
    await personal.getByRole('heading',{name:'Khóa học 3',exact:true}).waitFor();checks++
    await personal.getByRole('tab',{name:'Tôi giảng dạy (1)',exact:true}).click()
    assert.equal(await personal.getByRole('link',{name:'Quản lý khóa học',exact:true}).getAttribute('href'),'/tools/courses/new?id=1');checks++
    assert.ok(await personal.getByText('7 học viên đang học',{exact:true}).isVisible());checks++
    await personal.getByRole('button',{name:'Thẻ',exact:true}).click()
    assert.ok(await personal.getByRole('link',{name:'Quản lý khóa học',exact:true}).isVisible());checks++
    await personal.getByRole('tab',{name:'Tôi giảng dạy (1)',exact:true}).press('ArrowLeft')
    await page.waitForFunction(()=>document.querySelector('#my-learning-tab').getAttribute('aria-selected')==='true')
    assert.equal(await personal.getByRole('tab',{name:'Tôi đang học (3)',exact:true}).getAttribute('aria-selected'),'true');checks++
    await personal.getByRole('button',{name:'Đang học (1)',exact:true}).click()
    await personal.getByRole('button',{name:'Danh sách',exact:true}).click()
    await personal.getByRole('link',{name:'Tiếp tục học',exact:true}).waitFor()
    await mobileMenu.getByRole('link',{name:'Khám phá',exact:true}).click()
    await page.locator('[data-home-area="discover"]').waitFor()
    assert.equal(await mobileMenu.getByRole('link',{name:'Khám phá',exact:true}).getAttribute('aria-current'),'page');checks++
    await noOverflow(page)
    await page.goto(base+'?guest=1')
    await page.getByText('Thông điệp của trang',{exact:true}).waitFor()
    assert.equal(await page.locator('#my-courses').count(),0);checks++
    assert.equal(await page.locator('#continue-learning').count(),0);checks++
    await page.waitForFunction(()=>document.querySelector('[data-testid="fixture"]')?.getAttribute('data-ready')==='true')
    assert.equal(await page.locator('#home-shortcuts a').count(),5);checks++
    await mobileMenu.getByRole('link',{name:'Khám phá',exact:true}).click()
    await page.locator('[data-home-area="discover"]').waitFor()
    await catalog.getByRole('tab',{name:'Công nghệ',exact:true}).click()
    await page.waitForFunction(()=>document.querySelectorAll('#catalog article').length===2);checks++
    assert.equal(new URL(page.url()).searchParams.get('guest'),'1');checks++
    await page.setViewportSize({width:360,height:780})
    await mobileMenu.getByRole('link',{name:'Học tập',exact:true}).click()
    await page.getByRole('heading',{name:'Đăng nhập để xem khóa học của bạn'}).waitFor();checks++
    assert.equal(new URL(page.url()).searchParams.get('guest'),'1');checks++
    await mobileMenu.getByRole('link',{name:'Khám phá',exact:true}).click()
    await page.getByRole('searchbox',{name:'Tìm khóa học'}).waitFor();checks++
    assert.equal(await catalog.getByRole('combobox',{name:'Trạng thái của tôi'}).count(),0);checks++
    await noOverflow(page)
    await page.goto(base+'?role=student&section=learning')
    await page.getByRole('tab',{name:'Tôi đang học (3)',exact:true}).waitFor()
    assert.equal(await page.getByRole('tab',{name:'Tôi giảng dạy (1)',exact:true}).count(),0);checks++
    await noOverflow(page)
    await page.goto(base+'/page/huong-lucy?ref=123')
    await page.waitForFunction(()=>document.querySelector('[data-testid="fixture"]')?.getAttribute('data-ready')==='true')
    await mobileMenu.getByRole('link',{name:'Khám phá',exact:true}).click()
    await page.locator('[data-home-area="discover"]').waitFor()
    assert.equal(new URL(page.url()).pathname,'/page/huong-lucy');checks++
    assert.equal(new URL(page.url()).searchParams.get('ref'),'123');checks++
    await page.reload()
    await page.locator('[data-home-area="discover"]').waitFor()
    assert.equal(new URL(page.url()).pathname,'/page/huong-lucy');checks++
    await page.goto(base+'?nocatalog=1&nocommunity=1&section=discover')
    await page.locator('[data-home-area="home"]').waitFor()
    assert.equal(await mobileMenu.getByRole('link').count(),4);checks++
    assert.equal(await page.locator('#course-preview').count(),0);checks++
    assert.equal(await mobileMenu.getByRole('link',{name:'Cộng đồng',exact:true}).count(),0);checks++
    await noOverflow(page)
    await page.goto(base+'?guest=1&many=1&section=discover')
    await page.waitForFunction(()=>document.querySelector('[data-testid="fixture"]')?.getAttribute('data-ready')==='true')
    await page.waitForFunction(()=>document.querySelectorAll('#catalog-category-list [role="tab"]:not(.hidden)').length===4)
    const manyTabs=catalog.getByRole('tablist',{name:'Danh mục khóa học'})
    assert.equal(await manyTabs.getByRole('tab').count(),4);checks++
    assert.deepEqual(await manyTabs.getByRole('tab').allTextContents(),['Tất cả danh mục','Nền tảng - Cơ bản','Nội tâm - triết lý nhân sinh','Sức khỏe - Thể chất']);checks++
    assert.ok(await catalog.locator('article').first().evaluate(el=>el.getBoundingClientRect().top<window.innerHeight));checks++
    assert.equal(await catalog.getByRole('region',{name:'Bộ lọc khóa học'}).count(),0);checks++
    await catalog.getByRole('button',{name:'Thêm danh mục →',exact:true}).click()
    assert.equal(await manyTabs.getByRole('tab').count(),13);checks++
    await manyTabs.getByRole('tab',{name:'Huyền học - Tâm linh',exact:true}).click()
    await catalog.getByRole('button',{name:'Thu gọn danh mục →',exact:true}).click()
    assert.equal(await manyTabs.getByRole('tab').count(),4);checks++
    assert.equal(await manyTabs.getByRole('tab',{name:'Huyền học - Tâm linh',exact:true}).getAttribute('aria-selected'),'true');checks++
    await manyTabs.getByRole('tab',{name:'Huyền học - Tâm linh',exact:true}).press('ArrowRight')
    assert.equal(await manyTabs.getByRole('tab',{name:'Tất cả danh mục',exact:true}).getAttribute('aria-selected'),'true');checks++
    await noOverflow(page)
    await page.setViewportSize({width:1440,height:1000})
    assert.equal(await manyTabs.getByRole('tab').count(),13);checks++
    assert.deepEqual(await manyTabs.getByRole('tab').allTextContents(),['Tất cả danh mục','Nền tảng - Cơ bản','Nội tâm - triết lý nhân sinh','Sức khỏe - Thể chất','Tài chính - kinh doanh - đầu tư','Marketing & Sales','AI - Công nghệ','Video - Livestream','Ngoại Ngữ','Dành Cho Con Yêu','Nâng cao - Coaching','Huyền học - Tâm linh','Khác']);checks++
    assert.ok(await manyTabs.evaluate(el=>el.scrollWidth<=el.clientWidth+1));checks++
    assert.equal(await catalog.getByRole('heading',{name:'Khám phá khóa học',exact:true}).count(),1);checks++
    await page.route('**/api/notifications?page=1',route=>route.fulfill({json:{notifications:[{id:'1',title:'Giáo viên đã trả lời yêu cầu của bạn',href:'/my-requests?request=1',readAt:null},{id:'2',title:'Khóa học đã kích hoạt',href:'/khoa-hoc/KH1',readAt:'2026-10-01'}],unread:1,total:2}}))
    await page.route('**/api/tools',route=>route.fulfill({json:{tools:[{id:1,name:'Công cụ công khai',url:'/tools/public',roles:[],isActive:true},{id:2,name:'CRM của tôi',url:'/tools/crm',roles:['TEACHER'],isActive:true},{id:3,name:'Quản trị hệ thống',url:'/tools/settings',roles:['ADMIN'],isActive:true},{id:4,name:'URL không an toàn',url:'javascript:alert(1)',roles:[],isActive:true}]}}))
    await page.route('**/api/my-requests?*',route=>route.fulfill({json:{requests:[{id:'r1',content:'Tôi cần hỗ trợ bài học',publicReply:'Giáo viên đã phản hồi',category:'LEARNING',status:'RESOLVED',version:1,createdAt:'2026-10-01',updatedAt:'2026-10-02',lessonId:null,course:{name_lop:'Thiết kế website',id_khoa:'KH1'}}],total:1}}))
    await page.goto(base+'/my-space')
    await page.getByRole('heading',{name:'Chào Học viên!',exact:true}).waitFor()
    await page.getByText('1 thông báo chưa đọc',{exact:true}).waitFor();checks++
    assert.equal(await page.getByRole('link',{name:'Tiếp tục bài học',exact:true}).getAttribute('href'),'/courses/KH1/learn?lesson=last-lesson');checks++
    assert.equal(await page.getByRole('link',{name:'CRM & chăm sóc',exact:true}).getAttribute('href'),'/tools/crm');checks++
    const spaceMenu=page.getByRole('navigation',{name:'Menu không gian cá nhân',exact:true})
    await spaceMenu.getByRole('link',{name:'Học tập',exact:true}).click()
    await page.locator('#my-courses').waitFor();checks++
    assert.equal(new URL(page.url()).searchParams.get('tab'),'learning');checks++
    await page.goBack()
    await page.getByRole('heading',{name:'Chào Học viên!',exact:true}).waitFor();checks++
    await spaceMenu.getByRole('link',{name:'Công cụ của tôi',exact:true}).click()
    await page.getByRole('link',{name:'Công cụ công khai →',exact:true}).waitFor()
    assert.equal(await page.getByRole('link',{name:'Quản trị hệ thống →',exact:true}).count(),0);checks++
    assert.equal(await page.getByRole('link',{name:'URL không an toàn →',exact:true}).count(),0);checks++
    await page.getByRole('button',{name:'Yêu thích Công cụ công khai',exact:true}).click()
    assert.equal(await page.getByRole('button',{name:'Yêu thích Công cụ công khai',exact:true}).getAttribute('aria-pressed'),'true');checks++
    await page.reload()
    await page.getByRole('button',{name:'Yêu thích Công cụ công khai',exact:true}).waitFor()
    assert.equal(await page.getByRole('button',{name:'Yêu thích Công cụ công khai',exact:true}).getAttribute('aria-pressed'),'true');checks++
    await spaceMenu.getByRole('link',{name:'Hỗ trợ của tôi',exact:true}).click()
    await page.getByText('Giáo viên đã phản hồi',{exact:true}).waitFor();checks++
    await spaceMenu.getByRole('link',{name:'Tài khoản',exact:true}).click()
    assert.equal(await page.getByRole('link',{name:'Quản lý tài khoản',exact:true}).getAttribute('href'),'/account-settings');checks++
    await page.setViewportSize({width:390,height:844})
    await noOverflow(page)
    assert.ok(!await spaceMenu.isVisible());checks++
    await page.locator('details summary').click()
    const spaceMobile=page.getByRole('navigation',{name:'Menu cá nhân trên điện thoại',exact:true})
    await spaceMobile.getByRole('link',{name:'Tổng quan',exact:true}).click()
    assert.equal(await page.locator('details').getAttribute('open'),null);checks++
    await page.getByRole('button',{name:'Ví & quyền lợi →',exact:true}).click()
    assert.equal(await page.evaluate(()=>window.__walletOpened),true);checks++
    await noOverflow(page)
    await page.goto(base+'/my-space?role=student')
    await page.getByRole('heading',{name:'Chào Học viên!',exact:true}).waitFor()
    assert.equal(await page.getByRole('region',{name:'Khu làm việc',exact:true}).count(),0);checks++
    await noOverflow(page)
    assert.deepEqual(errors,[]);checks++
    console.log(JSON.stringify({result:'passed',checks,scope:'real personal space + role menus + support + favorite tools + home areas + wrapped navigation/category tabs + catalog + Tailwind + Next.js; Back/reload/profile/ref preservation; teacher/student/guest/visibility; 1440/390/360px; payment cards and secondary slots stubbed; fixtures only'}))
  }catch(error){console.error(logs.slice(-5000));if(page)console.error('UI state',await page.evaluate(()=>({ready:document.querySelector('[data-testid="fixture"]')?.getAttribute('data-ready'),count:document.querySelectorAll('#catalog article').length,status:document.querySelector('#catalog [role="status"]')?.textContent,scopes:[...document.querySelectorAll('[aria-label="Phạm vi khám phá"] button')].map(button=>[button.textContent,button.getAttribute('aria-pressed')])})));throw error}
  finally{
    if(browser)await browser.close()
    if(server&&server.exitCode===null){const stopped=new Promise(resolve=>server.once('exit',resolve));server.kill('SIGTERM');await stopped}
    fs.rmSync(fixture,{recursive:true,force:true})
  }
}
run().catch(error=>{console.error(error);process.exitCode=1})
