/**
 * Care Engine GĐ3 — lõi truy hồi BM25 thuần (không chạm DB, test độc lập).
 * Phần nạp nguồn + cache nằm ở lib/care/brain.ts.
 *
 * Tokenizer bỏ dấu hai chiều: văn bản và truy vấn đều gập về dạng không
 * dấu hạ thường trước khi so khớp — gõ có dấu hay không dấu đều khớp nhau.
 */

export type BrainSourceType = 'SEGMENT' | 'TRANSCRIPT' | 'LESSON' | 'QA'

export interface BrainChunk {
  id: string
  courseId: number
  lessonId: string | null
  lessonTitle: string
  sourceType: BrainSourceType
  text: string
  timestampSec?: number
}

export interface BrainCitation {
  lessonId: string | null
  lessonTitle: string
  sourceType: BrainSourceType
  timestampSec: number | null
  label: string
}

export interface BrainIndex {
  chunks: BrainChunk[]
  tokens: string[][]
  docFreq: Map<string, number>
  avgDocLen: number
}

export interface BrainSearchHit {
  chunk: BrainChunk
  score: number
  citation: BrainCitation
}

/** Ngưỡng điểm BM25 tối thiểu để coi là "có trong nội dung khóa". */
export const BRAIN_MIN_SCORE = 1.0
const BM25_K1 = 1.5
const BM25_B = 0.75

const STOPWORDS = new Set([
  'la', 'va', 'cua', 'cho', 'cac', 'co', 'khong', 'duoc', 'trong', 'nay', 'do',
  'mot', 'nhung', 'khi', 'thi', 'voi', 'tu', 'den', 'the', 'nao', 'sao', 'gi',
  'em', 'anh', 'chi', 'minh', 'ban', 'toi', 'hay', 'da', 'se', 'bi', 'o', 'a',
  've', 'theo', 'nhu', 'ra', 'di', 'len', 'xuong', 'qua', 'lam', 'rat',
])

/** Gập tiếng Việt về dạng không dấu, hạ thường (đ/Đ xử lý riêng vì NFD không tách). */
export function foldVietnamese(input: string): string {
  return input
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function tokenize(text: string): string[] {
  return foldVietnamese(text)
    .split(/[^a-z0-9]+/)
    .filter(token => token.length >= 2 && !STOPWORDS.has(token))
}

export function formatTimestamp(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec))
  const mm = String(Math.floor(sec / 60)).padStart(2, '0')
  const ss = String(sec % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

export function citationOf(chunk: BrainChunk): BrainCitation {
  const base =
    chunk.sourceType === 'QA'
      ? `Hỏi đáp đã trả lời · ${chunk.lessonTitle}`
      : chunk.sourceType === 'LESSON'
        ? `Nội dung bài · ${chunk.lessonTitle}`
        : `Bài · ${chunk.lessonTitle}`
  const label =
    chunk.timestampSec != null && chunk.sourceType !== 'QA'
      ? `${base} · phút ${formatTimestamp(chunk.timestampSec)}`
      : base
  return {
    lessonId: chunk.lessonId,
    lessonTitle: chunk.lessonTitle,
    sourceType: chunk.sourceType,
    timestampSec: chunk.timestampSec ?? null,
    label,
  }
}

/** Dựng chỉ mục BM25 từ danh sách chunk — hàm thuần. */
export function buildIndex(chunks: BrainChunk[]): BrainIndex {
  const tokens = chunks.map(chunk => tokenize(`${chunk.lessonTitle} ${chunk.text}`))
  const docFreq = new Map<string, number>()
  for (const doc of tokens) {
    for (const term of new Set(doc)) docFreq.set(term, (docFreq.get(term) || 0) + 1)
  }
  const totalLen = tokens.reduce((sum, doc) => sum + doc.length, 0)
  return { chunks, tokens, docFreq, avgDocLen: tokens.length ? totalLen / tokens.length : 0 }
}

/**
 * Tìm top-k chunk cho truy vấn. Rỗng khi không chunk nào đạt ngưỡng —
 * tầng gọi dựa vào đó để từ chối trả lời ngoài phạm vi khóa.
 */
export function searchIndex(index: BrainIndex, query: string, k = 5): BrainSearchHit[] {
  const terms = [...new Set(tokenize(query))]
  if (!terms.length || !index.chunks.length) return []
  const n = index.chunks.length
  const hits: BrainSearchHit[] = []
  for (let i = 0; i < n; i++) {
    const doc = index.tokens[i]
    if (!doc.length) continue
    const freq = new Map<string, number>()
    for (const token of doc) freq.set(token, (freq.get(token) || 0) + 1)
    let score = 0
    let matched = 0
    for (const term of terms) {
      const f = freq.get(term)
      if (!f) continue
      matched++
      const df = index.docFreq.get(term) || 0
      const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5))
      const norm = f + BM25_K1 * (1 - BM25_B + (BM25_B * doc.length) / (index.avgDocLen || 1))
      score += idf * ((f * (BM25_K1 + 1)) / norm)
    }
    // Luật bao phủ: truy vấn dài mà chunk chỉ chạm < 40% số từ khóa thì coi
    // như lạc chủ đề (chạm vài từ chung chung) — từ chối ở tầng truy hồi.
    const coverageOk = terms.length < 4 || matched / terms.length >= 0.4
    if (score >= BRAIN_MIN_SCORE && coverageOk) {
      hits.push({ chunk: index.chunks[i], score, citation: citationOf(index.chunks[i]) })
    }
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, k)
}
