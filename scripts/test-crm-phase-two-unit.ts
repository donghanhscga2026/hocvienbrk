import assert from 'node:assert/strict'
import { parseCrmCsv } from '../lib/crm/csv'
import { identityConflict, issuePreview, verifyPreview, phaseTwoCommand } from '../lib/crm/phase-two'
import { intakeInput } from '../lib/crm/intake'
import { crmBody } from '../lib/crm/http'

async function main() {
  process.env.AUTH_SECRET = 'unit-test-only-placeholder'
  const quoted = parseCrmCsv('\uFEFFname,email,needs\r\n"Lan, thử",lan@example.com,"Dòng 1\nDòng ""2"""\r\n')
  assert.equal(quoted[0].name, 'Lan, thử'); assert.equal(quoted[0].needs, 'Dòng 1\nDòng "2"')
  assert.equal(parseCrmCsv('name;phone\nLan;0901234567')[0].phone, '0901234567')
  for (const csv of ['name,email\nLan', 'name,email\n"Lan,a@example.com', 'name,name,email\nA,A,a@example.com', 'name,email,unknown\nA,a@example.com,b', 'name,email\n"A"x,a@example.com', 'name,email\n' + Array.from({ length: 101 }, (_, i) => `A,a${i}@example.com`).join('\n')]) assert.throws(() => parseCrmCsv(csv))
  assert.equal(identityConflict({ email: ' A@EXAMPLE.COM ', phone: '0901234567' }, { email: 'a@example.com', phone: '+84901234567' }), false)
  assert.equal(identityConflict({ email: 'a@example.com', phone: null }, { email: 'b@example.com', phone: null }), true)
  const token = issuePreview(0, { count: 1 }, 100)
  assert.throws(() => verifyPreview(token.split(':').slice(0, 3).join(':') + ':' + 'é'.repeat(64), 0, { count: 1 }, 200))
  verifyPreview(token, 0, { count: 1 }, 200)
  for (const [t, actor, value, now] of [[token, 1, { count: 1 }, 200], [token, 0, { count: 2 }, 200], [token, 0, { count: 1 }, 999999], [token + 'x', 0, { count: 1 }, 200]] as const) assert.throws(() => verifyPreview(t, actor, value, now))
  assert.equal(phaseTwoCommand.safeParse({ action: 'import.execute', csv: 'x', ownerId: 0 }).success, false)
  assert.equal(intakeInput.safeParse({ slug: 'gift', name: 'A', email: 'a@example.com', phone: '', consent: false }).success, false)
  assert.equal(intakeInput.safeParse({ slug: 'gift', name: 'A', email: 'a@example.com', phone: '', consent: true, ownerId: 123 }).success, false)
  const request = (body: string, origin = 'https://test.invalid') => new Request('https://test.invalid/api/crm/capture', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body })
  assert.deepEqual(await crmBody(request('{"ok":true}'), 100), { ok: true })
  const proxied = (origin: string) => new Request('http://localhost:3100/api/crm/capture', { method: 'POST', headers: { Host: '127.0.0.1:3100', Origin: origin, 'Content-Type': 'application/json' }, body: '{}' })
  assert.deepEqual(await crmBody(proxied('http://127.0.0.1:3100'), 100), {})
  await assert.rejects(() => crmBody(proxied('http://localhost:3100'), 100))
  await assert.rejects(() => crmBody(request('{}', 'https://evil.invalid'), 100))
  await assert.rejects(() => crmBody(request('x'.repeat(100)), 20))
  console.log('PASS: CSV boundaries, identity normalization, signed preview expiry/actor/staleness/tampering, intake validation, request origin and streamed size limits.')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
