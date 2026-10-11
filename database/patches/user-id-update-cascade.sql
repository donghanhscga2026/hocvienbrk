-- Reviewed database patch. Do not execute until the read-only preview is approved.
-- Preserve rows, RLS, function permissions and existing ON DELETE behavior.
BEGIN;
ALTER TABLE public."AppNotification" DROP CONSTRAINT "AppNotification_recipientId_fkey";
ALTER TABLE public."AppNotification" ADD CONSTRAINT "AppNotification_recipientId_fkey"
  FOREIGN KEY ("recipientId") REFERENCES public."User"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE public."CrmForm" DROP CONSTRAINT "CrmForm_ownerId_fkey";
ALTER TABLE public."CrmForm" ADD CONSTRAINT "CrmForm_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES public."User"(id) ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION public.crm_request_notification() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE incoming boolean; recipient integer;
BEGIN
  IF current_setting('app.user_id_change', true) = 'on' THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    incoming := true;
    IF NEW."userId" IS NOT NULL THEN
      INSERT INTO public."AppNotification" ("eventKey","recipientId",kind,title,"courseId","requestId")
      VALUES ('request-received:' || NEW.id,NEW."userId",'REQUEST_RECEIVED','Yêu cầu của bạn đã được tiếp nhận',NEW."courseId",NEW.id)
      ON CONFLICT ("eventKey") DO NOTHING;
    END IF;
  ELSE
    incoming := NEW."ownerId" IS DISTINCT FROM OLD."ownerId" OR (NEW.status = 'NEW' AND OLD.status <> 'NEW');
    IF NEW."userId" IS NOT NULL AND (NEW.status IS DISTINCT FROM OLD.status OR NEW."publicReply" IS DISTINCT FROM OLD."publicReply") THEN
      INSERT INTO public."AppNotification" ("eventKey","recipientId",kind,title,"courseId","requestId")
      VALUES ('request-updated:' || NEW.id || ':' || NEW.version,NEW."userId",'REQUEST_UPDATED',
        CASE WHEN NEW.status = 'RESOLVED' THEN 'Yêu cầu của bạn đã được đánh dấu đã giải quyết'
             WHEN NEW."publicReply" IS DISTINCT FROM OLD."publicReply" AND NEW."publicReply" <> '' THEN 'Người phụ trách đã phản hồi yêu cầu của bạn'
             WHEN NEW.status = 'IN_PROGRESS' THEN 'Yêu cầu của bạn đang được xử lý'
             ELSE 'Yêu cầu của bạn đã được mở lại' END,NEW."courseId",NEW.id)
      ON CONFLICT ("eventKey") DO NOTHING;
    END IF;
  END IF;
  IF incoming THEN
    FOR recipient IN SELECT u.id FROM public."User" u
      WHERE (NEW."ownerId" IS NOT NULL AND u.id = NEW."ownerId" AND u.role::text IN ('ADMIN','TEACHER','INSTRUCTOR'))
         OR (NEW."ownerId" IS NULL AND u.role::text = 'ADMIN')
    LOOP
      INSERT INTO public."AppNotification" ("eventKey","recipientId",kind,title,"courseId","requestId")
      VALUES ('request-incoming:' || NEW.id || ':' || NEW.version || ':' || recipient,recipient,'REQUEST_INCOMING',
        CASE WHEN TG_OP = 'INSERT' THEN 'Có yêu cầu tư vấn / hỗ trợ mới' ELSE 'Có yêu cầu được phân công hoặc mở lại' END,NEW."courseId",NEW.id)
      ON CONFLICT ("eventKey") DO NOTHING;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_task_reassignment_notification() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF current_setting('app.user_id_change', true) = 'on' THEN RETURN NEW; END IF;
  IF NEW."ownerId" IS NOT NULL AND NEW."ownerId" IS DISTINCT FROM OLD."ownerId" THEN
    INSERT INTO public."AppNotification" ("eventKey","recipientId",kind,title,"taskId","notBefore")
    SELECT 'task-due:' || t.id || ':' || NEW."ownerId",NEW."ownerId",'TASK_DUE','Đã đến hạn một việc chăm sóc khách hàng',t.id,t."dueAt"
    FROM public."CrmTask" t WHERE t."contactId" = NEW.id AND t."completedAt" IS NULL
    ON CONFLICT ("eventKey") DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
COMMIT;
