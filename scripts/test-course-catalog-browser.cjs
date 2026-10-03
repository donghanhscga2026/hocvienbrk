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
  let browser, server, logs='', checks=0
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
    copy('components/home/CourseCatalog.tsx')
    copy('lib/course-catalog.ts')
    copy('lib/image-validation.ts')
    write('components/course/CourseCard.tsx',`export default function Card({course}:{course:{name_lop:string}}) {return <article data-testid="gallery-card" className="rounded-2xl border p-5">{course.name_lop}</article>}`)
    write('app/globals.css',`@import "tailwindcss"; @theme {--color-brk-primary:#047857;--color-brk-accent:#10b981;--color-brk-on-primary:#ffffff;--color-brk-on-surface:#1f2937;--color-brk-surface:#ffffff;--color-brk-background:#f1f5f9;--color-brk-muted:#64748b;--color-brk-outline:#dbe2ea;} body {font-family:Arial,sans-serif;}`)
    write('app/layout.tsx',`import './globals.css';export default function Layout({children}:{children:React.ReactNode}){return <html><body>{children}</body></html>}`)
    const courses=Array.from({length:14},(_,index)=>({
      id:index+1,id_khoa:'KH'+(index+1),name_lop:index===0?'Thiết kế website':index===1?'Đào tạo AI':'Khóa học '+(index+1),
      phi_coc:index===0?0:index===1?500000:1000000+index,feeType:index===0?'MIEN_PHI':'PHI_CAM_KET',
      category:index<2?'Công nghệ':'Kinh doanh',teacher:{id:index===0?10:20,name:index===0?'Hương Lucy':'Thầy Cường'},_count:{lessons:12},updatedAt:'2026-10-01',
    }))
    const enrollments={1:{status:'ACTIVE',startedAt:null,completedCount:4,totalLessons:12},2:{status:'PENDING',startedAt:null,completedCount:0,totalLessons:12}}
    write('app/page.tsx',`import Catalog from '@/components/home/CourseCatalog';export default function Page(){return <main className="mx-auto max-w-7xl p-4"><Catalog title="Tất cả khóa học" courses={${JSON.stringify(courses)}} enrollmentsMap={${JSON.stringify(enrollments)}} isLoggedIn userPhone={null} userId={1}/></main>}`)
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
    const page=await context.newPage()
    const errors=[];page.on('pageerror',error=>errors.push(error.message))
    await page.goto(base)
    await page.getByRole('button',{name:'Danh sách',exact:true}).waitFor()
    assert.equal(await page.getByRole('button',{name:'Danh sách',exact:true}).getAttribute('aria-pressed'),'true');checks++
    assert.equal(await page.locator('article').count(),12);checks++
    await page.getByRole('button',{name:'Xem thêm 2 khóa học'}).click()
    assert.equal(await page.locator('article').count(),14);checks++
    const search=page.getByRole('searchbox',{name:'Tìm khóa học'})
    await search.fill('huong')
    await page.waitForFunction(()=>document.querySelector('#catalog [role="status"]').textContent.startsWith('1 khóa'))
    assert.equal(await page.locator('article').count(),1);checks++
    await page.getByRole('button',{name:'Thẻ',exact:true}).click()
    assert.equal(await page.getByTestId('gallery-card').count(),1);checks++
    await page.reload()
    await page.waitForFunction(()=>document.querySelector('button[aria-label="Thẻ"]').getAttribute('aria-pressed')==='true')
    checks++
    await page.getByRole('button',{name:'Danh sách',exact:true}).click()
    const sidebar=page.getByRole('complementary',{name:'Bộ lọc khóa học'})
    await sidebar.getByRole('combobox',{name:'Giáo viên',exact:true}).selectOption('10')
    await page.waitForFunction(()=>document.querySelector('#catalog [role="status"]').textContent.startsWith('1 khóa'))
    assert.equal(await page.locator('article').count(),1);checks++
    await page.getByRole('button',{name:'Bỏ lọc Giáo viên: Hương Lucy'}).click()
    await page.waitForFunction(()=>document.querySelector('#catalog [role="status"]').textContent==='14 khóa học');checks++
    await sidebar.getByRole('combobox',{name:'Khoảng phí niêm yết'}).selectOption('to1m')
    await page.waitForFunction(()=>document.querySelector('#catalog [role="status"]').textContent.startsWith('1 khóa'))
    assert.ok(await page.getByRole('heading',{name:'Đào tạo AI',exact:true}).isVisible());checks++
    await sidebar.getByRole('button',{name:'Xóa bộ lọc'}).click()
    await page.setViewportSize({width:390,height:844})
    assert.equal(await sidebar.isVisible(),false);checks++
    await noOverflow(page)
    await page.getByRole('button',{name:'Lọc',exact:true}).click()
    const dialog=page.getByRole('dialog',{name:'Lọc khóa học'})
    await dialog.getByRole('combobox',{name:'Trạng thái của tôi'}).selectOption('active')
    await dialog.getByRole('button',{name:'Xem 1 kết quả'}).click()
    assert.ok(await page.getByRole('link',{name:'Tiếp tục học'}).isVisible());checks++
    assert.equal(await page.getByRole('link',{name:'Tiếp tục học'}).getAttribute('href'),'/courses/KH1/learn');checks++
    await page.getByRole('button',{name:'Bỏ lọc Đang học'}).click()
    await search.fill('x'.repeat(250))
    await page.getByRole('heading',{name:'Không có khóa học phù hợp'}).waitFor()
    await noOverflow(page)
    await page.getByRole('button',{name:'Xem tất cả khóa học',exact:true}).click()
    await page.setViewportSize({width:360,height:780})
    await noOverflow(page)
    await page.getByRole('button',{name:'Lọc',exact:true}).click()
    await page.keyboard.press('Escape')
    assert.equal(await dialog.isVisible(),false);checks++
    assert.deepEqual(errors,[]);checks++
    console.log(JSON.stringify({result:'passed',checks,scope:'real catalog UI + Tailwind + Next.js; 1440/390/360px; gallery card stubbed; fixtures only'}))
  }catch(error){console.error(logs.slice(-5000));throw error}
  finally{
    if(browser)await browser.close()
    if(server&&server.exitCode===null){const stopped=new Promise(resolve=>server.once('exit',resolve));server.kill('SIGTERM');await stopped}
    fs.rmSync(fixture,{recursive:true,force:true})
  }
}
run().catch(error=>{console.error(error);process.exitCode=1})
