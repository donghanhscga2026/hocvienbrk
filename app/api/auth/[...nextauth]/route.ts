import { handlers, authOptions } from '@/auth'
import { Auth } from '@auth/core'
import { activeDomain } from '@/lib/website/domains'
import { requestHostname, isPlatformHost } from '@/lib/website/domain-shared'
import type { NextRequest } from 'next/server'

async function handle(request: NextRequest) {
  const host=requestHostname(request.headers.get('host') || '')
  if(isPlatformHost(host)) return request.method==='GET' ? handlers.GET(request) : handlers.POST(request)
  const domain=await activeDomain(host)
  if(!domain) return new Response('Tên miền chưa kích hoạt.',{status:403})
  // Auth.js wrapper đọc AUTH_URL cố định. Dùng Core trên domain đã xác minh,
  // không sửa biến môi trường toàn cục giữa các request đồng thời.
  const url=new URL(request.url);url.protocol='https:';url.host=domain.hostname
  const incoming=new Request(url,request)
  return Auth(incoming,{...authOptions,basePath:'/api/auth',secret:process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,trustHost:true})
}
export const GET=handle
export const POST=handle
