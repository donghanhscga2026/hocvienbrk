/* Kiểm chứng security.txt (GĐ1 bảo mật): đúng RFC 9116 tối thiểu —
   có Contact, Expires còn hạn (tương lai), Canonical trỏ đúng đường
   /.well-known/. (Dependabot tách sang PR riêng vì file dưới .github/
   khiến CI của PR chứa nó không khởi động.) */
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const root = path.resolve(__dirname, '..')
let checks = 0
const ok = (cond, label) => { assert.ok(cond, label); checks++ }

const sec = fs.readFileSync(path.join(root, 'public/.well-known/security.txt'), 'utf8')
ok(/^Contact:/m.test(sec), 'security.txt: có Contact')
const expires = sec.match(/^Expires:\s*(\S+)/m)?.[1]
ok(expires && new Date(expires).getTime() > Date.now(), 'security.txt: Expires còn hạn')
ok(sec.includes('Canonical: https://giautoandien.io.vn/.well-known/security.txt'), 'security.txt: Canonical đúng đường dẫn')

console.log(`test-security-basics: ${checks} kiểm chứng PASS`)

// (commit bổ sung để kích hoạt lại CI sau lần chạy đầu không khởi động)
