/* Kiểm chứng nền bảo mật GĐ1 còn lại:
   1) Dependabot cấu hình hợp lệ: npm hằng tuần + github-actions hằng
      tháng, có giới hạn số PR mở đồng thời.
   2) security.txt đúng RFC 9116 tối thiểu: có Contact, Expires còn
      hạn (tương lai), Canonical trỏ đúng đường /.well-known/. */
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const root = path.resolve(__dirname, '..')
let checks = 0
const ok = (cond, label) => { assert.ok(cond, label); checks++ }

const dep = fs.readFileSync(path.join(root, '.github/dependabot.yml'), 'utf8')
ok(dep.includes('version: 2'), 'dependabot: version 2')
ok(dep.includes('package-ecosystem: "npm"') && dep.includes('interval: "weekly"'), 'dependabot: npm hằng tuần')
ok(dep.includes('package-ecosystem: "github-actions"'), 'dependabot: cả github-actions')
ok(dep.includes('open-pull-requests-limit'), 'dependabot: có giới hạn PR đồng thời')

const sec = fs.readFileSync(path.join(root, 'public/.well-known/security.txt'), 'utf8')
ok(/^Contact:/m.test(sec), 'security.txt: có Contact')
const expires = sec.match(/^Expires:\s*(\S+)/m)?.[1]
ok(expires && new Date(expires).getTime() > Date.now(), 'security.txt: Expires còn hạn')
ok(sec.includes('Canonical: https://giautoandien.io.vn/.well-known/security.txt'), 'security.txt: Canonical đúng đường dẫn')

console.log(`test-security-basics: ${checks} kiểm chứng PASS`)
