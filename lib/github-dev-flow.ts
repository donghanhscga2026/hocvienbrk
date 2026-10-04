const OWNER = 'donghanhscga2026'
const REPO = 'hocvienbrk'
const API = 'https://api.github.com'

export type DevFlowMeta = {
  branch: string
  kind: 'feature' | 'fix' | 'chore' | 'docs'
  status: 'DEVELOPING' | 'CHECKING' | 'PREVIEW' | 'NEEDS_FIX' | 'DONE'
  baseSha: string
  createdBy: string
}

function token() {
  const value = process.env.GITHUB_DEV_FLOW_TOKEN
  if (!value) throw new Error('GITHUB_DEV_FLOW_TOKEN chưa được cấu hình')
  return value
}

export async function github(path: string, init: RequestInit = {}) {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token()}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`GitHub ${response.status}: ${await response.text()}`)
  if (response.status === 204) return null
  return response.json()
}

export function repoPath(path = '') {
  return `/repos/${OWNER}/${REPO}${path}`
}

export function slugify(input: string) {
  return input.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 45) || 'task'
}

export function marker(meta: DevFlowMeta) {
  return `<!-- mfc-dev-flow:${JSON.stringify(meta)} -->`
}

export function parseMeta(body: string | null): DevFlowMeta | null {
  const match = body?.match(/<!-- mfc-dev-flow:(.*?) -->/)
  if (!match) return null
  try { return JSON.parse(match[1]) as DevFlowMeta } catch { return null }
}

export function replaceMeta(body: string, meta: DevFlowMeta) {
  return body.replace(/<!-- mfc-dev-flow:.*? -->/, marker(meta))
}
