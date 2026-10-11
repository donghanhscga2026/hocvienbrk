'use client'
import { useRouter } from 'next/navigation'
import CourseDashboardModal from '@/components/course/CourseDashboardModal'

// Dùng lại dashboard khóa học; URL CRM chỉ quyết định tab và học viên cần mở.
export default function CrmCourseDashboard({ courseId, courseName, view, studentId }: { courseId: number; courseName: string; view: 'feed' | 'members'; studentId?: number }) {
  const router = useRouter()
  return <CourseDashboardModal courseId={courseId} courseName={courseName} initialTab={view} initialStudentId={studentId} showAllActivity onClose={() => router.push('/tools/crm')} />
}
