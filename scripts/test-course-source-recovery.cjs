// Kiểm tra nguồn cũ bị xóa với API thật, quyền/DB giả; không kết nối dữ liệu trực tuyến.
const assert = require('node:assert/strict')
const load = require('./helpers/load-ts.cjs')
class CrmError extends Error { constructor(message, status = 400) { super(message); this.status = status } }
let role = 'TEACHER', allowed = true
const revision = { id: 'page-1', updatedAt: '2026-10-17T00:00:00.000Z' }
const sourceUrl = 'https://storage.test.invalid/storage/v1/object/public/uploads/course-template-sources/old-page.html'
let content = { exactSource: { url: sourceUrl } }
const db = {
  user: { findUnique: async () => ({ role }) },
  coursePage: { findUnique: async () => ({ id: revision.id, name: 'Course', updatedAt: new Date(revision.updatedAt), sections: [{ variant: 'zip-source-v1', content }] }) },
}
const mocks = {
  '@/lib/prisma': { __esModule: true, default: db },
  '@/lib/crm/service': { CrmError },
  '@/lib/crm/http': { crmResponse: (body, status = 200) => Response.json(body, { status }) },
  '@/auth': { auth: async () => ({ user: { id: '1' } }) },
  '@/lib/website/domain-context': { domainContext: async () => null },
  '@/lib/course-page/permissions': {
    courseEditorActor: async () => ({ id: 1, role }),
    assertCourseEditor: async () => { if (!allowed) throw new CrmError('Denied', 403) },
  },
}
const api = load('app/api/course-templates/route.ts', mocks)
const legacy = load('app/api/admin/course-page-templates/workspace/route.ts', mocks)
const { isMissingTemplateSource } = load('lib/course-page/missing-template-source.ts')
const req = () => new Request('https://test.invalid/api/course-templates?page=page-1')
async function run() {
  const originalFetch = global.fetch, originalStorage = process.env.NEXT_PUBLIC_SUPABASE_URL
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://storage.test.invalid'
  let calls = 0
  try {
    for (const status of [401, 403, 429, 500, 502, 503]) {
      assert.equal(await isMissingTemplateSource(Response.json({ code: 'NoSuchKey' }, { status })), false)
    }
    for (const payload of [{ code: 'NoSuchKey' }, { statusCode: '404', error: 'Not Found', message: 'Object not found' }]) {
      const response = Response.json(payload, { status: 400 })
      assert.equal(await isMissingTemplateSource(response), true)
      assert.deepEqual(await response.json(), payload, 'Classification preserves the original response body')
    }
    assert.equal(await isMissingTemplateSource(Response.json({ code: 'InvalidRequest' }, { status: 400 })), false)
    assert.equal(await isMissingTemplateSource(new Response('not JSON', { status: 400 })), false)
    for (role of ['TEACHER', 'ADMIN']) {
      for (const [status, body] of [[404, { code: 'NoSuchKey' }], [410, {}], [400, { statusCode: '404', error: 'Not Found', message: 'Object not found' }]]) {
        global.fetch = async () => { calls++; return Response.json(body, { status }) }
        const response = await api.GET(req())
        assert.equal(response.status, 200)
        assert.deepEqual(await response.json(), { revision, sourceMissing: true }, role + ' can replace a missing source without losing the revision')
      }
      for (const status of [400, 401, 403, 429, 500, 502, 503]) {
        global.fetch = async () => Response.json({ code: 'InternalError' }, { status })
        assert.equal((await api.GET(req())).status, 502, role + ': transient/access failures stay retryable')
      }
      global.fetch = async () => { throw new Error('Network offline') }
      assert.notEqual((await api.GET(req())).status, 200, 'Network failure must not clear the editor')
      global.fetch = async () => new Response('<section><h1>Existing source</h1></section>')
      const current = await (await api.GET(req())).json()
      assert.deepEqual(current.revision, revision)
      assert.match(current.source.files[0].content, /Existing source/)
      assert.equal(current.sourceMissing, undefined)
    }
    role = 'ADMIN'; global.fetch = async () => new Response('', { status: 404 })
    assert.equal((await legacy.GET(req())).status, 410, 'Legacy endpoint distinguishes missing files from bad gateway')
    role = 'TEACHER'; allowed = false
    const before = calls
    assert.equal((await api.GET(req())).status, 403)
    assert.equal(calls, before, 'Unauthorized editors cannot read or recover sources')
    allowed = true; content = { exactSource: { html: '<section>Inline code</section>' } }
    global.fetch = async () => { throw Error('Inline HTML must not read Storage') }
    assert.match((await (await api.GET(req())).json()).source.files[0].content, /Inline code/)
    console.log('PASS source recovery: admin/teacher, HTTP 404/410 and legacy 400, revision preservation, transient/access failures, existing sources, inline HTML and permissions')
  } finally {
    global.fetch = originalFetch
    if (originalStorage === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalStorage
  }
}
run().catch(error => { console.error(error); process.exitCode = 1 })
