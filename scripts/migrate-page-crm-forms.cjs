/* Defaults to read-only. Run --execute only after reviewing and approving the dry-run. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const {PrismaClient}=require('@prisma/client')
const name='20261008100000_page_crm_forms',file=path.resolve(__dirname,'../prisma/migrations',name,'migration.sql'),sql=fs.readFileSync(file,'utf8'),db=new PrismaClient()
async function snapshot(client){
  const [row]=await client.$queryRawUnsafe(`SELECT (SELECT count(*)::integer FROM public."User") users,(SELECT count(*)::integer FROM public."SiteProfile") pages,(SELECT count(*)::integer FROM public."CrmContact") contacts,(SELECT count(*)::integer FROM public."CrmRequest") requests,(SELECT count(*)::integer FROM public."CrmSubmission") legacy_submissions,(SELECT md5(string_agg(row_to_json(c)::text,'' ORDER BY c.id)) FROM public."CrmContact" c) contacts_checksum,to_regclass('public."CrmForm"')::text form_table,to_regclass('public."CrmFormSubmission"')::text submission_table`)
  return row
}
async function run(){
  const before=await snapshot(db)
  console.log('Before / dry-run:',JSON.stringify(before))
  console.log('Migration:',name,'SQL SHA256:',crypto.createHash('sha256').update(sql).digest('hex'))
  console.log('Plan: add two private form tables; change contact identity uniqueness to owner + email/phone. No row updates, deletions, messages, or historical backfill.')
  if(before.form_table || before.submission_table)throw new Error('Form tables already exist; review migration status instead of rerunning.')
  if(!process.argv.includes('--execute')){console.log('Read-only completed. No writes.');return}
  const after=await db.$transaction(async tx=>{
    await tx.$executeRawUnsafe('SET LOCAL lock_timeout = \'5s\'')
    for(const statement of sql.split(';').map(s=>s.trim()).filter(Boolean))await tx.$executeRawUnsafe(statement)
    const result=await snapshot(tx)
    for(const key of ['users','pages','contacts','requests','legacy_submissions','contacts_checksum'])if(result[key]!==before[key])throw new Error('Unexpected existing data change: '+key)
    if(!result.form_table || !result.submission_table)throw new Error('Missing new form tables.')
    // Match Prisma migration bookkeeping when this project uses that table.
    const [state]=await tx.$queryRawUnsafe(`SELECT to_regclass('public._prisma_migrations')::text AS table_name`)
    if(state.table_name)await tx.$executeRawUnsafe('INSERT INTO public._prisma_migrations (id,checksum,finished_at,migration_name,started_at,applied_steps_count) VALUES ($1,$2,now(),$3,now(),1)',crypto.randomUUID(),crypto.createHash('sha256').update(sql).digest('hex'),name)
    return result
  },{timeout:30000})
  console.log('After:',JSON.stringify(after));console.log('Verified: all existing data counts and contact checksum preserved.')
}
run().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>db.$disconnect())
