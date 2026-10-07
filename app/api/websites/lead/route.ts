import {websiteFailure} from '@/lib/website/http'
import {CrmError} from '@/lib/crm/service'

export async function POST() {
  return websiteFailure(new CrmError('Form của thiết kế tự do đã được gỡ bỏ.',410))
}
