/* Khôi phục mã theo danh sách đã duyệt. Mặc định chỉ đọc; --execute mới ghi. */
const fs = require('node:fs'), path = require('node:path')
const literal = value => "'" + String(value).replace(/'/g,"''") + "'"
// Cùng danh sách liên kết thủ công với lib/user-id-change.ts; test kiểm tra đồng bộ.
const manualLinks = [
  ['PasswordReset','userId'], ['BulkImportLog','userId'], ['YouTubeToken','userId'],
  ['mbtca_commission_level_snapshot','userId'], ['brk_transaction','sourceMemberId'],
  ['brk_revenue_award','userId'], ['brk_revenue_award','sourceMemberId'],
  ['brk_level_up_record','sourceMemberId'], ['brk_referral_bonus','sourceMemberId'],
  ['brk_system_log','sourceUserId'], ['brk_system_log','adminId'],
  ['brk_system_log','oldRefSysId'], ['brk_system_log','newRefSysId'],
  ['brk_activation_log','sourceUserId'], ['activity_log','userId'],
  ['brk_timeline_record','targetMemberId'], ['brk_timeline_record','sourceMemberId'],
  ['telegram_link_tokens','userId'], ['AffiliateConversion','customerId'],
  ['CrmContact','createdBy'], ['CrmFormSubmission','ownerId'],
  ['CrmRequest','ownerId'], ['CrmRequest','userId'], ['CrmActivity','authorId'],
  ['CrmTask','createdBy'], ['CrmCampaignReceipt','actorId'], ['LessonAnnouncement','senderId'],
]
const fingerprintSql = `SELECT md5(string_agg(id::text||':'||md5(email)||':'||"createdAt"::text||':'||"updatedAt"::text,',' ORDER BY id)) FROM public."User"`
function mappingSql(mapping) {
  if (!Array.isArray(mapping) || !mapping.length || mapping.length>1000) throw new Error('Invalid mapping')
  const old = new Set(), next = new Set()
  for (const m of mapping) {
    if (![m.oldId,m.newId].every(n=>Number.isInteger(n)&&n>0&&n<=2147483647) || old.has(m.oldId) || next.has(m.newId)) throw new Error('Invalid/duplicate ID')
    old.add(m.oldId); next.add(m.newId)
  }
  if ([...old].some(id=>next.has(id))) throw new Error('Overlapping IDs are not supported')
  return mapping.map(m=>`(${m.oldId},${m.newId})`).join(',')
}
function previewSql(mapping) {
  const values = mappingSql(mapping)
  return `WITH m("oldId","newId") AS (VALUES ${values}),
    financial AS (
      SELECT id::text FROM public.brk_activation_log a WHERE EXISTS(SELECT 1 FROM m WHERE concat_ws(' ',a."affectedUserIds"::text,a."walletSnapshots"::text,a.metadata::text) ~ ('\\m'||m."oldId"||'\\M'))
      UNION ALL SELECT id::text FROM public.brk_system_log a WHERE EXISTS(SELECT 1 FROM m WHERE concat_ws(' ',a."oldChain"::text,a."newChain"::text,a.subtree::text,a.metadata::text) ~ ('\\m'||m."oldId"||'\\M'))),
    bulk AS (SELECT id,CASE WHEN jsonb_typeof(summary)='string' THEN (summary#>>'{}')::jsonb ELSE summary END doc FROM public."BulkImportLog" WHERE EXISTS(SELECT 1 FROM m WHERE summary::text ~ ('\\m'||m."oldId"||'\\M')))
    SELECT jsonb_build_object('fingerprint',(${fingerprintSql}),
      'accounts',(SELECT jsonb_agg(jsonb_build_object('oldId',m."oldId",'newId',m."newId",'name',u.name,'createdAt',u."createdAt",'missing',u.id IS NULL,'occupied',v.id IS NOT NULL,'reserved',r.id IS NOT NULL,'retired',c.key IS NOT NULL) ORDER BY m."newId") FROM m LEFT JOIN public."User" u ON u.id=m."oldId" LEFT JOIN public."User" v ON v.id=m."newId" LEFT JOIN public."ReservedId" r ON r.id=m."newId" LEFT JOIN public."SystemConfig" c ON c.key='user-id-change:retired:'||m."newId"),
      'financialSnapshots',(SELECT count(*) FROM financial),
      'bulkLogs',(SELECT jsonb_agg(jsonb_build_object('id',id,'createdUsers',jsonb_array_length(doc->'createdUsers'),'enrollments',jsonb_array_length(doc->'createdEnrollments'),'modifiedUsers',jsonb_array_length(doc->'modifiedUsers'))) FROM bulk),
      'usersBefore',(SELECT count(*) FROM public."User")) AS preview;`
}
function executeSql(mapping, fingerprint, actorId) {
  mappingSql(mapping)
  if (!/^[a-f0-9]{32}$/.test(fingerprint||'') || !Number.isInteger(actorId) || actorId<0) throw new Error('A reviewed fingerprint and admin actor are required')
  const json = literal(JSON.stringify(mapping)), pairs = manualLinks.map(p=>`(${literal(p[0])},${literal(p[1])})`).join(',')
  const map = `jsonb_to_recordset(mapping) AS m("oldId" int,"newId" int)`
  return `BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='45s';
DO $restore$
DECLARE
  mapping jsonb := ${json}::jsonb; links jsonb; stats jsonb := '[]';
  l record; s record; b record; pair record; section text; idkey text; doc jsonb; revised jsonb;
  n bigint; new_n bigint; old_n bigint; user_n bigint; user_hash text; before_hash text;
BEGIN
  -- Chung khóa với đăng ký và đổi số đẹp; yêu cầu đang ghi sẽ chờ hoặc rollback.
  LOCK TABLE public."User" IN SHARE ROW EXCLUSIVE MODE;
  IF NOT EXISTS(SELECT 1 FROM public."User" WHERE id=${actorId} AND role::text='ADMIN') THEN RAISE EXCEPTION 'Admin required'; END IF;
  IF (${fingerprintSql}) IS DISTINCT FROM ${literal(fingerprint)} THEN RAISE EXCEPTION 'User data changed; run a new preview before executing'; END IF;
  IF EXISTS(SELECT 1 FROM ${map} LEFT JOIN public."User" u ON u.id=m."oldId" WHERE u.id IS NULL)
    OR EXISTS(SELECT 1 FROM ${map} JOIN public."User" u ON u.id=m."newId")
    OR EXISTS(SELECT 1 FROM ${map} JOIN public."ReservedId" r ON r.id=m."newId")
    OR EXISTS(SELECT 1 FROM ${map} JOIN public."SystemConfig" c ON c.key IN ('user-id-change:retired:'||m."oldId",'user-id-change:retired:'||m."newId"))
    THEN RAISE EXCEPTION 'Missing account or occupied/reserved/retired target'; END IF;
  IF EXISTS(SELECT 1 FROM pg_constraint WHERE contype='f' AND confrelid='public."User"'::regclass AND (confupdtype<>'c' OR cardinality(conkey)<>1)) THEN RAISE EXCEPTION 'Unsupported User foreign key'; END IF;
  SELECT jsonb_agg(t) INTO links FROM (
    SELECT DISTINCT tbl,col FROM (
      SELECT t.relname AS tbl,a.attname AS col FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace ns ON ns.oid=t.relnamespace JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=c.conkey[1] WHERE c.contype='f' AND c.confrelid='public."User"'::regclass AND ns.nspname='public'
      UNION ALL SELECT * FROM (VALUES ${pairs}) manual(tbl,col)) all_links ORDER BY tbl,col) t;
  FOR l IN SELECT DISTINCT tbl FROM jsonb_to_recordset(links) AS x(tbl text,col text) ORDER BY tbl LOOP
    IF l.tbl<>'User' THEN EXECUTE format('LOCK TABLE public.%I IN SHARE ROW EXCLUSIVE MODE',l.tbl); END IF;
  END LOOP;
  LOCK TABLE public."SystemConfig",public."ReservedId",public."BulkImportLog",public.brk_activation_log,public.brk_system_log IN SHARE ROW EXCLUSIVE MODE;
  -- Kiểm tra lại sau khi khóa cả danh sách giữ chỗ và cấu hình.
  IF EXISTS(SELECT 1 FROM ${map} JOIN public."ReservedId" r ON r.id=m."newId")
    OR EXISTS(SELECT 1 FROM ${map} JOIN public."SystemConfig" c ON c.key IN ('user-id-change:retired:'||m."oldId",'user-id-change:retired:'||m."newId")) THEN RAISE EXCEPTION 'Target reservation changed; run a new preview'; END IF;
  IF (SELECT count(*) FROM pg_proc p JOIN pg_namespace ns ON ns.oid=p.pronamespace WHERE ns.nspname='public' AND p.proname IN ('crm_request_notification','crm_task_reassignment_notification') AND position('app.user_id_change' IN pg_get_functiondef(p.oid))>0)<>2 THEN RAISE EXCEPTION 'Notification maintenance guards are missing'; END IF;
  IF EXISTS(SELECT 1 FROM public.brk_activation_log a CROSS JOIN ${map} WHERE concat_ws(' ',a."affectedUserIds"::text,a."walletSnapshots"::text,a.metadata::text) ~ ('\\m'||m."oldId"||'\\M'))
    OR EXISTS(SELECT 1 FROM public.brk_system_log a CROSS JOIN ${map} WHERE concat_ws(' ',a."oldChain"::text,a."newChain"::text,a.subtree::text,a.metadata::text) ~ ('\\m'||m."oldId"||'\\M')) THEN RAISE EXCEPTION 'Financial rollback snapshot needs a separate review'; END IF;
  SELECT count(*),md5(string_agg((to_jsonb(u)-'id'-'updatedAt'-'referrerId')::text,',' ORDER BY email)) INTO user_n,before_hash FROM public."User" u;
  FOR l IN SELECT * FROM jsonb_to_recordset(links) AS x(tbl text,col text) LOOP
    EXECUTE format('SELECT count(*) FROM public.%I WHERE %I IN (SELECT "oldId" FROM jsonb_to_recordset($1) AS m("oldId" int,"newId" int))',l.tbl,l.col) INTO n USING mapping;
    stats := stats || jsonb_build_array(jsonb_build_object('tbl',l.tbl,'col',l.col,'before',n));
    EXECUTE format('SELECT count(*) FROM public.%I WHERE %I IN (SELECT "newId" FROM jsonb_to_recordset($1) AS m("oldId" int,"newId" int))',l.tbl,l.col) INTO n USING mapping;
    IF n<>0 THEN RAISE EXCEPTION 'Target has orphan references in %.%',l.tbl,l.col; END IF;
  END LOOP;
  PERFORM set_config('app.user_id_change','on',true);
  -- Khóa định danh trong nhật ký hoàn tác: không thay email, điện thoại hay văn bản.
  FOR b IN SELECT id,summary FROM public."BulkImportLog" WHERE EXISTS(SELECT 1 FROM ${map} WHERE summary::text ~ ('\\m'||m."oldId"||'\\M')) LOOP
    doc := CASE WHEN jsonb_typeof(b.summary)='string' THEN (b.summary#>>'{}')::jsonb ELSE b.summary END;
    IF jsonb_typeof(doc)<>'object' OR EXISTS(SELECT 1 FROM jsonb_object_keys(doc) k WHERE k NOT IN ('createdUsers','createdEnrollments','modifiedUsers')) THEN RAISE EXCEPTION 'Unsupported bulk snapshot %',b.id; END IF;
    FOREACH section IN ARRAY ARRAY['createdUsers','createdEnrollments','modifiedUsers'] LOOP
      IF jsonb_typeof(doc->section) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Invalid bulk snapshot %',b.id; END IF;
      idkey := CASE WHEN section='createdUsers' THEN 'id' ELSE 'userId' END;
      IF EXISTS(SELECT 1 FROM jsonb_array_elements(doc->section) e JOIN ${map} ON e->>idkey=m."oldId"::text WHERE jsonb_typeof(e->idkey)<>'number') THEN RAISE EXCEPTION 'Invalid bulk ID type'; END IF;
      SELECT COALESCE(jsonb_agg(CASE WHEN m."newId" IS NOT NULL THEN jsonb_set(e.value,ARRAY[idkey],to_jsonb(m."newId")) ELSE e.value END ORDER BY e.ord),'[]') INTO revised FROM jsonb_array_elements(doc->section) WITH ORDINALITY e(value,ord) LEFT JOIN ${map} ON e.value->>idkey=m."oldId"::text;
      doc := jsonb_set(doc,ARRAY[section],revised);
    END LOOP;
    UPDATE public."BulkImportLog" SET summary=CASE WHEN jsonb_typeof(b.summary)='string' THEN to_jsonb(doc::text) ELSE doc END WHERE id=b.id;
  END LOOP;
  UPDATE public."CrmRequest" r SET history=(SELECT COALESCE(jsonb_agg(e.value || CASE WHEN a."newId" IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('changedBy',a."newId") END || CASE WHEN o."newId" IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('ownerId',o."newId") END ORDER BY e.ord),'[]') FROM jsonb_array_elements(r.history) WITH ORDINALITY e(value,ord) LEFT JOIN ${map.replace('AS m(', 'AS a(')} ON e.value->'changedBy'=to_jsonb(a."oldId") LEFT JOIN ${map.replace('AS m(', 'AS o(')} ON e.value->'ownerId'=to_jsonb(o."oldId"))
    WHERE EXISTS(SELECT 1 FROM ${map} WHERE jsonb_path_exists(r.history,'$[*] ? (@.changedBy == $id || @.ownerId == $id)',jsonb_build_object('id',m."oldId")));
  FOR pair IN SELECT * FROM ${map} LOOP
    UPDATE public."SystemConfig" SET key=replace(key,'wi300:learning-hidden:'||pair."oldId"||':','wi300:learning-hidden:'||pair."newId"||':') WHERE starts_with(key,'wi300:learning-hidden:'||pair."oldId"||':');
  END LOOP;
  UPDATE public."User" u SET id=m."newId","updatedAt"=CURRENT_TIMESTAMP FROM ${map} WHERE u.id=m."oldId";
  FOR l IN SELECT * FROM jsonb_to_recordset(links) AS x(tbl text,col text) LOOP
    EXECUTE format('UPDATE public.%I t SET %I=m."newId" FROM jsonb_to_recordset($1) AS m("oldId" int,"newId" int) WHERE t.%I=m."oldId"',l.tbl,l.col,l.col) USING mapping;
  END LOOP;
  FOR pair IN SELECT * FROM ${map} LOOP
    INSERT INTO public."ReservedId"(id,note) VALUES(pair."oldId",'Restored normal ID; retired') ON CONFLICT(id) DO NOTHING;
    INSERT INTO public."SystemConfig"(key,value) VALUES('user-id-change:retired:'||pair."oldId",jsonb_build_object('newId',pair."newId",'actorId',${actorId},'reason','normal-id-recovery','changedAt',CURRENT_TIMESTAMP));
  END LOOP;
  FOR s IN SELECT * FROM jsonb_to_recordset(stats) AS x(tbl text,col text,"before" bigint) LOOP
    EXECUTE format('SELECT count(*) FILTER (WHERE %I IN (SELECT "oldId" FROM jsonb_to_recordset($1) AS m("oldId" int,"newId" int))),count(*) FILTER (WHERE %I IN (SELECT "newId" FROM jsonb_to_recordset($1) AS m("oldId" int,"newId" int))) FROM public.%I',s.col,s.col,s.tbl) INTO old_n,new_n USING mapping;
    IF old_n<>0 OR new_n<>s."before" THEN RAISE EXCEPTION 'Reference verification failed %.%',s.tbl,s.col; END IF;
  END LOOP;
  SELECT count(*),md5(string_agg((to_jsonb(u)-'id'-'updatedAt'-'referrerId')::text,',' ORDER BY email)) INTO n,user_hash FROM public."User" u;
  -- ReferrerId được cascade; mọi trường hồ sơ khác phải giữ nguyên.
  IF n<>user_n OR user_hash IS DISTINCT FROM before_hash OR EXISTS(SELECT 1 FROM ${map} LEFT JOIN public."User" u ON u.id=m."newId" WHERE u.id IS NULL) THEN RAISE EXCEPTION 'Account verification failed'; END IF;
  INSERT INTO public."SystemConfig"(key,value) VALUES('user-id-allocation:normal-cursor',to_jsonb((SELECT max("newId") FROM ${map}))) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value;
  INSERT INTO public."SystemConfig"(key,value) VALUES('user-id-recovery:'||${literal(fingerprint)},jsonb_build_object('mapping',mapping,'linksBefore',stats,'userCount',user_n,'actorId',${actorId},'changedAt',CURRENT_TIMESTAMP));
END
$restore$;
SELECT key,value FROM public."SystemConfig" WHERE key IN ('user-id-allocation:normal-cursor','user-id-recovery:'||${literal(fingerprint)});
COMMIT;`
}
module.exports = {previewSql,executeSql,manualLinks,fingerprintSql}
if (require.main===module) {
  const args=process.argv.slice(2), planPath=args.find(a=>!a.startsWith('--'))
  if (!planPath) throw new Error('Usage: node scripts/normal-id-recovery.cjs plan.json [--sql] [--execute]')
  const plan=JSON.parse(fs.readFileSync(path.resolve(planPath),'utf8'))
  const sql=args.includes('--execute')?executeSql(plan.mapping,plan.fingerprint,plan.actorId):previewSql(plan.mapping)
  if (args.includes('--sql')) process.stdout.write(sql+'\n')
  else {
    const {PrismaClient}=require('@prisma/client'), prisma=new PrismaClient()
    // Execute là transaction nhiều câu; chỉ gửi qua executor SQL có hỗ trợ script.
    if (args.includes('--execute')) throw new Error('Export --sql --execute after approval; run the complete SQL transaction through the database executor')
    prisma.$queryRawUnsafe(sql).then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.error(error);process.exitCode=1}).finally(()=>prisma.$disconnect())
  }
}
