import {notFound} from 'next/navigation'
import {pageSlugSchema} from '@/lib/website/pages'
import PageTemplateImport from '@/components/website/PageTemplateImport'
export default async function Page({params}:{params:Promise<{pageSlug:string}>}){
  const {pageSlug}=await params
  if(!pageSlugSchema.safeParse(pageSlug).success)notFound()
  return <PageTemplateImport pageSlug={pageSlug}/>
}
