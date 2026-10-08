import {decodePageSource,pageCourses,readPageTemplate} from '@/lib/website/page-template-server'
import {renderPageTemplate} from '@/lib/website/page-template'
import type {CourseScopeProfile} from '@/lib/site-profile/config'
import ImportedPageFrame from './ImportedPageFrame'
import prisma from '@/lib/prisma'
import {boundForms} from '@/lib/crm/forms'
import {connectPageForms} from '@/lib/website/page-forms'
export default async function ImportedPage({profile,coursesEnabled=true}:{profile:CourseScopeProfile&{id:number;slug:string;isActive?:boolean};coursesEnabled?:boolean}) {
  if(profile.isActive===false)return null
  const template=await readPageTemplate(profile.id)
  if(!template?.active)return null
  const courses=await pageCourses(profile,coursesEnabled)
  // Missing new migrations must not take an existing course Page offline.
  const forms=template.forms?.length?await boundForms(prisma,profile,template.forms).catch(()=>[]):[]
  // Invalid archived content must never break an otherwise working built-in page.
  let html:string
  try {
    html=renderPageTemplate(decodePageSource(template.source),template.region,courses)
    html=connectPageForms(html,template.forms || [],forms)
  }catch(error){console.error('[Page template]',error instanceof Error?error.message:'Invalid source');return null}
  return <ImportedPageFrame html={html} links={courses.map(c=>c.href)} forms={forms} slug={profile.slug} />
}
