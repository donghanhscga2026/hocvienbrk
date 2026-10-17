// Kho cũ chỉ trả thông báo ngừng sử dụng, không đọc body hoặc gọi bộ ghi.
const assert = require('node:assert/strict')
const load = require('./helpers/load-ts.cjs')
let denied = null, bodyReads = 0
const api = load('app/api/admin/course-page-templates/create/route.ts', {
  '@/lib/api-auth': { requireAdmin: async () => denied },
  '@/app/actions/course-page-template-actions': { createStoredCoursePageTemplate: async () => { throw Error('No writes allowed') } },
})
async function run() {
  const request = { arrayBuffer: async () => { bodyReads++; throw Error('No uploads allowed') } }
  assert.equal((await api.POST(request)).status, 410)
  assert.equal(bodyReads, 0)
  denied = Response.json({ error: 'Denied' }, { status: 403 })
  assert.equal((await api.POST(request)).status, 403)
  const { compactExactAnalysis } = load('lib/course-page/importer/compact-analysis.ts')
  const old = { sourceType: 'html', exactSource: { html: '<html>Source</html>' }, sections: [{ id: 'hero', sectionType: 'hero', fidelity: { html: 'x'.repeat(100000), css: 'y'.repeat(100000) }, images: [] }] }
  const compact = compactExactAnalysis(old)
  assert.equal(compact.exactSource.html, old.exactSource.html)
  assert.equal(compact.sections[0].fidelity, undefined)
  console.log('PASS retired template create: no body reads/writes, authorization retained, old metadata compaction preserved')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
