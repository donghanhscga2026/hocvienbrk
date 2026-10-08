import 'server-only'
import {cache} from 'react'
import {unstable_cache} from 'next/cache'
import prisma from '@/lib/prisma'
import {pageTemplateKey,pageTemplateSchema} from './page-template'
import {readPageTemplate} from './page-template-server'
import {contentTemplateKey,contentTemplateSchema,pageSlugSchema,type ContentTemplate} from './pages'
import {readContentTemplate,readWebsitePages} from './pages-server'

const metadataSchema=pageTemplateSchema.omit({source:true})
const contentMetadataSchema=contentTemplateSchema.omit({source:true})
type Row={metadata:unknown;sourceBytes:number|null}
// Cache only immutable source; publication, ownership and permissions stay fresh.
const sourceForRevision=unstable_cache(async(id:number,revision:number,pageSlug:string)=>{
  const template=pageSlug?await readContentTemplate(id,pageSlug):await readPageTemplate(id)
  if(!template || template.revision!==revision)return null
  return template
},['public-page-template-source-v2'],{revalidate:86400})

export const readPublicPageTemplate=cache(async(id:number,pageSlug=''):Promise<ContentTemplate|null>=>{
  if(!Number.isSafeInteger(id) || id<1 || (pageSlug && !pageSlugSchema.safeParse(pageSlug).success))return null
  const key=pageSlug?contentTemplateKey(id,pageSlug):pageTemplateKey(id)
  const [rows,pages]=await Promise.all([
    prisma.$queryRaw<Row[]>`
      SELECT CASE WHEN jsonb_typeof(c.value)='object' THEN c.value - 'source' ELSE NULL END AS metadata,
        octet_length(c.value->>'source') AS "sourceBytes"
      FROM public."SystemConfig" c
      JOIN public."SiteProfile" p ON p.id=${id}::integer AND p."isActive"=true
      WHERE c.key=${key}
    `,
    pageSlug?readWebsitePages(id):Promise.resolve(null),
  ])
  if(pageSlug && !pages?.pages.some(p=>p.slug===pageSlug && p.published))return null
  const row=rows[0],parsed=(pageSlug?contentMetadataSchema:metadataSchema).safeParse(row?.metadata)
  if(!parsed.success || !parsed.data.active || row.sourceBytes==null)return null
  const size=row.sourceBytes+Buffer.byteLength(JSON.stringify(parsed.data))+1024
  const template=size<1800*1024 ? await sourceForRevision(id,parsed.data.revision,pageSlug) : pageSlug?await readContentTemplate(id,pageSlug):await readPageTemplate(id)
  return template?.active && template.revision===parsed.data.revision ? template : null
})
