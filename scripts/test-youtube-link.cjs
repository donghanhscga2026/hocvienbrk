/* Kiểm chứng liên kết YouTube (GĐ2A):
   1) State OAuth: ký → xác minh khớp người dùng; đổi userId/chữ ký hết
      hạn đều bị từ chối.
   2) parseChannelResponse/parseVideoListResponse: chuẩn hóa đúng đáp
      án Data API mẫu, chịu được trường thiếu.
   3) snapshotDelta: chênh lệch giữa hai ảnh chụp; chưa có ảnh trước
      thì delta = 0 (không tính toàn bộ tích lũy làm tăng trưởng).
   4) Schema + migration tồn tại; callback khóa state theo session;
      unlink xóa token nhưng giữ hàng; cron có CRON_SECRET. */
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const ts = require('typescript')
const root = path.resolve(__dirname, '..')
let checks = 0
const ok = (cond, label) => { assert.ok(cond, label); checks++ }

function loadModule(relative) {
  const file = path.resolve(root, relative)
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(require, module, module.exports)
  return module.exports
}

process.env.NEXTAUTH_SECRET = '<redacted>'
const yt = loadModule('lib/social/youtube.ts')

{
  const now = 1_760_000_000_000
  const state = yt.signOAuthState(42, now)
  const v = yt.verifyOAuthState(state, now + 60_000)
  ok(v.ok && v.userId === 42, 'state: ký/xác minh khớp')
  ok(!yt.verifyOAuthState(state.replace('42.', '43.'), now + 60_000).ok, 'state: đổi userId bị từ chối')
  ok(!yt.verifyOAuthState(state, now + 16 * 60_000).ok, 'state: hết hạn 15 phút bị từ chối')
  ok(!yt.verifyOAuthState('rac').ok, 'state: định dạng lạ bị từ chối')
  const url = yt.buildYouTubeAuthUrl({ clientId: 'cid', redirectUri: 'https://x/cb', state })
  ok(url.includes('scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fyoutube.readonly') && url.includes('access_type=offline'), 'auth url: scope chỉ-đọc + offline')
}

{
  const stats = yt.parseChannelResponse({
    items: [{
      id: 'UC123', snippet: { title: 'Kênh Mẫu', customUrl: '@kenhmau' },
      statistics: { subscriberCount: '1200', viewCount: '45678', videoCount: '33' },
      contentDetails: { relatedPlaylists: { uploads: 'UU123' } },
    }],
  })
  ok(stats && stats.subscribers === 1200 && stats.totalViews === 45678 && stats.videoCount === 33 && stats.uploadsPlaylistId === 'UU123', 'parse channel: số liệu + uploads playlist')
  ok(yt.parseChannelResponse({ items: [] }) === null, 'parse channel: rỗng → null')
  const videos = yt.parseVideoListResponse({
    items: [
      { id: 'v1', snippet: { title: 'Bài 1', publishedAt: '2026-10-01T00:00:00Z' }, statistics: { viewCount: '100', likeCount: '9' } },
      { id: 'v2', snippet: { title: 'Bài 2' }, statistics: {} },
    ],
  })
  ok(videos.length === 2 && videos[0].viewCount === 100 && videos[1].viewCount === 0, 'parse videos: chịu trường thiếu')
}

{
  const d0 = yt.snapshotDelta(null, { followers: 100, totalViews: 5000, videoCount: 10 })
  ok(d0.followers === 0 && d0.views === 0, 'delta: lần đầu = 0 (không tính tích lũy cũ)')
  const d1 = yt.snapshotDelta({ followers: 100, totalViews: 5000, videoCount: 10 }, { followers: 130, totalViews: 5600, videoCount: 11 })
  ok(d1.followers === 30 && d1.views === 600 && d1.videos === 1, 'delta: hiệu hai ảnh chụp')
}

const schema = fs.readFileSync(path.join(root, 'prisma/schema.prisma'), 'utf8')
ok(/model ConnectedAccount \{/.test(schema) && /model SocialSnapshot \{/.test(schema) && /model ExternalContentItem \{/.test(schema), 'schema: 3 model liên kết/đồng bộ')
ok(schema.includes('@@unique([accountId, externalId])'), 'schema: video duy nhất theo tài khoản + externalId')
ok(fs.existsSync(path.join(root, 'prisma/migrations/20261024001000_add_connected_accounts/migration.sql')), 'migration: tồn tại')
const callback = fs.readFileSync(path.join(root, 'app/api/social/youtube/callback/route.ts'), 'utf8')
ok(callback.includes('verifyOAuthState') && callback.includes('verified.userId !== Number(session.user.id)'), 'callback: state khóa theo session')
const actions = fs.readFileSync(path.join(root, 'app/actions/social-account-actions.ts'), 'utf8')
ok(actions.includes('accessToken: null') && actions.includes("status: 'REVOKED'"), 'unlink: xóa token, giữ hàng (REVOKED)')
const cron = fs.readFileSync(path.join(root, 'app/api/cron/social-sync/route.ts'), 'utf8')
ok(cron.includes('CRON_SECRET'), 'cron: có khóa CRON_SECRET')

console.log(`test-youtube-link: ${checks} kiểm chứng PASS`)
