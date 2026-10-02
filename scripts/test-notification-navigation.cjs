const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawn } = require('node:child_process')
const { chromium } = require('playwright')

// Kiểm tra component thật trên Next.js thật với trang mẫu; không dùng DB hay gửi Push.
async function run() {
  const repo = path.resolve(__dirname, '..')
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'notification-navigation-'))
  const base = 'http://127.0.0.1:3107'
  let server, browser, logs = ''
  const write = (file, content) => {
    const target = path.join(fixture, file)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, content, 'utf8')
  }
  try {
    fs.symlinkSync(path.join(repo, 'node_modules'), path.join(fixture, 'node_modules'), 'dir')
    write('package.json', '{"name":"notification-navigation-fixture","private":true}')
    write('app/layout.tsx', 'export default function Layout({children}: {children: React.ReactNode}) { return <html><body>{children}</body></html> }')
    write('app/NotificationLessonEntry.tsx', fs.readFileSync(path.join(repo, 'components/course/NotificationLessonEntry.tsx'), 'utf8'))
    write('app/khoa-hoc/[id]/page.tsx', `
      import Entry from '../../NotificationLessonEntry'
      export default async function Course({params,searchParams}: {params:Promise<{id:string}>,searchParams:Promise<{notificationLesson?:string}>}) {
        const {id}=await params
        const {notificationLesson}=await searchParams
        return <main><h1>Course {id}</h1>{notificationLesson && <Entry courseSlug={id} lessonId={notificationLesson}/>}</main>
      }
    `)
    write('app/courses/[id]/learn/page.tsx', `
      import Link from 'next/link'
      export default async function Lesson({params}: {params:Promise<{id:string}>}) {
        const {id}=await params
        return <main><h1>Lesson {id}</h1><Link href={'/khoa-hoc/'+encodeURIComponent(id)} replace>Course</Link></main>
      }
    `)
    server = spawn(process.execPath, [path.join(repo, 'node_modules/next/dist/bin/next'), 'dev', '--webpack', '-H', '127.0.0.1', '-p', '3107'], {
      cwd: fixture, env: { ...process.env, NODE_ENV: 'development', NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
    })
    server.stdout.on('data', chunk => { logs += chunk })
    server.stderr.on('data', chunk => { logs += chunk })
    let ready = false
    for (let i = 0; i < 100; i++) {
      if (server.exitCode !== null) throw new Error('Fixture server stopped: ' + logs)
      try { if ((await fetch(base+'/khoa-hoc/warmup')).ok) { ready = true; break } } catch {}
      await new Promise(resolve => setTimeout(resolve, 300))
    }
    assert.ok(ready, 'Fixture server must start')
    browser = await chromium.launch({headless:true,args:['--no-sandbox']})
    const context = await browser.newContext({viewport:{width:390,height:844},isMobile:true})
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(base+'/khoa-hoc/test?notificationLesson=lesson-a')
    await page.waitForURL(base+'/courses/test/learn?lesson=lesson-a')
    await page.getByRole('heading',{name:'Lesson test'}).waitFor()
    await page.goBack()
    await page.getByRole('heading',{name:'Course test'}).waitFor()
    assert.equal(page.url(),base+'/khoa-hoc/test')
    await page.waitForTimeout(700)
    assert.equal(page.url(),base+'/khoa-hoc/test','Back must not reopen lesson')
    await page.goForward()
    await page.getByRole('heading',{name:'Lesson test'}).waitFor()
    assert.equal(page.url(),base+'/courses/test/learn?lesson=lesson-a')
    await page.reload()
    await page.goBack()
    await page.getByRole('heading',{name:'Course test'}).waitFor()
    assert.equal(page.url(),base+'/khoa-hoc/test','Reload must preserve return route')
    await page.goto(base+'/khoa-hoc/normal')
    await page.getByRole('heading',{name:'Course normal'}).waitFor()
    await page.waitForTimeout(500)
    assert.equal(page.url(),base+'/khoa-hoc/normal')
    const direct = await context.newPage()
    await direct.goto(base+'/courses/direct/learn?lesson=lesson-a')
    await direct.getByRole('link',{name:'Course',exact:true}).click()
    await direct.getByRole('heading',{name:'Course direct'}).waitFor()
    assert.equal(direct.url(),base+'/khoa-hoc/direct')
    assert.deepEqual(errors,[])
    console.log(JSON.stringify({result:'passed',checks:7,scope:'Chromium mobile viewport; real Next.js and NotificationLessonEntry; fixture pages; no database or outgoing push'}))
  } catch (error) {
    console.error(logs.slice(-5000))
    throw error
  } finally {
    if (browser) await browser.close()
    if (server && server.exitCode === null) {
      const stopped = new Promise(resolve => server.once('exit', resolve))
      server.kill('SIGTERM')
      await stopped
    }
    fs.rmSync(fixture, { recursive: true, force: true })
  }
}
run().catch(error => { console.error(error); process.exitCode = 1 })
