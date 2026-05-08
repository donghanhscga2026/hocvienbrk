SELECT setval('"Course_id_seq"', (SELECT COALESCE(MAX(id), 0) FROM "Course"), true);
