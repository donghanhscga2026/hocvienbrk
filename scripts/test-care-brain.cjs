/* Kiểm chứng Care Engine GĐ3 — Second Brain theo khóa:
   1) foldVietnamese + tokenize: bỏ dấu hai chiều, lọc stopword.
   2) BM25: truy vấn đúng chủ đề (có dấu và không dấu) đưa đúng chunk lên top.
   3) Trích dẫn: nhãn nguồn có đúng bài + phút từ timestampSec.
   4) Từ chối ngoài phạm vi ở tầng truy hồi: truy vấn lệch hẳn / chỉ chạm
      1 từ yếu → kết quả rỗng (không đạt ngưỡng BRAIN_MIN_SCORE).
   5) Kiểm tra nguồn: route nháp AI không chứa đường tự gửi; adapter AI có
      nhánh "chưa cấu hình"; route compile/stats/draft tồn tại. */
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

const brain = loadModule('lib/care/brain-core.ts')

// 1) Gập dấu + tokenize
ok(brain.foldVietnamese('Đạm Sữa Bò') === 'dam sua bo', 'fold: Đạm Sữa Bò → dam sua bo')
ok(brain.foldVietnamese('đậu hũ') === 'dau hu', 'fold: đậu hũ → dau hu')
assert.deepEqual(brain.tokenize('Dị ứng đạm sữa'), brain.tokenize('di ung dam sua'))
checks++
ok(!brain.tokenize('em hỏi là sao').includes('la'), 'tokenize: bỏ stopword')

// 2) BM25 xếp hạng — kho mẫu bám demo Màn 3
const chunks = [
  {
    id: 'transcript:1', courseId: 9, lessonId: 'L3', lessonTitle: 'Ngày 3 — Bữa sáng đủ đạm', sourceType: 'TRANSCRIPT', timestampSec: 521,
    text: 'Với dị ứng đạm sữa bò thì mình thay sữa chua bằng đậu hũ non xay mịn trộn bơ đậu phộng để giữ đủ đạm. Mẹ đang cho con bú vẫn giữ nguyên khẩu phần đạm, chỉ đổi nguồn đạm thôi.',
  },
  {
    id: 'segment:2', courseId: 9, lessonId: 'L1', lessonTitle: 'Chọn sản phẩm cho trẻ 0–6 tháng', sourceType: 'SEGMENT', timestampSec: 65,
    text: 'Hướng dẫn chọn sản phẩm cho trẻ sơ sinh trong tháng đầu: ưu tiên nguồn gốc rõ ràng, hạn dùng dài, thành phần đơn giản dễ kiểm tra.',
  },
  {
    id: 'lesson:3', courseId: 9, lessonId: 'L0', lessonTitle: 'Tổng quan khóa học', sourceType: 'LESSON',
    text: 'Khóa học gồm mười ngày thực hành bữa sáng cho mẹ bận rộn, mỗi ngày một bài ngắn kèm bài tập nộp lại để giảng viên góp ý.',
  },
  {
    id: 'qa:4', courseId: 9, lessonId: null, lessonTitle: 'Hỏi đáp trong khóa', sourceType: 'QA',
    text: 'Hỏi: Bé không chịu uống sữa thì sao? Đáp: Mẹ thử đổi sang sữa chua hoặc phô mai tươi, theo dõi phản ứng của bé trong ba ngày.',
  },
]
const index = brain.buildIndex(chunks)

const hitsCo = brain.searchIndex(index, 'dị ứng đạm sữa thì thay bằng gì cho bé', 5)
ok(hitsCo.length >= 1, 'truy vấn có dấu: có kết quả')
ok(hitsCo[0].chunk.id === 'transcript:1', 'truy vấn có dấu: chunk transcript dị ứng lên top 1')

const hitsKhong = brain.searchIndex(index, 'di ung dam sua thay bang gi', 5)
ok(hitsKhong.length >= 1 && hitsKhong[0].chunk.id === 'transcript:1', 'truy vấn không dấu: vẫn đúng chunk lên top 1')

// 3) Trích dẫn đúng phút
ok(hitsCo[0].citation.label.includes('phút 08:41'), 'trích dẫn: 521 giây → phút 08:41')
ok(hitsCo[0].citation.lessonId === 'L3', 'trích dẫn: đúng lessonId')
ok(brain.formatTimestamp(65) === '01:05', 'formatTimestamp 65 → 01:05')

// 4) Từ chối ngoài phạm vi ở tầng truy hồi
const outHits = brain.searchIndex(index, 'đầu tư chứng khoán sinh lời nhanh', 5)
ok(outHits.length === 0, 'truy vấn ngoài phạm vi (chỉ chạm 1 từ yếu "dau"): rỗng')
const noneHits = brain.searchIndex(index, 'bóng đá ngoại hạng anh tối nay', 5)
ok(noneHits.length === 0, 'truy vấn không chạm từ nào: rỗng')
ok(brain.searchIndex(index, '???', 5).length === 0, 'truy vấn không có token: rỗng')
ok(brain.searchIndex(brain.buildIndex([]), 'dị ứng đạm sữa', 5).length === 0, 'chỉ mục rỗng: rỗng')

// 5) Kiểm tra nguồn: an toàn AI + đủ route
const draftRoute = fs.readFileSync(path.resolve(root, 'app/api/crm/care-brain/draft/route.ts'), 'utf8')
ok(!draftRoute.includes('SEND_REPLY') && !draftRoute.includes('publicReply:'), 'route nháp: không có đường tự gửi phản hồi')
ok(draftRoute.includes('CARE_AI_DRAFT') && draftRoute.includes('CARE_AI_MONTHLY_CAP_VND'), 'route nháp: ghi log chi phí + có trần')
const ai = fs.readFileSync(path.resolve(root, 'lib/care/ai.ts'), 'utf8')
ok(ai.includes('CareAiNotConfiguredError') && ai.includes('GEMINI_API_KEY') && ai.includes('OPENAI_API_KEY'), 'adapter AI: hai nhà cung cấp + lỗi mềm khi chưa cấu hình')
ok(fs.existsSync(path.resolve(root, 'app/api/crm/care-brain/route.ts')), 'route compile/stats tồn tại')
ok(fs.existsSync(path.resolve(root, 'components/crm/CrmCareBrainPanel.tsx')), 'panel AI gợi ý trong CRM tồn tại')

console.log(`test-care-brain: ${checks} kiểm chứng PASS`)
