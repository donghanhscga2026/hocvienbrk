const assert = require('node:assert/strict')
const sharp = require('sharp')
const load = require('./helpers/load-ts.cjs')
const vars = ['R2_ACCOUNT_ID', 'R2_BUCKET', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_PUBLIC_BASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']
const before = Object.fromEntries(vars.map(key => [key, process.env[key]]))
let config, sent = [], fail = false, legacyWrites = 0, destroyed = 0
const aws = {
  S3Client: class { constructor(value) { config = value } async send(command) { sent.push(command.input); if (fail) throw Error('private provider diagnostic') } destroy() { destroyed++ } },
  PutObjectCommand: class { constructor(input) { this.input = input } },
}
const storageMocks = { 'server-only': {}, '@aws-sdk/client-s3': aws }
const supabase = { storage: { from: () => ({ upload: async () => { legacyWrites++; return { data: {}, error: null } }, getPublicUrl: () => ({ data: { publicUrl: 'https://old.supabase.co/payments/proof.png' } }) }) } }
const images = load('lib/image-utils.ts', { ...storageMocks, '@/lib/supabase': { supabase } })
const storage = load('lib/public-image-storage.ts', storageMocks)
async function run() {
  const input = await sharp({ create: { width: 2200, height: 1800, channels: 3, background: '#236c1e' } }).png().toBuffer()
  const dataUrl = 'data:image/png;base64,' + input.toString('base64')
  for (const key of vars) delete process.env[key]
  await assert.rejects(images.saveBase64Image(dataUrl), /R2 chưa được cấu hình/)
  assert.equal(sent.length, 0); assert.equal(legacyWrites, 0, 'No legacy fallback when R2 config is missing')
  assert.equal(await images.resolveImageUrl('https://i.postimg.cc/example.webp', 'courses'), 'https://i.postimg.cc/example.webp')
  await assert.rejects(images.resolveImageUrl('https://user:password@example.org/a.png', 'courses'), /HTTPS/)
  await assert.rejects(images.resolveImageUrl('https://127.0.0.1/a.png', 'courses'), /HTTPS/)
  Object.assign(process.env, { R2_ACCOUNT_ID: 'a'.repeat(32), R2_BUCKET: 'public-images', R2_ACCESS_KEY_ID: 'test-key', R2_SECRET_ACCESS_KEY: 'test-secret', R2_PUBLIC_BASE_URL: 'https://images.example.org/assets' })
  const url = await images.saveUploadedFile(input, '../../evil.html', 'courses', 'image/png')
  assert.match(url, /^https:\/\/images\.example\.org\/assets\/images\/courses\/[a-f0-9-]+\.webp$/)
  const uploaded = sent.at(-1), meta = await sharp(uploaded.Body).metadata()
  assert.equal(meta.format, 'webp'); assert.equal(meta.width, 1600); assert.ok(meta.height <= 1600)
  assert.equal(uploaded.ContentType, 'image/webp'); assert.equal(uploaded.CacheControl, 'public, max-age=31536000, immutable')
  assert.equal(config.region, 'auto'); assert.equal(config.endpoint, 'https://' + 'a'.repeat(32) + '.r2.cloudflarestorage.com')
  assert.equal(config.credentials.secretAccessKey, 'test-secret'); assert.equal(destroyed, 1)
  // Exercise the real AWS signer/serializer against an in-memory HTTP transport.
  const realAws = require('@aws-sdk/client-s3'); let wire
  const realStorage = load('lib/public-image-storage.ts', { 'server-only': {}, '@aws-sdk/client-s3': { ...realAws, S3Client: class extends realAws.S3Client {
    constructor(options) { super({ ...options, requestHandler: { handle: async request => { wire = request; return { response: { statusCode: 200, headers: { etag: 'fixture' } } } } } }) }
  } } })
  await realStorage.uploadPublicImage(input, 'courses')
  assert.match(wire.hostname, /\.r2\.cloudflarestorage\.com$/)
  assert.match(wire.headers.authorization, /^AWS4-HMAC-SHA256 /)
  assert.ok(!wire.headers['x-amz-trailer'], 'Use a normal signed upload rather than unsupported checksum trailers')
  assert.match(await images.saveBase64Image(dataUrl, 'avatars'), /images\/avatars\/.*\.webp$/)
  assert.equal(await images.resolveImageUrl('https://old.supabase.co/a.webp', 'courses'), 'https://old.supabase.co/a.webp', 'Old URLs are not rewritten')
  await assert.rejects(images.saveUploadedFile(Buffer.from('<svg/>'), 'fake.png', 'courses', 'image/png'), error => error.status === 400)
  await assert.rejects(storage.uploadPublicImage(input, '../payments'), error => error.status === 400)
  await assert.rejects(storage.uploadPublicImage(Buffer.alloc(8 * 1024 * 1024 + 1), 'courses'), error => error.status === 400)
  fail = true
  await assert.rejects(images.saveBase64Image(dataUrl), error => /Không thể lưu ảnh lên R2/.test(error.message) && !error.message.includes('private provider'))
  assert.equal(legacyWrites, 0, 'R2 failures do not fall through to Supabase or raw base64')
  fail = false
  Object.assign(process.env, { NEXT_PUBLIC_SUPABASE_URL: 'https://old.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fixture' })
  assert.equal(await images.saveUploadedFile(input, 'proof.png', 'payments', 'image/png'), 'https://old.supabase.co/payments/proof.png')
  assert.equal(legacyWrites, 1, 'Payment evidence stays on its existing storage path')
  process.env.R2_PUBLIC_BASE_URL = 'https://images.example.org?token=bad'
  assert.throws(() => storage.r2ImageConfig(), /không hợp lệ/)
  process.env.R2_PUBLIC_BASE_URL = 'https://images.example.org'
  const { NextRequest, NextResponse } = require('next/server')
  let deny = true
  const route = load('app/api/upload/course/route.ts', { ...storageMocks, '@/lib/api-auth': { requireAuth: async () => deny ? NextResponse.json({ error: 'login' }, { status: 401 }) : null } })
  const request = file => { const body = new FormData(); body.set('file', file); return new NextRequest('https://test.invalid/api/upload/course', { method: 'POST', body }) }
  assert.equal((await route.POST(request(new File([input], 'test.png', { type: 'image/png' })))).status, 401)
  deny = false
  let response = await route.POST(request(new File([input], 'test.png', { type: 'image/png' })))
  assert.equal(response.status, 200); assert.match((await response.json()).url, /images\.example\.org/)
  assert.equal((await route.POST(request(new File(['<html>'], 'fake.png', { type: 'image/png' })))).status, 400)
  fail = true; response = await route.POST(request(new File([input], 'test.png', { type: 'image/png' })))
  assert.equal(response.status, 503); assert.ok(!(await response.text()).includes('test-secret'))
  console.log('PASS R2 images: real compression, server-only upload, auth, forged bytes, path/size checks, preserved URLs, legacy evidence, config/provider failure and no Supabase fallback')
}
run().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => { for (const key of vars) { if (before[key] === undefined) delete process.env[key]; else process.env[key] = before[key] } })
