import { findDomain } from '@/lib/website/domains'
import { requestHostname } from '@/lib/website/domain-shared'

export async function GET(request: Request, {params}:{params:Promise<{token:string}>}) {
  const {token}=await params
  const domain=await findDomain(requestHostname(request.headers.get('host') || ''))
  if(!/^[a-f0-9]{48}$/.test(token) || domain?.token!==token) return new Response('Not found',{status:404})
  return new Response(token,{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}})
}
