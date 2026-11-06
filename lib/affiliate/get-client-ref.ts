const LS_KEY = 'affiliate_ref'
const EXPIRY_MS = 30 * 24 * 60 * 60 * 1000

function parseRefFromCookie(): string | number | null {
  try {
    const match = document.cookie.match(/(?:^|;\s*)aff_ref=([^;]*)/)
    if (!match) return null
    const data = JSON.parse(decodeURIComponent(match[1]))
    if (data?.r) {
      const ref = String(data.r).trim()
      if (ref) return /^\d+$/.test(ref) ? Number(ref) : ref
    }
    return null
  } catch {
    return null
  }
}

function parseRefFromLocalStorage(): string | number | null {
  try {
    const stored = localStorage.getItem(LS_KEY)
    if (!stored) return null
    const data = JSON.parse(stored)
    if (Date.now() - data.timestamp > EXPIRY_MS) {
      localStorage.removeItem(LS_KEY)
      return null
    }
    if (data?.ref) {
      const ref = String(data.ref).trim()
      if (ref) return /^\d+$/.test(ref) ? Number(ref) : ref
    }
    return null
  } catch {
    return null
  }
}

export function getClientRef(): string | number | null {
  if (typeof window === 'undefined') return null
  return parseRefFromCookie() || parseRefFromLocalStorage()
}
