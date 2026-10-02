const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

// Chạy handler thật với WindowClient giả; không gửi Push hay gọi DB thật.
const source = fs.readFileSync(path.join(__dirname, '../public/sw.js'), 'utf8')
const origin = 'https://test.invalid'
const target = origin + '/courses/test/learn?lesson=lesson-a'
let checks = 0
async function scenario(options = {}) {
  const events = {}, actions = []
  const self = {
    location: { origin },
    addEventListener: (name, handler) => { events[name] = handler },
    clients: {
      matchAll: async () => {
        actions.push(['match'])
        if (options.matchError) throw new Error('Client enumeration failed')
        return options.clients ? options.clients(actions) : []
      },
      openWindow: async url => {
        actions.push(['open',url])
        if (options.openError) throw new Error('Opening refused')
        return options.openNull ? null : { focus: async () => {
          actions.push(['focus-new'])
          if (options.openFocusError) throw new Error('Already activated')
        } }
      },
    },
  }
  const context = vm.createContext({ self, URL })
  vm.runInContext(source, context)
  context.readPushState = async () => options.boundUser ?? '3'
  let task
  events.notificationclick({
    notification: { data: { url: options.url ?? target, userId: '3' }, close: () => actions.push(['close']) },
    waitUntil: value => { task = value },
  })
  await task
  return actions
}
function oldClient(actions, options = {}) {
  const client = {
    url: options.url ?? origin + '/',
    focused: false,
    visibilityState: 'hidden',
    focus: async () => {
      actions.push(['focus-old'])
      if (options.focusError) throw new Error('InvalidAccessError')
      return client
    },
    navigate: async url => {
      assert.ok(actions.some(a => a[0] === 'focus-old'), 'App must be focused before navigation')
      actions.push(['navigate',url])
      if (options.navigateError) throw new Error('Window no longer exists')
      return options.navigateNull ? null : client
    },
  }
  return client
}
async function check(message, options, expected) {
  assert.deepEqual(await scenario(options), [['close'], ...expected], message)
  checks++
}
async function run() {
  const opened = [['open',target],['focus-new']]
  const fallback = [['open',target],['match']]
  await check('Closed app requests installed-app routing', {}, opened)
  await check('Background window does not bypass installed-app routing',
    {clients: actions => [oldClient(actions)]}, opened)
  await check('Focused browser tab cannot absorb notification click',
    {clients: actions => [{...oldClient(actions),focused:true,visibilityState:'visible'}]}, opened)
  await check('Existing target URL still lets browser choose installed app',
    {clients: actions => [oldClient(actions,{url:target})]}, opened)
  await check('Null openWindow result does not create duplicate windows',
    {openNull:true,clients: actions => [oldClient(actions)]}, [['open',target]])
  await check('Second focus rejection does not open duplicate windows',
    {openFocusError:true}, opened)
  await check('Failed open falls back to focus BEFORE navigation',
    {openError:true,clients: actions => [oldClient(actions)]},
    [...fallback,['focus-old'],['navigate',target]])
  await check('Fallback at exact lesson only focuses',
    {openError:true,clients: actions => [oldClient(actions,{url:target})]},
    [...fallback,['focus-old']])
  await check('Rejected fallback focus tries next window',
    {openError:true,clients: actions => [oldClient(actions,{focusError:true}),oldClient(actions)]},
    [...fallback,['focus-old'],['focus-old'],['navigate',target]])
  await check('Rejected fallback navigation tries next window',
    {openError:true,clients: actions => [oldClient(actions,{navigateError:true}),oldClient(actions)]},
    [...fallback,['focus-old'],['navigate',target],['focus-old'],['navigate',target]])
  await check('Null fallback navigation tries next window',
    {openError:true,clients: actions => [oldClient(actions,{navigateNull:true}),oldClient(actions)]},
    [...fallback,['focus-old'],['navigate',target],['focus-old'],['navigate',target]])
  await check('Fallback excludes foreign and malformed client URLs',
    {openError:true,clients: actions => [
      oldClient(actions,{url:'https://other.invalid/'}),
      oldClient(actions,{url:'not a URL'}),oldClient(actions)]},
    [...fallback,['focus-old'],['navigate',target]])
  await assert.rejects(scenario({openError:true,matchError:true}), /Opening refused/)
  checks++
  await assert.rejects(scenario({openError:true}), /Opening refused/)
  checks++
  await check('Old account notification cannot open', {boundUser:'4'}, [])
  await check('Logout notification cannot open', {boundUser:''}, [])
  await check('Cross-origin notification cannot open',
    {url:'https://evil.invalid/courses/test/learn?lesson=lesson-a'}, [])
  await check('Non-lesson destination cannot open', {url:origin+'/tools/crm'}, [])
  console.log(JSON.stringify({result:'passed',assertions:checks,scope:'notification click; no network or database'}))
}
run().catch(error => { console.error(error); process.exitCode = 1 })
