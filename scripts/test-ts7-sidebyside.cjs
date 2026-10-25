/* Kiểm chứng cấu hình TypeScript song song (giải pháp tăng tốc CI):
   - package.json: "typescript" là alias trỏ gói tương thích
     @typescript/typescript6 (giữ JavaScript API cũ cho các script
     test, ts-node và typescript-eslint), "@typescript/native" là
     alias trỏ typescript bản 7 (bản native chạy lệnh tsc).
   - Khi chạy sau npm ci: require('typescript') phải cho API có
     transpileModule (bản 6), còn node_modules/.bin/tsc phải là bản 7.
   Hai bất biến này mà vỡ thì CI đỏ ngay ở bước test đầu tiên hoặc
   mất lợi ích tốc độ — test này chặn từ sớm với thông báo rõ ràng. */
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const root = path.resolve(__dirname, '..')
let checks = 0
const ok = (cond, label) => { assert.ok(cond, label); checks++ }

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
ok(pkg.devDependencies?.typescript === 'npm:@typescript/typescript6@^6.0.2', 'package.json: typescript là alias @typescript/typescript6')
ok(pkg.devDependencies?.['@typescript/native'] === 'npm:typescript@^7.0.2', 'package.json: @typescript/native là alias typescript bản 7')

const ts = require('typescript')
ok(typeof ts.transpileModule === 'function', "require('typescript') còn JavaScript API (transpileModule) cho script test")
ok(/^6\./.test(ts.version), `API typescript là bản 6 (đang là ${ts.version})`)

const tscPkg = JSON.parse(fs.readFileSync(path.join(root, 'node_modules/@typescript/native/package.json'), 'utf8'))
ok(/^7\./.test(tscPkg.version), `bản native chạy lệnh tsc là bản 7 (đang là ${tscPkg.version})`)

console.log(`test-ts7-sidebyside: ${checks} kiểm chứng PASS`)
