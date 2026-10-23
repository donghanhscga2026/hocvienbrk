-- Shared rate limiter backing the `checkRateLimit()` helper in lib/rate-limit.ts.
--
-- Context: the application code has always called
--   SELECT allowed, remaining, retry_after_ms
--   FROM public.check_rate_limit(key, max, window_ms)
-- but no migration ever created this function. On production every rate-limited
-- endpoint (phone-login, credentials callback, report-failed-login,
-- request-login-otp) was failing with Prisma P2010
--   "function public.check_rate_limit(text, bigint, bigint) does not exist"
-- and silently falling back to per-instance in-memory limiting, which is easy to
-- bypass across Vercel's many serverless instances.
--
-- This migration creates the missing table + function. It is idempotent, so it
-- is safe to run directly against the production database (the Vercel build
-- does not run `prisma migrate deploy`, so apply it manually once via your
-- database dashboard / psql).
--
-- Privileges: the function is SECURITY DEFINER, so the application role only
-- needs EXECUTE on the function (granted to PUBLIC below); no table grants are
-- required for the app to use it.
-- RLS is intentionally NOT enabled on public.rate_limits: this is an internal
-- counters table accessed only through the function over the direct Prisma
-- connection (the app does not use the Supabase REST API for it), and enabling
-- RLS without a matching policy for the app role would break the function.

DROP FUNCTION IF EXISTS public.check_rate_limit(TEXT, BIGINT, BIGINT);

CREATE TABLE IF NOT EXISTS public.rate_limits (
  "key" TEXT PRIMARY KEY,
  count BIGINT NOT NULL DEFAULT 0,
  reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fixed-window rate limiter, atomic via a single upsert statement.
-- Returns one row: (allowed, remaining, retry_after_ms).
CREATE FUNCTION public.check_rate_limit(p_key TEXT, p_max BIGINT, p_window_ms BIGINT)
RETURNS TABLE (allowed BOOLEAN, remaining BIGINT, retry_after_ms BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH upsert AS (
    INSERT INTO public.rate_limits AS rl ("key", count, reset_at)
    VALUES (p_key, 1, NOW() + make_interval(secs => p_window_ms::double precision / 1000.0))
    ON CONFLICT ("key") DO UPDATE SET
      count = CASE WHEN rl.reset_at <= NOW() THEN 1 ELSE rl.count + 1 END,
      reset_at = CASE
        WHEN rl.reset_at <= NOW()
          THEN NOW() + make_interval(secs => p_window_ms::double precision / 1000.0)
        ELSE rl.reset_at
      END
    RETURNING rl.count, rl.reset_at
  )
  SELECT
    (u.count <= p_max) AS allowed,
    GREATEST(p_max - u.count, 0) AS remaining,
    CASE
      WHEN u.count <= p_max THEN 0::BIGINT
      ELSE GREATEST(0, (EXTRACT(EPOCH FROM (u.reset_at - NOW())) * 1000)::BIGINT)
    END AS retry_after_ms
  FROM upsert AS u;
$$;

GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, BIGINT, BIGINT) TO PUBLIC;
