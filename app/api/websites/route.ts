import {ownedProfile} from '@/lib/website/server'
import {websiteFailure} from '@/lib/website/http'
import {CrmError} from '@/lib/crm/service'

// Giữ phản hồi rõ ràng cho client cũ; không đọc hoặc ghi thiết kế đã lưu.
export async function GET() {
  try {
    await ownedProfile()
    throw new CrmError('Thiết kế tự do đã được gỡ bỏ. Hãy sử dụng mẫu có sẵn trong Quản lý website.',410)
  } catch(error) {return websiteFailure(error)}
}
export async function POST() {return GET()}
