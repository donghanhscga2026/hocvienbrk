// Chạy toàn bộ bằng DB/DOM cách ly; không ghi dữ liệu website thật.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path')
const React = require('react'), { JSDOM } = require('jsdom'), load = require('./helpers/load-ts.cjs')
process.env.WI300_APPEARANCE_SECRET = 'isolated-content-cms-test-key-only'
class CrmError extends Error { constructor(message, status = 400) { super(message); this.status = status } }
async function run() {
  let roles = new Map([[0, 'ADMIN'], [8, 'STUDENT']]), posts = new Map(), categories = new Map(), configs = new Map(), queue = Promise.resolve(), tick = 0
  const stamp = () => new Date(1700000000000 + ++tick)
  const matches = (row, where = {}) => (where.published === undefined || row.published === where.published) && (where.categoryId === undefined || row.categoryId === where.categoryId) && (!where.title || row.title.toLowerCase().includes(where.title.contains.toLowerCase()))
  const db = {
    user: { findUnique: async ({ where }) => roles.has(where.id) ? { role: roles.get(where.id) } : null },
    systemConfig: {
      findMany: async ({ where }) => [...configs].filter(([key]) => where.key.in.includes(key)).map(([key, value]) => ({ key, value: structuredClone(value) })),
      findUnique: async ({ where }) => configs.has(where.key) ? { value: structuredClone(configs.get(where.key)) } : null,
      upsert: async ({ where, create, update }) => configs.set(where.key, structuredClone(configs.has(where.key) ? update.value : create.value)),
      deleteMany: async ({ where }) => configs.delete(where.key),
    },
    post: {
      findUnique: async ({ where }) => structuredClone(posts.get(where.id) || null),
      findFirst: async ({ where }) => structuredClone([...posts.values()].find(row => row.id === where.id && matches(row, where)) || null),
      findMany: async ({ where, skip = 0, take = 10 }) => [...posts.values()].filter(row => matches(row, where)).slice(skip, skip + take).map(row => ({ ...structuredClone(row), category: categories.get(row.categoryId) || null, _count: { comments: 2 } })),
      count: async ({ where }) => [...posts.values()].filter(row => matches(row, where)).length,
      create: async ({ data }) => { const row = { ...data, id: 'p' + (++tick), createdAt: stamp(), updatedAt: stamp(), author: { name: 'Admin' } }; posts.set(row.id, row); return structuredClone(row) },
      update: async ({ where, data }) => { const row = { ...posts.get(where.id), ...data, updatedAt: stamp() }; posts.set(row.id, row); return structuredClone(row) },
      updateMany: async ({ where, data }) => { for (const row of posts.values()) if (matches(row, where)) Object.assign(row, data, { updatedAt: stamp() }) },
      delete: async ({ where }) => posts.delete(where.id),
    },
    postCategory: {
      findUnique: async ({ where }) => structuredClone(categories.get(where.id) || null),
      findMany: async () => [...categories.values()].map(row => ({ ...structuredClone(row), _count: { posts: [...posts.values()].filter(post => post.categoryId === row.id).length } })),
      create: async ({ data }) => { const row = { ...data, id: ++tick }; categories.set(row.id, row); return structuredClone(row) },
      update: async ({ where, data }) => { const row = { ...categories.get(where.id), ...data }; categories.set(row.id, row); return structuredClone(row) },
      delete: async ({ where }) => categories.delete(where.id),
    }, $executeRaw: async () => {},
    $transaction: callback => { const task = queue.then(async () => { const snapshot = structuredClone([posts, categories, configs]); try { return await callback(db) } catch (error) { [posts, categories, configs] = snapshot; throw error } }); queue = task.catch(() => {}); return task },
  }
  const mocks = { '@/lib/crm/service': { CrmError }, '@/lib/prisma': { __esModule: true, default: db } }
  const service = load('lib/content/admin-service.ts', mocks), seo = load('lib/content/seo.ts'), storage = load('lib/content/seo-storage.ts', mocks)
  const appearance = load('lib/wi300/appearance-service.ts', mocks), managed = load('lib/wi300/managed-pages.ts'), shared = load('lib/wi300/appearance.ts')
  const input = { title: 'Bài thử', content: 'Nội dung <script>không chạy</script>', image: '/stored.png', categoryId: null, published: false, seo: { ...seo.emptyContentSeo, slug: 'bai-thu', title: 'SEO bài thử', description: 'Mô tả riêng', imageUrl: '/share.png' } }
  await assert.rejects(() => service.saveManagedPost(db, 8, input), error => error.status === 403)
  const category = await service.saveManagedCategory(db, 0, { name: 'Kiến thức', description: 'Mô tả', order: 3, seo: { ...seo.emptyContentSeo, slug: 'kien-thuc', title: 'SEO danh mục' } })
  let post = await service.saveManagedPost(db, 0, { ...input, categoryId: category.id })
  assert.equal(post.authorId, 0); assert.equal(post.published, false)
  assert.equal(posts.get(post.id).title, 'Bản nháp'); assert.equal(posts.get(post.id).content, '', 'Private draft content is not stored in the publicly readable Post table')
  assert.equal((await service.readManagedPost(db, post.id)).content, input.content)
  assert.equal((await service.listManagedPosts(db, 0, 0, 'Bài thử', undefined, false)).total, 1, 'Search uses decrypted draft title')
  assert.equal((await service.listManagedPosts(db, 0, 0, '', undefined, false)).total, 1)
  assert.equal((await service.listManagedPosts(db, 0, 0, '', undefined, true)).total, 0)
  assert.ok(!JSON.stringify([...configs]).includes('SEO bài thử'), 'SEO drafts are encrypted')
  const stored = await storage.readContentSeo(db, 'post', post.id); assert.equal(stored.title, 'SEO bài thử')
  const meta = seo.contentMetadata(stored, post.title, post.content, seo.contentUrl('post', post.id, stored), post.image)
  assert.deepEqual(meta.title, { absolute: 'SEO bài thử' }); assert.equal(meta.alternates.canonical, '/bai-viet/' + post.id + '/bai-thu')
  assert.deepEqual(meta.openGraph.images, ['/share.png']); assert.deepEqual(meta.twitter.images, ['/share.png'])
  const oldVersion = post.updatedAt.toISOString(), date = post.createdAt
  post = await service.saveManagedPost(db, 0, { ...input, id: post.id, categoryId: category.id, published: true, version: oldVersion })
  assert.equal(post.createdAt.toISOString(), date.toISOString()); assert.equal(post.authorId, 0)
  await assert.rejects(() => service.saveManagedPost(db, 0, { ...input, id: post.id, version: oldVersion }), error => error.status === 409)
  await assert.rejects(() => service.deleteManagedContent(db, 0, 'post', post.id, oldVersion), error => error.status === 409)
  await service.deleteManagedContent(db, 0, 'category', category.id)
  assert.equal(posts.get(post.id).categoryId, null); assert.equal(posts.size, 1, 'Deleting category retains posts')
  assert.equal(categories.size, 0)
  await assert.rejects(() => service.saveManagedPost(db, 0, { ...input, categoryId: category.id }), error => error.status === 409)
  roles.set(0, 'STUDENT'); await assert.rejects(() => service.listManagedPosts(db, 0, 0), error => error.status === 403); roles.set(0, 'ADMIN')
  await assert.rejects(() => service.saveManagedPost(db, 0, { ...input, seo: { ...input.seo, imageUrl: 'javascript:alert(1)' } }))

  const key = appearance.appearanceKey('cms-tests')
  let state = await appearance.readAppearance(db, key)
  const unrelated = structuredClone(state.draft); unrelated.home.title = 'Nháp trang chủ chưa duyệt'
  state = await appearance.saveAppearance(db, 0, { action: 'draft', revision: state.revision, settings: unrelated }, key)
  let page = { ...managed.newManagedPage('custom-1', 'trang-thu', 'Trang thử'), title: 'Tiêu đề thử', body: '<script>an toàn</script>', seo: { ...seo.emptyContentSeo, title: 'SEO trang mới' } }
  state = await appearance.saveManagedPage(db, 0, { action: 'draft', revision: state.revision, page }, key)
  assert.equal(state.published.customPages.length, 0)
  state = await appearance.saveManagedPage(db, 0, { action: 'publish', revision: state.revision, page }, key)
  assert.equal(state.published.customPages[0].seo.title, 'SEO trang mới')
  assert.equal(state.published.home.title, shared.defaultAppearance.home.title, 'Publishing one page must not publish other drafts')
  assert.equal(state.draft.home.title, unrelated.home.title)
  const onlyWebsite = structuredClone(state.draft); onlyWebsite.common.name = 'Tên website mới'
  state = await appearance.saveAppearance(db, 0, { action: 'publish', revision: state.revision, settings: onlyWebsite, scope: 'website' }, key)
  assert.equal(state.published.home.title, shared.defaultAppearance.home.title, 'Website settings must not publish other page drafts')
  assert.equal(state.published.common.name, 'Tên website mới')
  await assert.rejects(() => appearance.saveManagedPage(db, 0, { action: 'publish', revision: state.revision - 1, page }, key), error => error.status === 409)
  for (const slug of ['tools', 'san-pham', 'api', 'bai-viet']) await assert.rejects(() => appearance.saveManagedPage(db, 0, { action: 'publish', revision: state.revision, page: { ...page, id: 'collision-' + slug, slug } }, key))
  await assert.rejects(() => appearance.saveManagedPage(db, 0, { action: 'publish', revision: state.revision, page: { ...page, id: 'duplicate' } }, key))
  state = await appearance.saveManagedPage(db, 0, { action: 'trash', revision: state.revision, page }, key)
  assert.equal(state.published.customPages[0].deleted, true)
  state = await appearance.saveManagedPage(db, 0, { action: 'restore', revision: state.revision, page }, key)
  assert.equal(state.published.customPages[0].deleted, false)
  const about = { ...managed.newManagedPage('about', 'gioi-thieu', 'Giới thiệu Wi300'), title: 'Giới thiệu mới', layout: 'split' }
  state = await appearance.saveManagedPage(db, 0, { action: 'publish', revision: state.revision, page: about }, key)
  state = await appearance.saveManagedPage(db, 0, { action: 'trash', revision: state.revision, page: about }, key)
  assert.ok(state.published.hiddenPages.includes('about'))
  state = await appearance.saveManagedPage(db, 0, { action: 'restore', revision: state.revision, page: about }, key)
  assert.ok(!state.published.hiddenPages.includes('about')); assert.equal(state.published.pageContent.about.title, 'Giới thiệu mới')
  const preview = appearance.appearanceKey('cms-tests', { VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'feature' })
  await appearance.saveManagedPage(db, 0, { action: 'trash', revision: 0, page }, preview)
  assert.equal((await appearance.readAppearance(db, key)).published.customPages[0].deleted, false, 'Preview isolates custom-page changes')
  const draftKey = appearance.appearanceKey('draft-restoration')
  const draftPage = { ...managed.newManagedPage('unreviewed', 'chua-duyet', 'Trang chưa duyệt'), body: 'Nội dung mật chưa duyệt' }
  let draftState = await appearance.saveManagedPage(db, 0, { action: 'draft', revision: 0, page: draftPage }, draftKey)
  draftState = await appearance.saveManagedPage(db, 0, { action: 'trash', revision: draftState.revision, page: draftState.draft.customPages[0] }, draftKey)
  draftState = await appearance.saveManagedPage(db, 0, { action: 'restore', revision: draftState.revision, page: draftState.draft.customPages[0] }, draftKey)
  assert.equal(draftState.published.customPages[0].published, false, 'Restoring an unpublished draft must not publish it')
  assert.equal(draftState.draft.customPages[0].deleted, false)
  const website = load('lib/wi300/website-config.ts')
  const publicDraftBrand = website.configuredBrand({ name: 'Wi', description: 'Mô tả', ogImageUrl: '/logo.png' }, draftState.published)
  assert.ok(!JSON.stringify(publicDraftBrand.appearance).includes('Nội dung mật'), 'Hidden content must never be serialized into public brand props')
  const versionsKey = appearance.appearanceKey('restore-versions')
  const reviewed = { ...managed.newManagedPage('reviewed', 'da-duyet', 'Trang đã duyệt'), body: 'Nội dung đã duyệt' }
  let versions = await appearance.saveManagedPage(db, 0, { action: 'publish', revision: 0, page: reviewed }, versionsKey)
  versions = await appearance.saveManagedPage(db, 0, { action: 'draft', revision: versions.revision, page: { ...reviewed, body: 'Nháp chưa duyệt' } }, versionsKey)
  versions = await appearance.saveManagedPage(db, 0, { action: 'trash', revision: versions.revision, page: versions.draft.customPages[0] }, versionsKey)
  versions = await appearance.saveManagedPage(db, 0, { action: 'restore', revision: versions.revision, page: versions.draft.customPages[0] }, versionsKey)
  assert.equal(versions.published.customPages[0].body, 'Nội dung đã duyệt')
  assert.equal(versions.draft.customPages[0].body, 'Nháp chưa duyệt', 'Restore retains unreviewed edits as draft')

  const brand = { name: 'Wi300', description: 'Mô tả website', ogImageUrl: '/global.png', appearance: state.published }
  const routeMocks = { ...mocks, react: { ...React, cache: fn => fn }, 'next/navigation': { notFound: () => { throw Error('404') }, permanentRedirect: url => { throw Error('REDIRECT:' + url) } }, '@/lib/site-profile/deployment-runtime': { getCurrentDeploymentBrand: async () => brand } }
  const custom = load('app/[slug]/page.tsx', routeMocks)
  assert.deepEqual((await custom.generateMetadata({ params: Promise.resolve({ slug: page.slug }) })).title, { absolute: 'SEO trang mới' })
  assert.ok((await custom.default({ params: Promise.resolve({ slug: page.slug }) })).props)
  brand.appearance.customPages[0].published = false
  await assert.rejects(() => custom.default({ params: Promise.resolve({ slug: page.slug }) }), /404/)
  brand.appearance.customPages[0].published = true
  const detail = load('app/bai-viet/[id]/[[...slug]]/page.tsx', routeMocks)
  posts.get(post.id).published = false
  await assert.rejects(() => detail.default({ params: Promise.resolve({ id: post.id, slug: ['bai-thu'] }) }), /404/)
  posts.get(post.id).published = true
  await assert.rejects(() => detail.default({ params: Promise.resolve({ id: post.id }) }), /REDIRECT:/)
  assert.deepEqual((await detail.generateMetadata({ params: Promise.resolve({ id: post.id }) })).title, { absolute: 'SEO bài thử' })

  const session = { user: { id: '0', role: 'ADMIN' } }, invalidated = []
  const apiMocks = { ...mocks, '@/auth': { auth: async () => session }, 'next/cache': { revalidatePath: (...args) => invalidated.push(args) } }
  const api = load('app/api/admin/posts/route.ts', apiMocks)
  function request(body, origin = 'https://wi300.vn') { return new Request('https://wi300.vn/api/admin/posts', { method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) }
  assert.equal((await api.POST(request(input, 'https://evil.example'))).status, 403)
  roles.set(0, 'STUDENT'); assert.equal((await api.GET(new Request('https://wi300.vn/api/admin/posts'))).status, 403); roles.set(0, 'ADMIN')
  assert.equal((await api.POST(request(input))).status, 200)
  assert.ok(invalidated.length)

  const dom = new JSDOM('<div id="root"></div>', { url: 'https://wi300.vn/tools/posts' })
  global.window = dom.window; global.document = dom.window.document; global.IS_REACT_ACT_ENVIRONMENT = true
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.window.navigator })
  const link = { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) }
  const root = require('react-dom/client').createRoot(document.getElementById('root')), savedFetch = global.fetch
  window.scrollTo = () => {}; window.confirm = () => true
  const uiMocks = { 'next/link': link, 'next/navigation': { useRouter: () => ({ refresh() {} }) }, 'next/image': { __esModule: true, default: ({ unoptimized, ...props }) => React.createElement('img', props) }, 'next-auth/react': { useSession: () => ({ data: session, status: 'authenticated' }) }, '@/components/layout/MainHeader': { __esModule: true, default: () => null } }
  const postUI = load('app/tools/posts/page.tsx', uiMocks).default
  global.fetch = async (url, options = {}) => {
    const body = options.body ? JSON.parse(options.body) : null
    if (url.includes('post-categories')) return { ok: true, json: async () => ({ data: await service.listManagedCategories(db, 0) }) }
    if (options.method === 'POST') return { ok: true, json: async () => ({ post: await service.saveManagedPost(db, 0, body) }) }
    return { ok: true, json: async () => await service.listManagedPosts(db, 0, 0) }
  }
  const button = text => [...document.querySelectorAll('button')].find(button => button.textContent === text)
  await React.act(async () => { root.render(React.createElement(postUI)); await new Promise(resolve => setTimeout(resolve, 300)) })
  await React.act(async () => { await new Promise(resolve => setTimeout(resolve, 300)) })
  await React.act(async () => button('Danh mục bài viết').click())
  await React.act(async () => button('Tạo danh mục').click())
  assert.ok(document.getElementById('post-title')); await React.act(async () => button('SEO').click())
  assert.match(document.body.textContent, /Tiêu đề SEO/)
  if (process.env.MANAGEMENT_UI_SNAPSHOT_DIR) { fs.mkdirSync(process.env.MANAGEMENT_UI_SNAPSHOT_DIR, { recursive: true }); fs.writeFileSync(path.join(process.env.MANAGEMENT_UI_SNAPSHOT_DIR, 'category-seo.html'), document.getElementById('root').innerHTML) }
  const Pages = load('components/wi300/WiPagesManager.tsx', uiMocks).default
  global.fetch = async (_, options) => {
    const next = await appearance.saveManagedPage(db, 0, JSON.parse(options.body), key)
    return { ok: true, json: async () => next }
  }
  state = await appearance.readAppearance(db, key)
  await React.act(async () => root.render(React.createElement(Pages, { initial: state })))
  assert.equal(document.querySelectorAll('article').length, 10)
  assert.match(document.body.textContent, /Giới thiệu Wi300/); assert.match(document.body.textContent, /Sản phẩm/); assert.match(document.body.textContent, /Dịch vụ/)
  await React.act(async () => [...document.querySelectorAll('article')].find(row => row.textContent.includes('Trang thử')).querySelectorAll('button')[1].click())
  await React.act(async () => button('Đã xóa').click())
  assert.equal(document.querySelectorAll('article').length, 1)
  await React.act(async () => button('Khôi phục').click())
  assert.equal((await appearance.readAppearance(db, key)).published.customPages[0].deleted, false, 'UI restore sends a valid page without presentation-only fields')
  await React.act(async () => button('Tất cả trang').click())
  if (process.env.MANAGEMENT_UI_SNAPSHOT_DIR) fs.writeFileSync(path.join(process.env.MANAGEMENT_UI_SNAPSHOT_DIR, 'all-pages.html'), document.getElementById('root').innerHTML)
  await React.act(async () => button('Tạo trang').click())
  assert.match(document.body.textContent, /Đường dẫn trang/)
  if (process.env.MANAGEMENT_UI_SNAPSHOT_DIR) fs.writeFileSync(path.join(process.env.MANAGEMENT_UI_SNAPSHOT_DIR, 'new-page.html'), document.getElementById('root').innerHTML)
  await React.act(async () => root.unmount()); global.fetch = savedFetch; dom.window.close()
  console.log('Content CMS: category/post CRUD, encrypted SEO, draft privacy, origin/auth revocation, conflict protection, existing-page inventory, page publish isolation, delete/restore, public metadata and UI passed.')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
