// Kiểm thử luân chuyển khóa bảo vệ dữ liệu: bản ghi mã hóa bằng khóa cũ
// (AUTH_SECRET) vẫn đọc được sau khi cài WI300_APPEARANCE_SECRET, và lần ghi
// tiếp theo tự chuyển sang khóa mới. DB giả cách ly, không đụng dữ liệu thật.
const assert = require('node:assert/strict')
const { createCipheriv, createHash, randomBytes } = require('node:crypto')
const load = require('./helpers/load-ts.cjs')

class CrmError extends Error { constructor(message, status = 400) { super(message); this.status = status } }

const OLD = 'old-auth-secret-for-rotation-test'
const NEW = 'new-dedicated-secret-for-rotation-test'
function setEnv(map) {
  for (const key of ['WI300_APPEARANCE_SECRET', 'AUTH_SECRET', 'NEXTAUTH_SECRET']) {
    if (map[key]) process.env[key] = map[key]; else delete process.env[key]
  }
  delete process.env.SITE_PROFILE_KEY; delete process.env.SITE_VARIANT; delete process.env.VERCEL_ENV
}
function fakeDb() {
  const store = new Map()
  return {
    store,
    systemConfig: {
      findUnique: async ({ where }) => store.has(where.key) ? { value: store.get(where.key) } : null,
      upsert: async ({ where, create, update }) => { store.set(where.key, (store.has(where.key) ? update : create).value) },
    },
  }
}

async function run() {
  // 1) Thư viện mẫu trang bán hàng: seal/open là hàm thuần, kiểm trực tiếp.
  const lib = load('lib/course-page/template-library.ts', { '@/lib/crm/service': { CrmError } })
  setEnv({ AUTH_SECRET: OLD })
  const sealedOld = lib.sealLibrary({ hello: 'xin chào' }, 'ctx-1')
  setEnv({ WI300_APPEARANCE_SECRET: NEW, AUTH_SECRET: OLD })
  assert.deepEqual(lib.openLibrary(sealedOld, 'ctx-1'), { hello: 'xin chào' }, 'Bản ghi thư viện mã hóa bằng khóa cũ phải mở được sau khi cài khóa mới')
  const sealedNew = lib.sealLibrary({ hello: 'bản mới' }, 'ctx-1')
  setEnv({ WI300_APPEARANCE_SECRET: NEW })
  assert.deepEqual(lib.openLibrary(sealedNew, 'ctx-1'), { hello: 'bản mới' }, 'Bản ghi ghi sau luân chuyển phải mở bằng khóa mới')
  setEnv({ AUTH_SECRET: OLD })
  assert.throws(() => lib.openLibrary(sealedNew, 'ctx-1'), 'Bản ghi mới không còn mở được bằng khóa cũ')

  // 2) Kho SEO nội dung: ghi bằng khóa cũ, đọc sau luân chuyển, ghi lại thì sang khóa mới.
  const storage = load('lib/content/seo-storage.ts', { '@/lib/crm/service': { CrmError } })
  const seoShared = load('lib/content/seo.ts')
  const dbSeo = fakeDb()
  setEnv({ AUTH_SECRET: OLD })
  await storage.writeContentSeo(dbSeo, 'post', 7, { ...seoShared.emptyContentSeo, title: 'Tiêu đề cũ' })
  setEnv({ WI300_APPEARANCE_SECRET: NEW, AUTH_SECRET: OLD })
  assert.equal((await storage.readContentSeo(dbSeo, 'post', 7)).title, 'Tiêu đề cũ', 'SEO mã hóa bằng khóa cũ phải đọc được sau khi cài khóa mới')
  await storage.writeContentSeo(dbSeo, 'post', 7, { ...seoShared.emptyContentSeo, title: 'Tiêu đề mới' })
  setEnv({ WI300_APPEARANCE_SECRET: NEW })
  assert.equal((await storage.readContentSeo(dbSeo, 'post', 7)).title, 'Tiêu đề mới', 'SEO ghi sau luân chuyển phải đọc bằng khóa mới')
  setEnv({ AUTH_SECRET: OLD })
  await assert.rejects(() => storage.readContentSeo(dbSeo, 'post', 7), 'SEO đã chuyển khóa không còn đọc được bằng khóa cũ')

  // 3) Giao diện Wi300: dựng bản ghi bằng đúng thuật toán của runtime cũ
  // (sha256 + AES-256-GCM, AAD là tên khóa) rồi đọc qua readAppearance.
  const service = load('lib/wi300/appearance-service.ts', { '@/lib/crm/service': { CrmError } })
  const shared = load('lib/wi300/appearance.ts')
  const craftRecord = (secretValue, state) => {
    const keyName = 'wi300:appearance:v1:default'
    const key = createHash('sha256').update('wi300-appearance-v1:' + secretValue).digest()
    const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv)
    cipher.setAAD(Buffer.from(keyName))
    const payload = Buffer.concat([cipher.update(JSON.stringify(state), 'utf8'), cipher.final()])
    return { version: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), payload: payload.toString('base64') }
  }
  const state = { revision: 3, published: shared.defaultAppearance, draft: shared.defaultAppearance, previous: null }
  const dbApp = fakeDb()
  dbApp.store.set('wi300:appearance:v1:default', craftRecord(OLD, state))
  setEnv({ AUTH_SECRET: OLD })
  assert.equal((await service.readAppearance(dbApp)).revision, 3, 'Giao diện đọc bằng khóa cũ trước luân chuyển')
  setEnv({ WI300_APPEARANCE_SECRET: NEW, AUTH_SECRET: OLD })
  assert.equal((await service.readAppearance(dbApp)).revision, 3, 'Giao diện mã hóa bằng khóa cũ vẫn đọc được sau khi cài khóa mới')
  // Giả lập lần lưu của admin sau luân chuyển: bản ghi được mã hóa lại bằng khóa mới.
  dbApp.store.set('wi300:appearance:v1:default', craftRecord(NEW, { ...state, revision: 4 }))
  setEnv({ WI300_APPEARANCE_SECRET: NEW })
  assert.equal((await service.readAppearance(dbApp)).revision, 4, 'Giao diện đã chuyển khóa đọc bằng khóa mới')
  setEnv({ AUTH_SECRET: OLD })
  await assert.rejects(() => service.readAppearance(dbApp), 'Giao diện đã chuyển khóa không còn đọc được bằng khóa cũ')

  console.log('test-secret-rotation: TẤT CẢ ĐẠT')
}

run().catch(error => { console.error(error); process.exit(1) })
