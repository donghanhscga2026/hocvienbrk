-- Kiểm tra System với onSystem = 1
SELECT '=== System (onSystem=1) ===' as info;
SELECT id, "userId", "onSystem", "refSysId", "autoId" FROM "System" WHERE "onSystem" = 1 ORDER BY "autoId" LIMIT 10;

-- Kiểm tra SystemClosure với systemId = 1
SELECT '=== SystemClosure (systemId=1) ===' as info;
SELECT "ancestorId", "descendantId", depth FROM "SystemClosure" WHERE "systemId" = 1 ORDER BY "ancestorId", depth LIMIT 10;

-- Kiểm tra TCAMember
SELECT '=== TCAMember ===' as info;
SELECT "tcaId", "userId", "name", "personalScore", "totalScore", "level" FROM "TCAMember" WHERE "userId" = 861 OR "tcaId" = 861;
