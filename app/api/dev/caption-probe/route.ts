import { NextRequest, NextResponse } from 'next/server'

// ROUTE TẠM để kiểm chứng IP của Vercel có lấy được phụ đề YouTube không — XÓA TRƯỚC KHI MERGE.
export const maxDuration = 30

function extractJsonArray(html: string, key: string): string | null {
    const start = html.indexOf(`"${key}":`)
    if (start < 0) return null
    const i = html.indexOf('[', start)
    if (i < 0) return null
    let depth = 0, inStr = false, esc = false
    for (let j = i; j < html.length; j++) {
        const c = html[j]
        if (esc) { esc = false; continue }
        if (c === '\\') { esc = true; continue }
        if (c === '"') { inStr = !inStr; continue }
        if (inStr) continue
        if (c === '[') depth++
        else if (c === ']') { depth--; if (depth === 0) return html.slice(i, j + 1) }
    }
    return null
}

export async function GET(req: NextRequest) {
    if (req.nextUrl.searchParams.get('token') !== 'probe-7f3a9c') return NextResponse.json({ error: 'no' }, { status: 403 })
    const v = req.nextUrl.searchParams.get('v') || 'EX166MVfmiQ'
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
    const out: any = { video: v }
    try {
        const html = await (await fetch(`https://www.youtube.com/watch?v=${v}`, { headers: { 'User-Agent': ua, 'Accept-Language': 'vi,en' } })).text()
        out.htmlLength = html.length
        out.loginRequired = html.includes('LOGIN_REQUIRED')
        const raw = extractJsonArray(html, 'captionTracks')
        if (!raw) { out.captionTracks = null; return NextResponse.json(out) }
        const tracks = JSON.parse(raw)
        out.captionTracks = tracks.map((t: any) => t.languageCode + '/' + (t.kind || 'manual'))
        const vi = tracks.find((t: any) => t.languageCode === 'vi' && t.kind !== 'asr') || tracks.find((t: any) => t.languageCode === 'vi') || tracks[0]
        const sep = vi.baseUrl.includes('?') ? '&' : '?'
        const body = await (await fetch(vi.baseUrl + sep + 'fmt=json3', { headers: { 'User-Agent': ua } })).text()
        out.timedtextLength = body.length
        if (body) {
            const data = JSON.parse(body)
            const events = (data.events || []).filter((e: any) => e.segs)
            out.cueCount = events.length
            if (events.length) out.firstCue = events[0].segs.map((s: any) => s.utf8).join('').slice(0, 80)
        }
    } catch (e: any) {
        out.error = String(e?.message || e)
    }
    return NextResponse.json(out)
}
