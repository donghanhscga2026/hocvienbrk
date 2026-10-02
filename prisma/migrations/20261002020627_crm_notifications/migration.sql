-- Chỉ bổ sung dữ liệu mới; không xóa hay viết lại bản ghi cũ.
ALTER TABLE public."CrmRequest" ADD COLUMN "publicReply" TEXT NOT NULL DEFAULT '';

CREATE TABLE public."AppNotification" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "eventKey" TEXT NOT NULL UNIQUE,
  "recipientId" INTEGER NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('REQUEST_INCOMING','REQUEST_RECEIVED','REQUEST_UPDATED','ENROLLMENT_TEACHER','ENROLLMENT_RECEIVED','ENROLLMENT_ACTIVE','COMMENT_REPLY','TASK_DUE')),
  title TEXT NOT NULL,
  "courseId" INTEGER,
  "requestId" TEXT,
  "taskId" INTEGER,
  "enrollmentId" INTEGER,
  "commentId" INTEGER,
  "notBefore" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AppNotification_recipientId_notBefore_createdAt_idx" ON public."AppNotification" ("recipientId","notBefore","createdAt");
CREATE INDEX "AppNotification_recipientId_readAt_idx" ON public."AppNotification" ("recipientId","readAt");
ALTER TABLE public."AppNotification" ENABLE ROW LEVEL SECURITY;
-- NextAuth + Prisma là lớp xác thực. Không mở dữ liệu riêng tư bằng auth.uid().
REVOKE ALL ON public."AppNotification" FROM anon, authenticated;
GRANT ALL ON public."AppNotification" TO service_role;

-- Trigger chạy trong cùng giao dịch; eventKey chống gửi trùng khi request được thử lại.
CREATE FUNCTION public.crm_request_notification() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE incoming boolean; recipient integer;
BEGIN
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
CREATE TRIGGER crm_request_notification AFTER INSERT OR UPDATE OF status,"publicReply","ownerId" ON public."CrmRequest"
FOR EACH ROW EXECUTE FUNCTION public.crm_request_notification();

CREATE FUNCTION public.crm_enrollment_notification() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE teacher integer; active boolean;
BEGIN
  SELECT c."teacherId" INTO teacher FROM public."Course" c WHERE c.id = NEW."courseId";
  IF TG_OP = 'INSERT' THEN
    active := NEW.status::text = 'ACTIVE';
    IF teacher IS NOT NULL AND teacher <> NEW."userId" THEN
      INSERT INTO public."AppNotification" ("eventKey","recipientId",kind,title,"courseId","enrollmentId")
      VALUES ('enrollment-teacher:' || NEW.id,teacher,'ENROLLMENT_TEACHER','Có học viên đăng ký khóa học mới',NEW."courseId",NEW.id)
      ON CONFLICT ("eventKey") DO NOTHING;
    END IF;
    IF NOT active THEN
      INSERT INTO public."AppNotification" ("eventKey","recipientId",kind,title,"courseId","enrollmentId")
      VALUES ('enrollment-received:' || NEW.id,NEW."userId",'ENROLLMENT_RECEIVED','Đã nhận đăng ký khóa học; đang chờ kích hoạt',NEW."courseId",NEW.id)
      ON CONFLICT ("eventKey") DO NOTHING;
    END IF;
  ELSE
    active := NEW.status::text = 'ACTIVE' AND OLD.status::text <> 'ACTIVE';
  END IF;
  IF active THEN
    INSERT INTO public."AppNotification" ("eventKey","recipientId",kind,title,"courseId","enrollmentId")
    VALUES ('enrollment-active:' || NEW.id,NEW."userId",'ENROLLMENT_ACTIVE','Bạn đã được cấp quyền học khóa học',NEW."courseId",NEW.id)
    ON CONFLICT ("eventKey") DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER crm_enrollment_notification AFTER INSERT OR UPDATE OF status ON public."Enrollment"
FOR EACH ROW EXECUTE FUNCTION public.crm_enrollment_notification();

CREATE FUNCTION public.crm_comment_notification() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE recipient integer; course integer;
BEGIN
  IF NEW."parentId" IS NULL THEN RETURN NEW; END IF;
  SELECT p."userId", l."courseId" INTO recipient,course
    FROM public."LessonComment" p JOIN public."Lesson" l ON l.id = p."lessonId"
    WHERE p.id = NEW."parentId" AND p."lessonId" = NEW."lessonId";
  IF recipient IS NOT NULL AND recipient <> NEW."userId" THEN
    INSERT INTO public."AppNotification" ("eventKey","recipientId",kind,title,"courseId","commentId")
    VALUES ('comment-reply:' || NEW.id,recipient,'COMMENT_REPLY','Có người trả lời bình luận của bạn',course,NEW.id)
    ON CONFLICT ("eventKey") DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER crm_comment_notification AFTER INSERT ON public."LessonComment"
FOR EACH ROW EXECUTE FUNCTION public.crm_comment_notification();

CREATE FUNCTION public.crm_task_notification() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE recipient integer;
BEGIN
  SELECT c."ownerId" INTO recipient FROM public."CrmContact" c WHERE c.id = NEW."contactId";
  IF NEW."completedAt" IS NULL AND recipient IS NOT NULL THEN
    INSERT INTO public."AppNotification" ("eventKey","recipientId",kind,title,"taskId","notBefore")
    VALUES ('task-due:' || NEW.id || ':' || recipient,recipient,'TASK_DUE','Đã đến hạn một việc chăm sóc khách hàng',NEW.id,NEW."dueAt")
    ON CONFLICT ("eventKey") DO UPDATE SET "notBefore" = EXCLUDED."notBefore",
      "readAt" = CASE WHEN public."AppNotification"."notBefore" IS DISTINCT FROM EXCLUDED."notBefore" THEN NULL ELSE public."AppNotification"."readAt" END;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER crm_task_notification AFTER INSERT OR UPDATE OF "dueAt","completedAt","contactId" ON public."CrmTask"
FOR EACH ROW EXECUTE FUNCTION public.crm_task_notification();

CREATE FUNCTION public.crm_task_reassignment_notification() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF NEW."ownerId" IS NOT NULL AND NEW."ownerId" IS DISTINCT FROM OLD."ownerId" THEN
    INSERT INTO public."AppNotification" ("eventKey","recipientId",kind,title,"taskId","notBefore")
    SELECT 'task-due:' || t.id || ':' || NEW."ownerId",NEW."ownerId",'TASK_DUE','Đã đến hạn một việc chăm sóc khách hàng',t.id,t."dueAt"
    FROM public."CrmTask" t WHERE t."contactId" = NEW.id AND t."completedAt" IS NULL
    ON CONFLICT ("eventKey") DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER crm_task_reassignment_notification AFTER UPDATE OF "ownerId" ON public."CrmContact"
FOR EACH ROW EXECUTE FUNCTION public.crm_task_reassignment_notification();

-- Không có SECURITY DEFINER hay RPC công khai cho các hàm trigger.
REVOKE ALL ON FUNCTION public.crm_request_notification(),public.crm_enrollment_notification(),public.crm_comment_notification(),public.crm_task_notification(),public.crm_task_reassignment_notification() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_request_notification(),public.crm_enrollment_notification(),public.crm_comment_notification(),public.crm_task_notification(),public.crm_task_reassignment_notification() TO service_role;
