# Plan: Fix CRON_SECRET auth + add CronRun logging

## Problem
- All cron jobs return **401 Unauthorized** — `CRON_SECRET` mismatch between Vercel env and `process.env.CRON_SECRET`
- CronRun table is empty — no logging wired into route handlers

## Changes (already done in this session)

### A. CronRun logging (`withCronLogging` HOF)
- Created `lib/cron-logger.ts` — wraps any cron handler with auto-create/update CronRun records
- Applied `withCronLogging` to all 10 cron route handlers
- `npx tsc --noEmit` passes ✅

### B. CRON_SECRET trim fix (11 files)
Add `.trim()` to `process.env.CRON_SECRET` in auth check:

```typescript
// Before
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`)

// After  
if (authHeader !== `Bearer ${process.env.CRON_SECRET?.trim()}`)
```

**Files to edit (all 11):**
1. `app/api/cron/brk-daily-eval/route.ts:136`
2. `app/api/cron/brk-grace-processing/route.ts:8`
3. `app/api/cron/brk-expiration/route.ts:8`
4. `app/api/cron/brk-level-check/route.ts:9`
5. `app/api/cron/brk-revenue-share/route.ts:8`
6. `app/api/cron/gmail-watch/route.ts:13`
7. `app/api/cron/scan-bounces/route.ts:9`
8. `app/api/cron/reset-sender-quota/route.ts:7`
9. `app/api/cron/expire-vouchers/route.ts:6`
10. `app/api/cron/release-affiliate-commissions/route.ts:9`
11. `app/api/cron/status/route.ts:18`

Each file: 1 line change, adding `.trim()`.

## After deploy
- Crons will authenticate correctly
- Each run logs to `cron_run` table (jobName, status, duration, details)
- Check results: `GET /api/cron/status` or query `cron_run` table
