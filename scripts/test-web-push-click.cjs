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
        if (options.matchError) throw new Error('Client enumeration failed')
        return options.clients ? options.clients(actions) : []
      },
      openWindow: async url => {
        actions.push(['open',url])
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
  await check('Closed app opens exact lesson', {}, [['open',target],['focus-new']])
  await check('Android background app focuses BEFORE navigation',
    {clients: actions => [oldClient(actions)]}, [['focus-old'],['navigate',target]])
  await check('Rejected focus falls back to opening app',
    {clients: actions => [oldClient(actions,{focusError:true})]}, [['focus-old'],['open',target],['focus-new']])
  await check('Rejected navigation opens fallback',
    {clients: actions => [oldClient(actions,{navigateError:true})]}, [['focus-old'],['navigate',target],['open',target],['focus-new']])
  await check('Null navigation opens fallback',
    {clients: actions => [oldClient(actions,{navigateNull:true})]}, [['focus-old'],['navigate',target],['open',target],['focus-new']])
  await check('Current lesson only focuses; no reload/duplicate app',
    {clients: actions => [oldClient(actions,{url:target})]}, [['focus-old']])
  await check('Enumeration error can still open app',
    {matchError:true}, [['open',target],['focus-new']])
  await check('No WindowClient returned by openWindow is valid',
    {openNull:true}, [['open',target]])
  await check('Second focus rejection does not discard opened app',
    {openFocusError:true}, [['open',target],['focus-new']])
  await check('Other origins never reused',
    {clients: actions => [oldClient(actions,{url:'https://other.invalid/'})]}, [['open',target],['focus-new']])
  await check('Invalid client URL does not block opening app',
    {clients: actions => [oldClient(actions,{url:'not a URL'})]}, [['open',target],['focus-new']])
  await check('Old account notification cannot open',
    {boundUser:'4'}, [])
  await check('Logout notification cannot open',
    {boundUser:''}, [])
  await check('Cross-origin notification cannot open',
    {url:'https://evil.invalid/courses/test/learn?lesson=lesson-a'}, [])
  await check('Non-lesson destination cannot open',
    {url:origin+'/tools/crm'}, [])
  await check('Visible client preferred over stale hidden window',
    {clients: actions => [oldClient(actions,{focusError:true}), {...oldClient(actions),visibilityState:'visible'}]},
    [['focus-old'],['navigate',target]])
  console.log(JSON.stringify({result:'passed',assertions:checks,scope:'notification click; no network or database'}))
}
run().catch(error => { console.error(error); process.exitCode = 1 })
