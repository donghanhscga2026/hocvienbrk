/* Kiểm chứng tương thích TypeScript 7: tsconfig KHÔNG được chứa
   baseUrl (TS7 đã gỡ bỏ tùy chọn này — lỗi TS5102 chặn toàn bộ CI
   của PR #229). paths không cần baseUrl từ TS 4.1: tự phân giải theo
   vị trí file tsconfig, nên gỡ bỏ an toàn cho cả TS 5.9 hiện tại. */
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const root = path.resolve(__dirname, '..')
let checks = 0
const ok = (cond, label) => { assert.ok(cond, label); checks++ }
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'tsconfig.json'), 'utf8'))
ok(!('baseUrl' in (cfg.compilerOptions ?? {})), 'tsconfig: không còn baseUrl (TS7 tương thích)')
ok(cfg.compilerOptions?.paths?.['@/*']?.includes('./*'), 'tsconfig: paths @/* giữ nguyên')
console.log(`test-ts7-compat: ${checks} kiểm chứng PASS`)
