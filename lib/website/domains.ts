import 'server-only'
import { cache } from 'react'
import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requestHostname, isPlatformHost } from './domain-shared'

/** Không cache giữa các request: tắt domain có hiệu lực ngay. */
export const findDomain=cache(async (hostname: string) => {
  if(isPlatformHost(hostname)) return null
  try { return await prisma.siteDomain.findUnique({ where:{ hostname },include:{ profile:{ include:{ members:true } } } }) }
  catch(e) { if(e instanceof Prisma.PrismaClientKnownRequestError && e.code==='P2021') return null; throw e }
})
export async function activeDomain(rawHost: string) {
  const domain=await findDomain(requestHostname(rawHost))
  return domain?.enabled && domain.verifiedAt && domain.profile.isActive ? domain : null
}
