import {decodePageSource,pageCourses} from '@/lib/website/page-template-server'
import {readPublicPageTemplate} from '@/lib/website/public-page-template'
import {externalizePageAssets} from '@/lib/website/page-template-assets'
import {renderPageTemplate} from '@/lib/website/page-template'
import {readWebsitePages} from '@/lib/website/pages-server'
import {websiteNavigation} from '@/lib/website/pages'
import {connectTemplateNavigation} from '@/lib/website/template-navigation'
import {getSiteRuntimeConfig,type CourseScopeProfile} from '@/lib/site-profile/config'
import {cache} from 'react'
import ImportedPageFrame from './ImportedPageFrame'
type Profile=CourseScopeProfile&{id:number;slug:string;isActive?:boolean}
const importedPage=cache(async(profile:Profile,coursesEnabled:boolean,customDomain:boolean,pageSlug:string)=>{
  if(profile.isActive===false)return null
  const [template,pages]=await Promise.all([readPublicPageTemplate(profile.id,pageSlug),readWebsitePages(profile.id)])
  if(!template?.active)return null
  const courses=await pageCourses(profile,coursesEnabled && template.region!==null,customDomain)
  const navigation=websiteNavigation(pages,profile.slug,customDomain,{courses:coursesEnabled,tools:getSiteRuntimeConfig(profile).modules.tools})
  let html:string
  try{
    const optimized=externalizePageAssets(decodePageSource(template.source),profile.id,template.revision,pageSlug)
    html=connectTemplateNavigation(renderPageTemplate(optimized.html,template.region,courses),navigation,pages.menu.filter(m=>!m.visible && m.match).map(m=>m.match))
  }catch(error){console.error('[Page template]',error instanceof Error?error.message:'Invalid source');return null}
  return <ImportedPageFrame html={html} links={[...courses.map(c=>c.href),...navigation.map(n=>n.href)]} deferDocument />
})
export default async function ImportedPage({profile,coursesEnabled=true,customDomain=false,pageSlug=''}:{profile:Profile;coursesEnabled?:boolean;customDomain?:boolean;pageSlug?:string}){
  return importedPage(profile,coursesEnabled,customDomain,pageSlug)
}
