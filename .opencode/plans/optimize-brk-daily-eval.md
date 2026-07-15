# Plan: Optimize brk-daily-eval Performance (4 Phases)

## Problem
`brk-daily-eval` runs ~2,460+ sequential DB queries, timing out after 300s on Vercel Hobby.
Root cause: N+1 patterns across distributeCommission, checkAndPromoteLevel, and duplicate systemClosure fetches.

## Current Flow (per system tree)
```
processSystem(tree):
  1. system.findMany (due members)         — 1 query
  2. FOR EACH member:
     a. brkTransaction.findFirst (dedup)   — 1
     b. system.update (points)             — 1
     c. distributeCommission()             — 3 + 10*D (D=ancestors)
        - findUnique (member)              — 1
        - findMany (closures)              — 1
        - getLevelConfig (member level)    — 1
        - FOR EACH ancestor:
          - getLevelConfig                 — 1
          - system.update (BRKP)           — 1
          - creditBrkWallet                — 4
          - creditBrkdWallet               — 4
     d. creditBrkWallet (return fee)       — 4
     e. creditBrkdWallet (return BRKD)     — 4
     f. create2F1Voucher                   — ~5
     g. checkAndPromoteLevel (member)      — 2 (no promo)
     h. findMany (closures)               — 1  ← DUPLICATE of (c)
     i. findMany (ancestors)              — 1
     j. FOR EACH ancestor:
        - checkAndPromoteLevel             — 2 each
```
**Total per member (D=5): ~82 queries** — ALL sequential

## Phase 1: Cache Level Configs

**File: `lib/brk/commission-calculator.ts`**
- Add optional `levelConfigs?: Map<number, any>` param to `distributeCommission`
- If provided, look up from map instead of calling `getLevelConfig()`
- Saves D queries per call (5 ancestors × 1 query each = 5 saved)

**File: `lib/brk/level-manager.ts`**
- Add optional `levelConfigs?: Map<number, any>` param to `checkAndPromoteLevel`
- If provided, look up from map instead of calling `getLevelConfig()` in while loop
- Saves 1-N queries per call depending on promotions

**File: `app/api/cron/brk-daily-eval/route.ts`**
- In `processSystem`, call `getAllLevelConfigs(onSystem)` ONCE
- Build `Map<number, config>` by level
- Pass to `distributeCommission()` and `checkAndPromoteLevel()`

**Estimated savings: ~D × M queries per system tree (M=members, D=ancestors)**

## Phase 2: Batch Ancestor Operations in distributeCommission

**File: `lib/brk/commission-calculator.ts`**
- Split into 2 passes:
  - Pass 1 (sequential, fast): compute earnPct for each ancestor — no DB, just math
  - Pass 2 (parallel): execute all BRKP updates + wallet credits using `Promise.all`
- Note: Each ancestor has DIFFERENT wallet (different user), so parallel is safe
- The `previousPct` accumulation (line 48) stays sequential in pass 1

```
// BEFORE: 10 sequential queries per ancestor × 5 = 50 queries, 50 × 15ms = 750ms
// AFTER: 50 queries but parallel → ~15ms total (limited by slowest single query)
```

## Phase 3: Reduce Duplicate systemClosure Queries

**File: `app/api/cron/brk-daily-eval/route.ts`**
- `distributeCommission` already fetches systemClosure (line 23-33)
- But `processSystem` fetches them AGAIN at line 117-118
- Solution: `distributeCommission` returns closures data, processSystem reuses it
- Also pre-fetch ancestor system records once instead of line 120-121

**File: `lib/brk/commission-calculator.ts`**
- Return `{ closures, ancestorSystems }` from `distributeCommission`

**Estimated savings: 2 queries per member (findMany closures + findMany ancestors)**

## Phase 4: Parallel Member Processing

**File: `app/api/cron/brk-daily-eval/route.ts`**
- Process members in batches of 5 using `Promise.all`
- Each member is independent (different wallet operations, dedup prevents double-processing)
- The RETURN_FEE dedup check (`brkTransaction.findFirst`) prevents double-counting
- Points increment uses `increment` operator (atomic, safe for parallel)

```
// BEFORE: M members × 82 queries = M × 15ms = sequential
// AFTER:  M/5 batches × (82 queries parallelized) = much faster
```

**IMPORTANT:** Within a single member, distributeCommission's ancestor credits MUST stay sequential per ancestor (wallet read-modify-write). But ACROSS members, operations are independent.

## Expected Results

| Metric | Before | After |
|--------|--------|-------|
| Queries per member | ~82 | ~25-30 |
| 25 members × 3 trees | ~6,150 queries | ~2,000 queries |
| Est. time (@ 15ms) | ~92s | ~25-30s |
| Timeout risk | HIGH | LOW |

## Files Modified

1. `lib/brk/commission-calculator.ts` — cache configs, batch ancestors, return closures
2. `lib/brk/level-manager.ts` — cache configs in checkAndPromoteLevel
3. `app/api/cron/brk-daily-eval/route.ts` — cache configs, reuse closures, parallel members

## Safety
- All changes are additive (optional params with fallback)
- Business logic UNCHANGED — same calculations, same dedup, same atomicity
- `npx tsc --noEmit` must pass after each phase
