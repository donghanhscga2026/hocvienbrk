import 'server-only'
import { cache } from 'react'
import prisma from '@/lib/prisma'
import { accessKey, accessSchema, effectiveModules } from './access'
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
  if(!domain?.enabled || !domain.verifiedAt || !domain.profile.isActive) return null
  const config=await prisma.systemConfig.findUnique({where:{key:accessKey(domain.profileId)}})
  return config ? {...domain,...effectiveModules(accessSchema.parse(config.value))} : domain
}
