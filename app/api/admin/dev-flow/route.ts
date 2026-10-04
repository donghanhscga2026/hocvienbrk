import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { github, marker, parseMeta, replaceMeta, repoPath, slugify, type DevFlowMeta } from '@/lib/github-dev-flow'

async function requireDevFlowAccess() {
  const session = await auth()
  if (!session?.user || !['ADMIN', 'DEVELOPER'].includes(session.user.role)) return null
  return session.user
}

async function comment(issue: number, message: string) {
  return github(repoPath(`/issues/${issue}/comments`), { method: 'POST', body: JSON.stringify({ body: message }) })
}

async function updateIssue(issue: any, meta: DevFlowMeta, extraBody?: string) {
  const body = replaceMeta(issue.body || '', meta) + (extraBody || '')
  return github(repoPath(`/issues/${issue.number}`), { method: 'PATCH', body: JSON.stringify({ body }) })
}

async function getTask(issueNumber: number) {
  const issue = await github(repoPath(`/issues/${issueNumber}`))
  const meta = parseMeta(issue.body)
  if (!meta) throw new Error('Issue này không phải MFC Dev Flow task')
  return { issue, meta }
}

async function snapshot(issue: any, meta: DevFlowMeta) {
  const branchRef = await github(repoPath(`/git/ref/heads/${encodeURIComponent(meta.branch)}`))
  const headSha = branchRef.object.sha
  const prs = await github(repoPath(`/pulls?state=all&head=donghanhscga2026:${encodeURIComponent(meta.branch)}`))
  const pr = prs[0] || null
  const combined = await github(repoPath(`/commits/${headSha}/status`))
  const runs = await github(repoPath(`/actions/runs?branch=${encodeURIComponent(meta.branch)}&per_page=20`))
  const deployments = await github(repoPath(`/deployments?ref=${encodeURIComponent(meta.branch)}&per_page=5`))
  let previewUrl: string | null = null
  for (const deployment of deployments) {
    const statuses = await github(repoPath(`/deployments/${deployment.id}/statuses?per_page=5`))
    const ready = statuses.find((s: any) => s.state === 'success' && (s.environment_url || s.target_url))
    if (ready) { previewUrl = ready.environment_url || ready.target_url; break }
  }
  const securityRuns = runs.workflow_runs.filter((r: any) => r.name === 'Security CI')
  const latestSecurity = securityRuns[0] || null
  const vercel = combined.statuses.find((s: any) => String(s.context).toLowerCase().includes('vercel')) || null
  return {
    issue: { number: issue.number, title: issue.title, body: issue.body, url: issue.html_url, createdAt: issue.created_at },
    meta, headSha, changed: headSha !== meta.baseSha,
    pr: pr ? { number: pr.number, url: pr.html_url, state: pr.state, merged: !!pr.merged_at, mergeable: pr.mergeable } : null,
    ci: latestSecurity ? { status: latestSecurity.status, conclusion: latestSecurity.conclusion, url: latestSecurity.html_url } : null,
    vercel: vercel ? { state: vercel.state, url: vercel.target_url } : null,
    previewUrl,
  }
}

export async function GET(request: NextRequest) {
  const user = await requireDevFlowAccess()
  if (!user) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  try {
    const issueNumber = Number(request.nextUrl.searchParams.get('issue'))
    if (issueNumber) {
      const { issue, meta } = await getTask(issueNumber)
      const comments = await github(repoPath(`/issues/${issueNumber}/comments?per_page=100`))
      return NextResponse.json({ task: await snapshot(issue, meta), logs: comments.map((c: any) => ({ id: c.id, at: c.created_at, body: c.body })) })
    }
    const issues = await github(repoPath('/issues?state=all&per_page=100&sort=created&direction=desc'))
    const tasks = issues.filter((i: any) => !i.pull_request && parseMeta(i.body)).map((i: any) => ({ issue: i.number, title: i.title.replace(/^\[MFC Dev\]\s*/, ''), meta: parseMeta(i.body), url: i.html_url, createdAt: i.created_at }))
    return NextResponse.json({ tasks })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không thể đọc GitHub' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const user = await requireDevFlowAccess()
  if (!user) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  try {
    const input = await request.json()
    const action = String(input.action || '')

    if (action === 'create') {
      const title = String(input.title || '').trim()
      const description = String(input.description || '').trim()
      const kind = ['feature', 'fix', 'chore', 'docs'].includes(input.kind) ? input.kind : 'feature'
      if (!title) return NextResponse.json({ error: 'Cần nhập tên công việc' }, { status: 400 })
      const master = await github(repoPath('/git/ref/heads/master'))
      const draftIssue = await github(repoPath('/issues'), {
        method: 'POST',
        body: JSON.stringify({ title: `[MFC Dev] ${title}`, body: 'Đang khởi tạo MFC Dev Flow...' }),
      })
      const branch = `${kind}/mfc-${draftIssue.number}-${slugify(title)}`
      await github(repoPath('/git/refs'), { method: 'POST', body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: master.object.sha }) })
      const meta: DevFlowMeta = { branch, kind, status: 'DEVELOPING', baseSha: master.object.sha, createdBy: user.email || user.name || String(user.id) }
      const body = `${marker(meta)}\n\n## Yêu cầu\n${description || title}\n\n## Branch\n\`${branch}\`\n`
      await github(repoPath(`/issues/${draftIssue.number}`), { method: 'PATCH', body: JSON.stringify({ body }) })
      await comment(draftIssue.number, `🟢 MFC Dev Flow đã tạo branch \`${branch}\` từ \`master\` tại \`${master.object.sha.slice(0, 8)}\`.`)
      return NextResponse.json({ issue: draftIssue.number, branch })
    }

    const issueNumber = Number(input.issue)
    if (!issueNumber) return NextResponse.json({ error: 'Thiếu issue' }, { status: 400 })
    const { issue, meta } = await getTask(issueNumber)

    if (action === 'sync') {
      const state = await snapshot(issue, meta)
      let pr = state.pr
      if (state.changed && !pr) {
        const created = await github(repoPath('/pulls'), {
          method: 'POST',
          body: JSON.stringify({ title: issue.title.replace(/^\[MFC Dev\]\s*/, ''), head: meta.branch, base: 'master', body: `Tạo tự động bởi MFC Dev Flow.\n\nTheo dõi: #${issueNumber}` }),
        })
        pr = { number: created.number, url: created.html_url, state: created.state, merged: false, mergeable: created.mergeable ?? null }
        await comment(issueNumber, `🔀 Phát hiện code mới và tự tạo Pull Request #${created.number}.`)
      }
      const refreshed = await snapshot(issue, meta)
      const ready = refreshed.pr && refreshed.ci?.conclusion === 'success' && refreshed.vercel?.state === 'success' && refreshed.previewUrl
      const nextStatus = refreshed.pr?.merged ? 'DONE' : ready ? 'PREVIEW' : refreshed.pr ? 'CHECKING' : meta.status
      if (nextStatus !== meta.status) {
        await updateIssue(issue, { ...meta, status: nextStatus })
        await comment(issueNumber, nextStatus === 'PREVIEW' ? '✅ CI và Vercel đã sẵn sàng. Chờ nghiệm thu Preview.' : nextStatus === 'DONE' ? '✅ Công việc đã được merge vào master.' : '🧪 Hệ thống đang kiểm tra CI và Vercel.')
      }
      return NextResponse.json({ task: await snapshot(issue, { ...meta, status: nextStatus }) })
    }

    if (action === 'needs-fix') {
      const note = String(input.note || '').trim()
      const next = { ...meta, status: 'NEEDS_FIX' as const }
      await updateIssue(issue, next)
      await comment(issueNumber, `🔴 Nghiệm thu chưa đạt.\n\n**Yêu cầu sửa:** ${note || 'Cần kiểm tra và sửa lại theo phản hồi người nghiệm thu.'}`)
      return NextResponse.json({ ok: true })
    }

    if (action === 'merge') {
      const state = await snapshot(issue, meta)
      if (!state.pr) return NextResponse.json({ error: 'Chưa có Pull Request' }, { status: 409 })
      if (state.ci?.conclusion !== 'success' || state.vercel?.state !== 'success') return NextResponse.json({ error: 'CI/Vercel chưa xanh hoàn toàn' }, { status: 409 })
      const pr = await github(repoPath(`/pulls/${state.pr.number}`))
      if (pr.mergeable === false) return NextResponse.json({ error: 'Pull Request đang conflict hoặc chưa mergeable' }, { status: 409 })
      await github(repoPath(`/pulls/${state.pr.number}/merge`), { method: 'PUT', body: JSON.stringify({ merge_method: 'merge', sha: state.headSha }) })
      await updateIssue(issue, { ...meta, status: 'DONE' })
      await comment(issueNumber, `🚀 Người nghiệm thu xác nhận đạt. Pull Request #${state.pr.number} đã merge vào master.`)
      await github(repoPath(`/issues/${issueNumber}`), { method: 'PATCH', body: JSON.stringify({ state: 'closed' }) })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Action không hợp lệ' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'MFC Dev Flow thất bại' }, { status: 500 })
  }
}
