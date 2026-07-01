export interface BankInfo {
  code: string
  name: string
  shortName: string
  bin: string
}

export async function getVietnamBanks(): Promise<BankInfo[]> {
  try {
    const res = await fetch('/api/banks')
    if (!res.ok) throw new Error('Failed to fetch banks')
    const data = await res.json()
    return data.banks || []
  } catch {
    return []
  }
}
