-- Distributed PostgreSQL rate limiter used by lib/rate-limit.ts
-- Keeps increments atomic across Vercel instances.

CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  key text PRIMARY KEY,
  count integer NOT NULL,
  reset_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS rate_limit_buckets_reset_at_idx
  ON public.rate_limit_buckets (reset_at);

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key text,
  p_max integer,
  p_window_ms integer
)
RETURNS TABLE (
  allowed boolean,
  remaining integer,
  retry_after_ms bigint
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_reset_at timestamptz;
  v_count integer;
BEGIN
  IF p_key IS NULL OR p_key = '' THEN
    RAISE EXCEPTION 'rate limit key must not be empty';
  END IF;
  IF p_max <= 0 OR p_window_ms <= 0 THEN
    RAISE EXCEPTION 'p_max and p_window_ms must be positive';
  END IF;

  INSERT INTO public.rate_limit_buckets AS b (key, count, reset_at)
  VALUES (
    p_key,
    1,
    v_now + (p_window_ms * interval '1 millisecond')
  )
  ON CONFLICT (key) DO UPDATE
  SET
    count = CASE
      WHEN b.reset_at <= v_now THEN 1
      ELSE b.count + 1
    END,
    reset_at = CASE
      WHEN b.reset_at <= v_now
        THEN v_now + (p_window_ms * interval '1 millisecond')
      ELSE b.reset_at
    END
  RETURNING rate_limit_buckets.count, rate_limit_buckets.reset_at
  INTO v_count, v_reset_at;

  allowed := v_count <= p_max;
  remaining := GREATEST(p_max - v_count, 0);
  retry_after_ms := CASE
    WHEN allowed THEN 0
    ELSE GREATEST(
      CEIL(EXTRACT(EPOCH FROM (v_reset_at - v_now)) * 1000)::bigint,
      0
    )
  END;

  RETURN NEXT;
END;
$$;

-- Best-effort cleanup of expired buckets whenever the function is deployed.
DELETE FROM public.rate_limit_buckets WHERE reset_at <= clock_timestamp();
