const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict'), { spawn } = require('node:child_process')
const { chromium } = require('playwright')
async function run() {
  const repo = path.resolve(__dirname, '..'), fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'notification-popover-'))
  const write = (file, text) => { const target = path.join(fixture, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, text, 'utf8') }
  let server, browser, logs = ''
  try {
    fs.symlinkSync(path.join(repo, 'node_modules'), path.join(fixture, 'node_modules'), 'dir')
    write('package.json', '{"name":"notification-popover-fixture","private":true}')
    const css = await require('postcss')([require('@tailwindcss/postcss')({ base: repo })]).process(fs.readFileSync(path.join(repo, 'app/globals.css'), 'utf8'), { from: path.join(repo, 'app/globals.css') })
    write('app/globals.css', css.css)
    write('app/layout.tsx', 'import "./globals.css"; export default function Layout({children}: {children: React.ReactNode}) {return <html><body>{children}</body></html>}')
    // Copy the real component, replacing only session, router and device dependencies.
    let source = fs.readFileSync(path.join(repo, 'components/notifications/NotificationBell.tsx'), 'utf8')
    source = source.replace("import PushDeviceSettings from './PushDeviceSettings'", "const PushDeviceSettings = () => <p>Device settings fixture</p>")
      .replace("from '@/lib/notification-pagination'", "from './pagination'")
      .replace("import { useSession } from 'next-auth/react'", "const useSession = () => ({data:{user:{id:'0'}}})")
      .replace("import { useRouter } from 'next/navigation'", "const useRouter = () => ({push:(href:string) => { window.history.pushState({}, '', href) }})")
      .replace("import { formatCrmDate } from '@/lib/crm/shared'", "const formatCrmDate = (date:string) => date")
      .replace("import { useDomainBrand } from '@/components/website/DomainShell'", 'const useDomainBrand = () => null')
    write('app/Bell.tsx', source)
    write('app/pagination.ts', fs.readFileSync(path.join(repo, 'lib/notification-pagination.ts'), 'utf8'))
    write('app/page.tsx', `import Bell from './Bell'; export default function Page(){return <><header style={{display:'flex',justifyContent:'flex-end',padding:12,position:'sticky',top:0}}><Bell/></header><main style={{height:1800}}><button id="outside">Outside</button></main></>}`)
    write('app/api/notifications/route.ts', `let read=false; export async function GET(){return Response.json({notifications:[{id:'one',title:'Có yêu cầu hỗ trợ mới',kind:'REQUEST_INCOMING',createdAt:'2026-10-11T06:00:00Z',readAt:read?'now':null,href:'/tools/crm?view=requests&request=one'}],total:1,unread:read?0:1})}; export async function PATCH(){read=true;return Response.json({updated:true})}`)
    server = spawn(process.execPath, [path.join(repo, 'node_modules/next/dist/bin/next'), 'dev', '--webpack', '-H', '127.0.0.1', '-p', '3108'], { cwd: fixture, env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'] })
    server.stdout.on('data', chunk => { logs += chunk }); server.stderr.on('data', chunk => { logs += chunk })
    const base = 'http://127.0.0.1:3108'
    let ready = false
    for (let i = 0; i < 100; i++) { if (server.exitCode != null) throw new Error(logs); try { if ((await fetch(base)).ok) { ready = true; break } } catch {} await new Promise(resolve => setTimeout(resolve, 300)) }
    assert.ok(ready)
    browser = await chromium.launch({ headless: true, ...(process.env.QA_CHROMIUM ? { executablePath: process.env.QA_CHROMIUM } : {}), args: ['--no-sandbox'] })
    const page = await browser.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message))
    for (const width of [320, 375, 768, 1440]) {
      await page.setViewportSize({ width, height: 850 }); await page.goto(base)
      const bell = page.locator('button[aria-controls="platform-notification-feed"]'), panel = page.getByRole('dialog', { name: 'Thông báo của bạn' })
      await bell.click(); await panel.waitFor({ state: 'visible' }); await page.waitForTimeout(100)
      const bounds = await panel.boundingBox(), trigger = await bell.boundingBox()
      if (process.env.CRM_UI_SNAPSHOT_DIR) { fs.mkdirSync(process.env.CRM_UI_SNAPSHOT_DIR, { recursive: true }); await page.screenshot({ path: path.join(process.env.CRM_UI_SNAPSHOT_DIR, `notifications-${width}.png`) }) }
      assert.ok(bounds.x >= 7 && bounds.x + bounds.width <= width - 7); assert.ok(bounds.y >= trigger.y + trigger.height); assert.ok(bounds.y + bounds.height <= 850)
      assert.equal(await page.locator('details').getAttribute('open'), null)
      await page.keyboard.press('Escape'); await panel.waitFor({ state: 'hidden' }); await page.locator('button[aria-controls="platform-notification-feed"][aria-expanded="false"]').waitFor()
      await bell.click(); await panel.waitFor({ state: 'visible' }); await page.mouse.click(4, 840); await panel.waitFor({ state: 'hidden' })
      await bell.click(); await panel.waitFor({ state: 'visible' }); await page.getByRole('button', { name: 'Có yêu cầu hỗ trợ mới' }).click(); await panel.waitFor({ state: 'hidden' }); assert.ok(page.url().includes('view=requests&request=one'))
    }
    assert.deepEqual(errors, [])
    console.log('Notification popover passed: real browser, 4 widths, anchor/viewport bounds, native Escape/outside close, collapsed settings and preserved navigation; no database or outgoing notifications.')
  } catch (e) { console.error(logs.slice(-3000)); throw e }
  finally { if (browser) await browser.close(); if (server && server.exitCode == null) { const done = new Promise(resolve => server.once('exit', resolve)); server.kill('SIGTERM'); await done } fs.rmSync(fixture, { recursive: true, force: true }) }
}
run().catch(e => { console.error(e); process.exitCode = 1 })
