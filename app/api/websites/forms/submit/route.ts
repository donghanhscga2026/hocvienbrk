import {crmResponse} from '@/lib/crm/http'

export const dynamic='force-dynamic'
/** Chặn cả template cũ đang mở, không tạo yêu cầu hay thông báo CRM. */
export async function POST(){return crmResponse({error:'Form Page đã ngừng nhận đăng ký. Vui lòng mở khóa học trên hệ thống.'},410)}
