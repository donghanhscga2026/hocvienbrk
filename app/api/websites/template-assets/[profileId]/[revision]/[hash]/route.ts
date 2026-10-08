import {readPublicPageTemplate} from '@/lib/website/public-page-template'
import {decodePageSource} from '@/lib/website/page-template-server'
import {externalizePageAssets} from '@/lib/website/page-template-assets'

export const runtime='nodejs'
export async function GET(_request:Request,{params}:{params:Promise<{profileId:string;revision:string;hash:string}>}) {
  const {profileId,revision,hash}=await params
  const missing=()=>new Response(null,{status:404,headers:{'Cache-Control':'no-store'}})
  if(!/^[1-9]\d{0,9}$/.test(profileId) || !/^(?:0|[1-9]\d{0,9})$/.test(revision) || !/^[a-f0-9]{64}$/.test(hash))return missing()
  try {
    const id=Number(profileId),version=Number(revision),template=await readPublicPageTemplate(id)
    if(!template || template.revision!==version)return missing()
    const asset=externalizePageAssets(decodePageSource(template.source),id,version).assets.get(hash)
    if(!asset)return missing()
    // Only public static fonts/images enter this cache; HTML and course permissions do not.
    return new Response(new Uint8Array(asset.bytes),{headers:{
      'Content-Type':asset.mime,'X-Content-Type-Options':'nosniff',
      'Access-Control-Allow-Origin':'*','Cross-Origin-Resource-Policy':'cross-origin',
      'Cache-Control':'public, max-age=31536000, immutable',
      'Vercel-CDN-Cache-Control':'public, max-age=86400',
      'ETag':`"${hash}"`,
    }})
  }catch(error){console.error('[Page template asset]',error instanceof Error?error.message:'Invalid asset');return missing()}
}
