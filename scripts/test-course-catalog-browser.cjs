const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const {spawn} = require('node:child_process')
const {chromium} = require('playwright')

// Kiểm tra UI thật với dữ liệu mẫu và Gallery thay thế; không gọi API đăng ký/thanh toán.
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
    write('tsconfig.json',JSON.stringify({compilerOptions:{target:'ES2017',jsx:'preserve',module:'esnext',moduleResolution:'bundler',esModuleInterop:true,baseUrl:'.',paths:{'@/*':['./*']}}}))
    copy('postcss.config.mjs')
    fs.mkdirSync(path.join(fixture,'public'),{recursive:true})
    fs.copyFileSync(path.join(repo,'public/og-image.png'),path.join(fixture,'public/og-image.png'))
    copy('components/home/CourseCatalog.tsx')
    copy('components/home/HomeOverview.tsx')
    copy('components/home/PersonalCourses.tsx')
    copy('lib/course-catalog.ts')
    copy('lib/image-validation.ts')
    write('components/course/CourseCard.tsx',`export default function Card({course}:{course:{name_lop:string}}) {return <article data-testid="gallery-card" className="rounded-2xl border p-5">{course.name_lop}</article>}`)
    write('app/globals.css',`@import "tailwindcss"; @theme {--color-brk-primary:#047857;--color-brk-accent:#10b981;--color-brk-on-primary:#ffffff;--color-brk-on-surface:#1f2937;--color-brk-surface:#ffffff;--color-brk-background:#f1f5f9;--color-brk-muted:#64748b;--color-brk-outline:#dbe2ea;} body {font-family:Arial,sans-serif;}`)
    write('app/layout.tsx',`import './globals.css';export default function Layout({children}:{children:React.ReactNode}){return <html><body>{children}</body></html>}`)
    const courses=Array.from({length:14},(_,index)=>({
      id:index+1,id_khoa:'KH'+(index+1),name_lop:index===0?'Thiết kế website':index===1?'Đào tạo AI':'Khóa học '+(index+1),
      phi_coc:index===0?0:index===1?500000:1000000+index,feeType:index===0?'MIEN_PHI':'PHI_CAM_KET',
      category:index<2?'Công nghệ':'Kinh doanh',teacher:{id:index===0?10:20,name:index===0?'Hương Lucy':'Thầy Cường'},activeStudentCount:7,_count:{lessons:12},updatedAt:'2026-10-01',
    }))
    const enrollments={1:{status:'ACTIVE',startedAt:null,completedCount:4,totalLessons:12},2:{status:'PENDING',startedAt:null,completedCount:0,totalLessons:12},3:{status:'COMPLETED',startedAt:null,completedCount:12,totalLessons:12},4:{status:'ACTIVE',hiddenFromGifts:true,startedAt:null,completedCount:1,totalLessons:12}}
    write('app/page.tsx',`'use client';import {useEffect,useState} from 'react';import {useSearchParams} from 'next/navigation';import Catalog from '@/components/home/CourseCatalog';import Overview from '@/components/home/HomeOverview';import Personal from '@/components/home/PersonalCourses';import {splitHomeCourses} from '@/lib/course-catalog';const courses=${JSON.stringify(courses)};const enrollments=${JSON.stringify(enrollments)};export default function Page(){const [ready,setReady]=useState(false);useEffect(()=>setReady(true),[]);const params=useSearchParams();const guest=params.get('guest')==='1';const personal=splitHomeCourses(courses,enrollments,guest?null:10,params.get('role')==='student'?'STUDENT':'TEACHER');return <div data-testid="fixture" data-ready={ready}><Overview title="Học tập và phát triển cùng nhau" courses={courses} activeCourses={[]} enrollments={enrollments} isLoggedIn={!guest} userName="Học viên" onOpenMembership={()=>{}} myCourses={guest?undefined:<Personal learning={personal.learning} teaching={personal.teaching} enrollments={enrollments} userPhone={null} userId={10}/>} roadmapTitle="Thiết kế lộ trình" roadmap={<p>Nội dung lộ trình</p>} community={<h2>Cộng đồng và chia sẻ</h2>} message={<p>Thông điệp của trang</p>} catalog={<Catalog title="Tất cả khóa học" courses={courses} discoveryCourses={guest?undefined:personal.discover} enrollmentsMap={guest?{}:enrollments} isLoggedIn={!guest} userPhone={null} userId={guest?null:10} featuredIds={[1]} latestIds={[2,3]}/>}/></div>}`)
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
    const catalog=page.locator('#catalog')
    await catalog.getByRole('button',{name:'Tất cả khóa học (14)',exact:true}).waitFor()
    await page.waitForFunction(()=>document.querySelectorAll('#catalog article').length===10);checks++
    await catalog.getByRole('button',{name:'Tất cả khóa học (14)',exact:true}).click()
    await page.waitForFunction(()=>document.querySelectorAll('#catalog article').length===12)
    await catalog.getByRole('button',{name:'Danh sách',exact:true}).waitFor()
    assert.equal(await catalog.getByRole('button',{name:'Danh sách',exact:true}).getAttribute('aria-pressed'),'true');checks++
    assert.equal(await page.locator('#catalog article').count(),12);checks++
    await page.getByRole('button',{name:'Xem thêm 2 khóa học'}).click()
    await page.waitForFunction(()=>document.querySelectorAll('#catalog article').length===14)
    assert.equal(await page.locator('#catalog article').count(),14);checks++
    const search=page.getByRole('searchbox',{name:'Tìm khóa học'})
    await page.getByRole('button',{name:'Nổi bật',exact:true}).click()
    await page.waitForFunction(()=>document.querySelectorAll('#catalog article').length===1);checks++
    await catalog.getByRole('button',{name:'Tất cả',exact:true}).click()
    await search.fill('huong')
    await page.waitForFunction(()=>document.querySelector('#catalog [role="status"]').textContent.startsWith('1 khóa'))
    assert.equal(await page.locator('#catalog article').count(),1);checks++
    await catalog.getByRole('button',{name:'Thẻ',exact:true}).click()
    await page.getByTestId('gallery-card').first().waitFor()
    assert.equal(await page.getByTestId('gallery-card').count(),1);checks++
    await page.reload()
    await page.waitForFunction(()=>document.querySelector('[data-testid="fixture"]')?.getAttribute('data-ready')==='true')
    await page.waitForFunction(()=>document.querySelector('#catalog button[aria-label="Thẻ"]').getAttribute('aria-pressed')==='true')
    checks++
    await catalog.getByRole('button',{name:'Danh sách',exact:true}).click()
    await catalog.getByRole('button',{name:'Tất cả khóa học (14)',exact:true}).click()
    await page.waitForFunction(()=>document.querySelectorAll('#catalog article').length===12)
    const sidebar=page.getByRole('region',{name:'Bộ lọc khóa học'})
    await sidebar.getByRole('combobox',{name:'Giáo viên',exact:true}).selectOption('10')
    await page.waitForFunction(()=>document.querySelector('#catalog [role="status"]').textContent.startsWith('1 khóa'))
    assert.equal(await page.locator('#catalog article').count(),1);checks++
    await page.getByRole('button',{name:'Bỏ lọc Giáo viên: Hương Lucy'}).click()
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
    assert.ok(await page.getByText('Nội dung lộ trình',{exact:true}).isVisible());checks++
    assert.ok(await page.evaluate(()=>document.querySelector('[aria-label="Thông điệp"]').compareDocumentPosition(document.querySelector('#learning-path')) & Node.DOCUMENT_POSITION_FOLLOWING));checks++
    assert.ok(await page.evaluate(()=>document.querySelector('#learning-path').compareDocumentPosition(document.querySelector('#ecosystem')) & Node.DOCUMENT_POSITION_FOLLOWING));checks++
    assert.ok(await page.evaluate(()=>document.querySelector('#ecosystem').compareDocumentPosition(document.querySelector('#catalog')) & Node.DOCUMENT_POSITION_FOLLOWING));checks++
    assert.ok(await page.evaluate(()=>document.querySelector('#my-courses').compareDocumentPosition(document.querySelector('#catalog')) & Node.DOCUMENT_POSITION_FOLLOWING));checks++
    const personal=page.locator('#my-courses')
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
    const shortcuts=page.getByRole('navigation',{name:'Lối tắt trang chủ'})
    await shortcuts.getByRole('link',{name:'Khám phá khóa học',exact:true}).click()
    await page.waitForFunction(()=>document.querySelector('nav[aria-label="Lối tắt trang chủ"] a[href="#catalog"]').getAttribute('aria-current')==='location');checks++
    await noOverflow(page)
    await page.goto(base+'?guest=1')
    await page.getByText('Thông điệp của trang',{exact:true}).waitFor()
    assert.equal(await page.locator('#my-courses').count(),0);checks++
    assert.ok(await page.getByRole('searchbox',{name:'Tìm khóa học'}).isVisible());checks++
    await noOverflow(page)
    assert.equal(await page.getByRole('navigation',{name:'Lối tắt trang chủ'}).getByRole('link',{name:'Không gian của tôi',exact:true}).count(),0);checks++
    await page.goto(base+'?role=student')
    await page.getByRole('tab',{name:'Tôi đang học (3)',exact:true}).waitFor()
    assert.equal(await page.getByRole('tab',{name:'Tôi giảng dạy (1)',exact:true}).count(),0);checks++
    await noOverflow(page)
    assert.deepEqual(errors,[]);checks++
    console.log(JSON.stringify({result:'passed',checks,scope:'real homepage overview + catalog UI + Tailwind + Next.js; teacher/student/guest; personal tabs + shortcuts + discovery; 1440/390/360px; secondary slots and gallery stubbed; fixtures only'}))
  }catch(error){console.error(logs.slice(-5000));if(page)console.error('UI state',await page.evaluate(()=>({ready:document.querySelector('[data-testid="fixture"]')?.getAttribute('data-ready'),count:document.querySelectorAll('#catalog article').length,status:document.querySelector('#catalog [role="status"]')?.textContent,scopes:[...document.querySelectorAll('[aria-label="Phạm vi khám phá"] button')].map(button=>[button.textContent,button.getAttribute('aria-pressed')])})));throw error}
  finally{
    if(browser)await browser.close()
    if(server&&server.exitCode===null){const stopped=new Promise(resolve=>server.once('exit',resolve));server.kill('SIGTERM');await stopped}
    fs.rmSync(fixture,{recursive:true,force:true})
  }
}
run().catch(error=>{console.error(error);process.exitCode=1})
