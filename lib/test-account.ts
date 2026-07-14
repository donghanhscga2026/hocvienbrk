export const TEST_ACCOUNT_IDS = [2689]

export function isTestAccount(userId: number | null | undefined): boolean {
  if (userId == null) return false
  return TEST_ACCOUNT_IDS.includes(userId)
}
