# PLAN: Fix Data Integrity — Duplicate RETURN_FEE + Points Inflation

## Problem Summary
- 40/82 users on System #4 have duplicate RETURN_FEE transactions
- Points inflation: `totalPoints` increment in `commission-calculator.ts` runs outside dedup check → ancestors get +17 every time cron reprocesses
- Wallet balances mismatch (11 users)
- Level-up history shows wrong data (stale BrkLevelUpRecord)
- brk-daily-eval dedup still fragile (uses refId instead of business identity)

## Phase 1: Fix Code (Prevent Recurrence)

### 1A. `lib/brk/commission-calculator.ts` — Points inside dedup

**Current (BUGGY):** Lines 63-67 increment `totalPoints` OUTSIDE the `if (!existingComm)` check. Every call to `distributeCommission` adds +17 to ALL ancestors regardless of dedup.

**Fix:** Move `totalPoints: { increment: BRKP_PER_ACTIVATION }` + `creditBrkWallet` + `creditBrkdWallet` ALL inside the `if (!existingComm)` block. Also move `if (earnPct <= 0) return` BEFORE the existingComm check to avoid unnecessary queries.

**Exact change:**
```typescript
// BEFORE (lines 63-104):
await Promise.all(ancestorCredits.map(async ({ uplineSystem, uplineLevel, earnPct }) => {
    // ❌ ALWAYS runs — causes points inflation
    await prisma.system.update({
      where: { autoId: uplineSystem.autoId },
      data: { totalPoints: { increment: BRKP_PER_ACTIVATION } }
    })
    if (earnPct <= 0) return
    // ... COMMISSION dedup check ...
    // ... BRKD_CREDIT dedup check ...
}))

// AFTER:
await Promise.all(ancestorCredits.map(async ({ uplineSystem, uplineLevel, earnPct }) => {
    if (earnPct <= 0) return
    const existingComm = await prisma.brkTransaction.findFirst({
      where: { wallet: { userId: uplineSystem.userId }, type: 'COMMISSION', refId: commissionRefId }
    })
    if (!existingComm) {
      // ✅ Only when COMMISSION is actually credited
      await prisma.system.update({
        where: { autoId: uplineSystem.autoId },
        data: { totalPoints: { increment: BRKP_PER_ACTIVATION } }
      })
      const commissionAmount = (fee * earnPct) / 100
      if (commissionAmount > 0) {
        await creditBrkWallet(...)
      }
      const brkdAmount = Math.round((BRKD_PER_ACTIVATION * earnPct) / 100)
      if (brkdAmount > 0) {
        await creditBrkdWallet(...)
      }
    }
}))
```

### 1B. `app/api/cron/brk-daily-eval/route.ts` — Dedup by business identity

**Current (FRAGILE):** Lines 77-83 check `refId: returnRefId` — fails when old transactions have `refId: null`.

**Fix:** Remove `refId` filter from the dedup check:
```typescript
// BEFORE:
const existingReturn = await prisma.brkTransaction.findFirst({
  where: { wallet: { userId: member.userId }, type: 'RETURN_FEE', refId: returnRefId }
})

// AFTER:
const existingReturn = await prisma.brkTransaction.findFirst({
  where: { wallet: { userId: member.userId }, type: 'RETURN_FEE' }
})
```

## Phase 2: Data Cleanup Script

**File:** `scripts/fix-duplicate-return-fee-final.js`

### Logic:

**Step 1: Dynamic scan** — Find ALL wallets on system 4 with >1 RETURN_FEE transaction (no hardcoded list).

**Step 2: Delete duplicate transactions**
- RETURN_FEE: Keep oldest, delete rest
- BRKD_CREDIT with `refId LIKE 'return_brkd_sys_4_%'`: Keep oldest, delete rest
- COMMISSION with `refId LIKE 'sys_4_member_%'`: For each unique refId, keep oldest, delete rest
- BRKD_CREDIT with same commission refId: For each unique refId, keep oldest, delete rest
- VOUCHER_CREDIT with old format `level_X_sys_4` (no userId): Delete if new format exists

**Step 3: Self-correcting wallet balance** (CRITICAL — safe from double-debit)
```
For each affected wallet:
  expectedBalance = SUM(CASH transactions WHERE type NOT IN deductions)
  expectedBrkd = SUM(BRKD transactions)
  expectedVoucher = SUM(VOUCHER transactions)
  expectedEarned = SUM(CASH credit transactions)
  
  SET wallet.balance = expectedBalance
  SET wallet.brkd = expectedBrkd
  SET wallet.voucherBalance = expectedVoucher
  SET wallet.totalEarned = expectedEarned
```
This is SELF-CORRECTING — doesn't matter what the current balance is, it recalculates from truth (transactions).

**Step 4: Recalculate totalPoints**
```
For each user on system 4:
  activatedDescendants = COUNT(systemClosure WHERE ancestorId=myAutoId AND depth>0 AND descendant.status='ACTIVE')
  selfPts = 17 (if member was confirmed by daily-eval, i.e. has any RETURN_FEE or was activated before Method B)
  correctPoints = 17 * (selfPts/17 + activatedDescendants)
  SET system.totalPoints = correctPoints
```

**Step 5: Fix levels**
```
For each user on system 4:
  correctLevel = max level where totalPoints >= pointsRequired
  SET system.level = correctLevel
```

**Step 6: Clean stale level-up records**
```
For each user:
  DELETE BrkLevelUpRecord WHERE userId=X AND onSystem=4 AND toLevel > correctLevel
```

**Step 7: Verify**
- Check all affected users: totalPoints, level, RETURN_FEE count, wallet balance
- Check ancestors: totalPoints, COMMISSION count
- Output pass/fail for each

### Flags:
- Default: `--dry-run` (report only)
- `--execute`: Apply changes

## Phase 3: Verify
1. `npx tsc --noEmit` — no TypeScript errors
2. Spot-check: user #269 should have 34pts, L1, 1 RETURN_FEE
3. Spot-check: user #3773 should have correct totalPoints (no more 612 excess)
