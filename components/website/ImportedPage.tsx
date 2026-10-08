import {decodePageSource,pageCourses,readPageTemplate} from '@/lib/website/page-template-server'
import {renderPageTemplate} from '@/lib/website/page-template'
import {cache} from 'react'
import type {CourseScopeProfile} from '@/lib/site-profile/config'
import ImportedPageFrame from './ImportedPageFrame'
type Profile=CourseScopeProfile&{id:number;slug:string;isActive?:boolean}
// Chỉ dùng chung trong một lượt render: quyền và dữ liệu vẫn đọc mới ở lượt sau.
const importedPage=cache(async (profile:Profile,coursesEnabled:boolean,customDomain:boolean)=>{
  if(profile.isActive===false)return null
  const template=await readPageTemplate(profile.id)
  if(!template?.active)return null
  const courses=await pageCourses(profile,coursesEnabled,customDomain)
  // Invalid archived content must never break an otherwise working built-in page.
  let html:string
  try {
    html=renderPageTemplate(decodePageSource(template.source),template.region,courses)
  }catch(error){console.error('[Page template]',error instanceof Error?error.message:'Invalid source');return null}
  return <ImportedPageFrame html={html} links={courses.map(c=>c.href)} />
})
export default async function ImportedPage({profile,coursesEnabled=true,customDomain=false}:{profile:Profile;coursesEnabled?:boolean;customDomain?:boolean}) {
  return importedPage(profile,coursesEnabled,customDomain)
}
