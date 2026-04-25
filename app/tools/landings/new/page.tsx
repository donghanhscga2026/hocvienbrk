import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { auth } from '@/auth'
import { getCourses } from '@/app/actions/landing-actions'
import { NewLandingForm } from '@/components/tools/NewLandingForm'
import MainHeader from '@/components/layout/MainHeader'

export const metadata: Metadata = {
    title: 'Tạo Landing Page mới'
}

export default async function NewLandingPage() {
    const session = await auth()
    const courses = await getCourses()

    return (
        <div className="min-h-screen bg-gray-50">
            <MainHeader title="TẠO LANDING PAGE" toolSlug="landings" />
            
            <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
                <div className="mb-6">
                    <Link
                        href="/tools/landings"
                        className="inline-flex items-center gap-2 text-xs font-black text-gray-400 uppercase hover:text-purple-600 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Quay lại danh sách
                    </Link>
                </div>

                <div className="mb-8">
                    <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Tạo Landing Page mới</h1>
                    <p className="text-sm text-gray-500 mt-1 font-medium">Thiết kế trang đích chuyên nghiệp cho Affiliate Marketing</p>
                </div>

                <div className="bg-white rounded-[2.5rem] p-6 lg:p-10 shadow-xl border border-gray-100">
                    <NewLandingForm courses={courses} />
                </div>
            </div>
        </div>
    )
}
