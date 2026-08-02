-- Add composite indexes to BrkTimelineRecord for performance
-- Bảng bị query filter { userId, onSystem } ở nhiều chỗ (member details, promotion history, dashboard)
CREATE INDEX IF NOT EXISTS "BrkTimelineRecord_userId_onSystem_time_idx"
  ON public."brk_timeline_record" ("userId", "onSystem", "time");

CREATE INDEX IF NOT EXISTS "BrkTimelineRecord_userId_onSystem_type_time_idx"
  ON public."brk_timeline_record" ("userId", "onSystem", "type", "time");
