import {ownedProfile} from '@/lib/website/server'
import {canUseCrm} from '@/lib/crm/shared'
import FormManager from '@/components/crm/FormManager'

export const dynamic='force-dynamic'
export default async function Page(){
  let error=''
  try{
    const profile=await ownedProfile()
    if(!profile.user || !canUseCrm(profile.user.role))error='Bạn cần quyền giảng viên và CRM để quản lý form của Page.'
  }catch(e){error=e instanceof Error?e.message:'Không thể mở phần quản lý form.'}
  return error?<p className="p-8">{error}</p>:<FormManager/>
}
