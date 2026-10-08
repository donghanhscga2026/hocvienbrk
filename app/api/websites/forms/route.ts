import {crmResponse} from '@/lib/crm/http'

export const dynamic='force-dynamic'
/** Ngừng quản lý form Page; giữ nguyên dữ liệu đăng ký đã lưu. */
export async function GET(){return crmResponse({error:'Page không còn sử dụng form đăng ký.'},410)}
export const POST=GET
