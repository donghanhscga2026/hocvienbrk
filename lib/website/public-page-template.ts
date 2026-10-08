import 'server-only'
import {cache} from 'react'
import {unstable_cache} from 'next/cache'
import prisma from '@/lib/prisma'
import {pageTemplateKey,pageTemplateSchema,type PageTemplate} from './page-template'
import {readPageTemplate} from './page-template-server'

const metadataSchema=pageTemplateSchema.omit({source:true})
type Row={metadata:unknown;sourceBytes:number|null}
// Revision changes on every apply/builtin operation. Cache only the immutable source,
// never course data, domain ownership, account permissions or the active-page decision.
const sourceForRevision=unstable_cache(async(id:number,revision:number)=>{
  const template=await readPageTemplate(id)
  if(!template || template.revision!==revision)return null
  return template
},['public-page-template-source-v1'],{revalidate:86400})

export const readPublicPageTemplate=cache(async(id:number):Promise<PageTemplate|null>=>{
  if(!Number.isSafeInteger(id) || id<1)return null
  const rows=await prisma.$queryRaw<Row[]>`
    SELECT CASE WHEN jsonb_typeof(c.value)='object' THEN c.value - 'source' ELSE NULL END AS metadata,
      octet_length(c.value->>'source') AS "sourceBytes"
    FROM public."SystemConfig" c
    JOIN public."SiteProfile" p ON p.id=${id}::integer AND p."isActive"=true
    WHERE c.key=${pageTemplateKey(id)}
  `
  const row=rows[0],parsed=metadataSchema.safeParse(row?.metadata)
  if(!parsed.success || !parsed.data.active || row.sourceBytes==null)return null
  // Next Data Cache has a 2MB entry limit. Oversized imports still work without it.
  const size=row.sourceBytes+Buffer.byteLength(JSON.stringify(parsed.data))+1024
  const template=size<1800*1024 ? await sourceForRevision(id,parsed.data.revision) : await readPageTemplate(id)
  return template?.active && template.revision===parsed.data.revision ? template : null
})
