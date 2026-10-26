const assert = require('node:assert/strict')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const load = require('./helpers/load-ts.cjs')
async function run() {
  let actor = { id: 8, role: 'TEACHER' }, saved, select, query, visible = true, brand = { appearance: { hiddenPages: [] } }
  let publicRole = 'TEACHER'
  const db = { user: { findUnique: async args => { select = args.select; return { role: publicRole, name: 'Người dạy', image: null, siteProfile: { slug: 'nguoi-day', isActive: true } } } }, systemConfig: { findUnique: async () => ({ value: saved || {} }), upsert: async ({ create }) => { saved = create.value } }, course: { findMany: async args => { query = args; return visible ? [{ id: 1, id_khoa: 'OWN', name_lop: 'Khóa công khai', mo_ta_ngan: '', link_anh_bia: null, courseCategory: { name: 'Công nghệ' } }] : [] } } }
  const api = load('app/api/wi300/teacher-profile/route.ts', { '@/lib/prisma': { __esModule: true, default: db }, '@/lib/course-page/permissions': { courseEditorActor: async () => actor }, 'next/cache': { revalidatePath() {} } })
  assert.equal((await api.GET(new Request('https://test.invalid/api/wi300/teacher-profile?teacher=9'))).status, 403)
  const body = { headline: 'Giảng viên tận tâm', introduction: 'Giới thiệu thật', fields: ['Công nghệ'], website: '' }
  const request = (profile, origin = 'https://test.invalid') => new Request('https://test.invalid/api/wi300/teacher-profile', { method: 'PUT', headers: { Origin: origin }, body: JSON.stringify(profile) })
  assert.equal((await api.PUT(request(body, 'https://evil.invalid'))).status, 403)
  assert.equal((await api.PUT(request({ ...body, website: 'javascript:alert(1)' }))).status, 400)
  assert.equal(saved, undefined)
  assert.equal((await api.PUT(request(body))).status, 200)
  assert.deepEqual(saved, body)
  assert.equal((await api.GET(new Request('https://test.invalid/api/wi300/teacher-profile'))).status, 200)
  const page = load('app/giang-vien/[id]/page.tsx', {
    react: { ...React, cache: fn => fn },
    'next/link': { __esModule: true, default: props => React.createElement('a', props) },
    'next/image': { __esModule: true, default: props => React.createElement('img', props) },
    'next/navigation': { notFound: () => { throw new Error('404') } },
    '@/lib/prisma': { __esModule: true, default: db },
    '@/lib/site-profile/deployment-runtime': { getCurrentDeploymentBrand: async () => brand },
    '@/lib/site-profile/runtime': { getCurrentSiteProfile: async () => ({ userId: 0 }), getCourseWhereForProfile: () => ({ id: { in: [1] } }) },
    '@/lib/wi300/course-visibility': { wi300CoursePreferences: async () => new Map([[1, true]]), wi300CourseWhere: where => where },
    // GĐ2: không có brand thì trang rẽ sang bản classic (mock module classic).
    '@/components/classic/ClassicTeachers': { ClassicTeacherDetailPage: ({ id }) => React.createElement('div', { 'data-classic-teacher': id }), loadClassicTeacher: async () => null },
  }).default
  const html = renderToStaticMarkup(await page({ params: Promise.resolve({ id: '8' }) }))
  assert.ok(html.includes('/khoa-hoc/OWN'))
  assert.ok(html.includes('/page/nguoi-day'), 'Optional Site Profile is linked, not rendered inside teacher profile')
  assert.ok(html.includes('Giới thiệu thật'))
  assert.equal(query.take, 13, 'Bounded course query supports first 12 and a link for more')
  assert.deepEqual(query.where.AND, [{ id: { in: [1] } }, { teacherId: 8 }])
  assert.equal(select.email, undefined); assert.equal(select.phone, undefined); assert.equal(select.password, undefined)
  publicRole = 'STUDENT'
  await assert.rejects(() => page({ params: Promise.resolve({ id: '8' }) }), /404/)
  publicRole = 'TEACHER'
  visible = false
  await assert.rejects(() => page({ params: Promise.resolve({ id: '8' }) }), /404/)
  visible = true; brand = null
  // GĐ2: không có brand wi300 không còn 404 — trang dùng bản classic.
  const classicElement = await page({ params: Promise.resolve({ id: '8' }) })
  assert.ok(renderToStaticMarkup(classicElement).includes('data-classic-teacher="8"'), 'Classic teacher detail renders when there is no wi300 brand')
  brand = { appearance: { hiddenPages: [] } }
  await assert.rejects(() => page({ params: Promise.resolve({ id: '../8' }) }), /404/)
  console.log('PASS teacher profiles: owner/admin access, CSRF, safe links, profile content, scoped courses, bounded selection, no private fields, hidden teacher rejection and classic fallback without brand.')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
