const LS_KEY = 'affiliate_ref'
const EXPIRY_MS = 30 * 24 * 60 * 60 * 1000

function parseRefFromCookie(): number | null {
  try {
    const match = document.cookie.match(/(?:^|;\s*)aff_ref=([^;]*)/)
    if (!match) return null
    const data = JSON.parse(decodeURIComponent(match[1]))
    if (data?.r) {
      const refId = parseInt(data.r)
      if (!isNaN(refId) && refId > 0) return refId
    }
    return null
  } catch {
    return null
  }
}

function parseRefFromLocalStorage(): number | null {
  try {
    const stored = localStorage.getItem(LS_KEY)
    if (!stored) return null
    const data = JSON.parse(stored)
    if (Date.now() - data.timestamp > EXPIRY_MS) {
      localStorage.removeItem(LS_KEY)
      return null
    }
    if (data?.ref) {
      const refId = parseInt(data.ref)
      if (!isNaN(refId) && refId > 0) return refId
    }
    return null
  } catch {
    return null
  }
}

export function getClientRef(): number | null {
  if (typeof window === 'undefined') return null
  return parseRefFromCookie() || parseRefFromLocalStorage()
}
