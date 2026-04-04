import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { auth } from '@/auth'
import { getCourses } from '@/app/actions/landing-actions'
import { NewLandingForm } from '@/components/admin/NewLandingForm'

export const metadata: Metadata = {
    title: 'Tạo Landing Page mới'
}

export default async function NewLandingPage() {
    const session = await auth()
    const courses = await getCourses()
    
    return (
        <div className="p-6">
            <div className="mb-6">
                <Link
                    href="/admin/landings"
                    className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Quay lại danh sách
                </Link>
            </div>
            
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Tạo Landing Page mới</h1>
                <p className="text-gray-500 mt-1">Tạo trang landing cho affiliate marketing</p>
            </div>
            
            <NewLandingForm courses={courses} />
        </div>
    )
}
