const fs = require('node:fs')
const ts = require('typescript')
const assert = require('node:assert/strict')
const { gzipSync, gunzipSync } = require('node:zlib')
const { NextRequest, NextResponse } = require('next/server')
function load(file, dependencies = {}) {
  const module = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  new Function('require', 'exports', 'module', code)(name => dependencies[name] || require(name), module.exports, module)
  return module.exports
}
async function run() {
  let denied = null
  let saved = null
  let saves = 0
  const { POST } = load('app/api/admin/course-page-templates/create/route.ts', {
    '@/lib/api-auth': { requireAdmin: async () => denied },
    '@/app/actions/course-page-template-actions': { createStoredCoursePageTemplate: async input => {
      saves++; saved = input
      return { success: true, template: { id: 'id', key: 'key', name: input.name } }
    } },
  })
  const payload = { name: 'Mẫu', analysis: { sections: [{ id: 'hero', fidelity: { html: 'x'.repeat(1100000) } }] }, selectedSectionIds: ['hero'] }
  const url = 'https://example.com/api/admin/course-page-templates/create'
  const req = (body, type = 'application/gzip') => new NextRequest(url, { method: 'POST', headers: { 'content-type': type }, body })
  let response = await POST(req(gzipSync(JSON.stringify(payload))))
  assert.equal(response.status, 200)
  assert.deepEqual(saved, payload, 'Payload above Server Action limit survives gzip transport')
  assert.equal((await POST(req(JSON.stringify(payload), 'application/json'))).status, 200)
  const before = saves
  assert.equal((await POST(req('invalid gzip'))).status, 400)
  assert.equal((await POST(req(gzipSync(JSON.stringify({ name: 'x' }))))).status, 400)
  assert.equal((await POST(req('text', 'text/plain'))).status, 415)
  assert.equal((await POST(req(Buffer.alloc(4 * 1024 * 1024 + 1)))).status, 413)
  assert.equal((await POST(req(gzipSync('x'.repeat(16 * 1024 * 1024 + 1))))).status, 400)
  denied = NextResponse.json({ error: 'Denied' }, { status: 403 })
  assert.equal((await POST(req(gzipSync(JSON.stringify(payload))))).status, 403)
  assert.equal(saves, before, 'Invalid or unauthorized requests must not write')

  const { compactExactAnalysis } = load('lib/course-page/importer/compact-analysis.ts')
  const { saveImportedTemplate } = load('lib/course-page/importer/save-template.ts', { './compact-analysis': { compactExactAnalysis } })
  const massive = { ...payload, analysis: { ...payload.analysis, sourceType: 'html', exactSource: { url: 'https://project.supabase.co/source.html' }, sections: [
    { id: 'hero', sectionType: 'hero', content: { image: 'data:image/png;base64,' + 'x'.repeat(1000000) }, fidelity: { html: 'x'.repeat(9000000), css: 'x'.repeat(9000000) }, images: [] },
    { id: 'form', sectionType: 'registration', sourceId: 'dang-ky', formFields: [{ name: 'email' }], images: [] },
  ] } }
  assert.ok(JSON.stringify(massive).length > 16 * 1024 * 1024)
  const compacted = compactExactAnalysis(massive.analysis)
  assert.ok(JSON.stringify(compacted).length < 2000)
  assert.equal(compacted.exactSource.url, massive.analysis.exactSource.url)
  assert.deepEqual(compacted.sections[1].formFields, massive.analysis.sections[1].formFields)
  assert.equal(compactExactAnalysis(payload.analysis), payload.analysis, 'Block imports retain original fidelity')
  assert.equal(compactExactAnalysis({ ...massive.analysis, sourceType: 'zip' }).sections[0].fidelity, undefined)

  const originalFetch = global.fetch
  const originalTimeout = global.setTimeout
  const originalClear = global.clearTimeout
  let cleared = 0
  global.clearTimeout = timer => { cleared++; originalClear(timer) }
  try {
    global.fetch = async (url, options) => {
      const bytes = Buffer.from(await options.body.arrayBuffer())
      const decoded = options.headers['Content-Type'] === 'application/gzip' ? gunzipSync(bytes) : bytes
      assert.deepEqual(JSON.parse(decoded), payload)
      return Response.json({ success: true, template: { id: 'id', key: 'key', name: 'Mẫu' } })
    }
    assert.equal((await saveImportedTemplate(payload)).template.id, 'id')
    global.fetch = async (url, options) => {
      const bytes = Buffer.from(await options.body.arrayBuffer())
      const decoded = options.headers['Content-Type'] === 'application/gzip' ? gunzipSync(bytes) : bytes
      const received = JSON.parse(decoded)
      assert.deepEqual(received.analysis, JSON.parse(JSON.stringify(compacted)))
      assert.deepEqual(received.selectedSectionIds, massive.selectedSectionIds)
      return Response.json({ success: true, template: { id: 'compact', key: 'key', name: 'Mẫu' } })
    }
    assert.equal((await saveImportedTemplate(massive)).template.id, 'compact')
    global.fetch = async () => Response.json({ success: false, error: 'Không thể lưu' }, { status: 500 })
    await assert.rejects(saveImportedTemplate(payload), /Không thể lưu/)
    global.fetch = async () => new Response('too large', { status: 413 })
    await assert.rejects(saveImportedTemplate(payload), /vượt giới hạn/)
    global.fetch = async () => { throw new TypeError('Failed to fetch') }
    await assert.rejects(saveImportedTemplate(payload), /Kết nối bị gián đoạn/)
    global.setTimeout = callback => originalTimeout(callback, 0)
    global.fetch = async (url, options) => new Promise((resolve, reject) => {
      const fail = () => reject(new Error('aborted'))
      if (options.signal.aborted) fail()
      else options.signal.addEventListener('abort', fail, { once: true })
    })
    await assert.rejects(saveImportedTemplate(payload), /90 giây/)
    assert.equal(cleared, 6, 'Every completed or failed save releases its timer')
  } finally {
    global.fetch = originalFetch
    global.setTimeout = originalTimeout
    global.clearTimeout = originalClear
  }
  console.log('Template save: large payload, gzip, authorization, size limits, server errors, network failure and timeout passed.')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
