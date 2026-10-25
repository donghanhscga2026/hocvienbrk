// Kiểm chứng PR-2: nội dung email kích hoạt riêng theo khóa học (Course.noidung_email)
// phải tới được học viên qua sendActivationEmail, và thông báo đăng nhập phải kèm IP/thiết bị.
// Chạy hoàn toàn bằng stub: Brevo bị chặn ở lớp import, Telegram bị chặn ở fetch — không gửi thật.
const fs = require('node:fs'); const path = require('node:path'); const assert = require('node:assert/strict')
const repo = path.resolve(__dirname, '..')
const ts = require(repo + '/node_modules/typescript')
let checks = 0; const ok = (c, m) => { assert.ok(c, m); checks++ }

const sent = []
const fakeBrevo = { sendTransactionalEmail: async (payload) => { sent.push(payload); return { success: true, messageId: 'test-id' } } }
const fakeGoogle = { google: { auth: { OAuth2: class { setCredentials() {} } }, gmail: () => ({}) } }
const src = fs.readFileSync(repo + '/lib/notifications.ts', 'utf8')
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const m = { exports: {} }
new Function('require', 'exports', 'module', js)(name => {
  if (name === 'googleapis') return fakeGoogle
  if (name === '@/lib/brevo') return fakeBrevo
  throw new Error('unexpected require: ' + name)
}, m.exports, m)
const n = m.exports

const telegrams = []
global.fetch = async (url, opts) => { telegrams.push({ url: String(url), body: JSON.parse(opts.body) }); return { ok: true, text: async () => '' } }

async function run() {
  process.env.BREVO_API_KEY = 'test-key'
  delete process.env.RESEND_API_KEY; delete process.env.GMAIL_REFRESH_TOKEN
  process.env.TELEGRAM_BOT_TOKEN = 'test-token'; process.env.TELEGRAM_CHAT_ID = '123456'
  delete process.env.TELEGRAM_CHAT_ID_ACTIVATE; delete process.env.TELEGRAM_CHAT_ID_CHANGE; delete process.env.TELEGRAM_CHAT_ID_CRON

  const DEFAULT = 'Chào <b>An</b> (#7),<br><br>Khóa học <b>Khóa A</b> đã được kích hoạt.'

  await n.sendActivationEmail('a@test.invalid', 'An', 7, 'Khóa A', null)
  ok(sent.length === 1 && sent[0].htmlContent === DEFAULT, 'khong co noi dung rieng: giu nguyen mau mac dinh')

  await n.sendActivationEmail('a@test.invalid', 'An', 7, 'Khóa A', '   \n  ')
  ok(sent[1].htmlContent === DEFAULT, 'noi dung toan khoang trang: coi nhu khong co')

  await n.sendActivationEmail('a@test.invalid', 'An', 7, 'Khóa A', 'Học lúc 20h tối nay.\nNhớ mang vở.')
  ok(sent[2].htmlContent === DEFAULT + '<br><br>Học lúc 20h tối nay.<br>Nhớ mang vở.', 'noi dung rieng noi sau loi chao, giu xuong dong')

  await n.sendActivationEmail('a@test.invalid', 'An', 7, 'Khóa A', '<script>alert(1)</script> & "x"')
  ok(!sent[3].htmlContent.includes('<script>'), 'HTML tho khong bao gio vao email hoc vien')
  ok(sent[3].htmlContent.includes('&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;x&quot;'), 'noi dung giang vien duoc escape HTML')

  const before = telegrams.length
  await n.sendLoginNotification({ id: 9, name: 'Bình' }, '203.0.113.7', 'Mozilla <b>fake</b>')
  const loginMsgs = telegrams.slice(before).map(t => t.body.text).filter(t => t.includes('THÔNG BÁO ĐĂNG NHẬP'))
  ok(loginMsgs.length === 1, 'thong bao dang nhap gui dung 1 tin Telegram')
  ok(loginMsgs[0].includes('203.0.113.7'), 'thong bao dang nhap kem IP')
  ok(loginMsgs[0].includes('Mozilla &lt;b&gt;fake&lt;/b&gt;'), 'thong bao dang nhap kem thiet bi (da escape)')
  ok(!loginMsgs[0].includes('<b>fake</b>'), 'user-agent khong chen duoc HTML vao Telegram')

  console.log(`activation-email-content: ${checks} checks passed`)
}
run().catch(e => { console.error(e); process.exit(1) })
