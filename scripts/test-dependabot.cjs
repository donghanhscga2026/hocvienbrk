/* Kiểm chứng cấu hình Dependabot: version 2, npm hằng tuần có gom
   minor/patch và giới hạn PR, github-actions hằng tháng. */
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const root = path.resolve(__dirname, '..')
let checks = 0
const ok = (cond, label) => { assert.ok(cond, label); checks++ }
const dep = fs.readFileSync(path.join(root, '.github/dependabot.yml'), 'utf8')
ok(dep.includes('version: 2'), 'dependabot: version 2')
ok(dep.includes('package-ecosystem: "npm"') && dep.includes('interval: "weekly"'), 'dependabot: npm hằng tuần')
ok(dep.includes('package-ecosystem: "github-actions"') && dep.includes('interval: "monthly"'), 'dependabot: github-actions hằng tháng')
ok(dep.includes('open-pull-requests-limit'), 'dependabot: có giới hạn PR đồng thời')
ok(dep.includes('minor') && dep.includes('patch'), 'dependabot: gom minor/patch')
console.log(`test-dependabot: ${checks} kiểm chứng PASS`)
