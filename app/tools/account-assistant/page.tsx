import { redirect } from 'next/navigation'

// Giữ liên kết cũ hoạt động; trang đích vẫn kiểm tra quyền Admin.
export default function AccountAssistantPage() {
  redirect('/tools/ho-tro')
}
