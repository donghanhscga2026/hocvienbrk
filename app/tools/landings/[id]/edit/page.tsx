import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import { getLandingPage, getCourses } from '@/app/actions/landing-actions'
import { EditLandingForm } from '@/components/tools/EditLandingForm'
import MainHeader from '@/components/layout/MainHeader'

interface EditPageProps {
    params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: EditPageProps): Promise<Metadata> {
    const { id } = await params
    const landing = await getLandingPage(parseInt(id))

    return {
        title: landing ? `Chỉnh sửa: ${landing.title}` : 'Landing Page'
    }
}

export default async function EditLandingPage({ params }: EditPageProps) {
    const { id } = await params
    const landing = await getLandingPage(parseInt(id))
    const courses = await getCourses()

    if (!landing) {
        notFound()
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <MainHeader title="CHỈNH SỬA LANDING" toolSlug="landings" />
            
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
                    <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Chỉnh sửa Landing Page</h1>
                    <p className="text-sm text-gray-500 mt-1 font-mono font-bold text-purple-600">URL: giautoandien.io.vn/landing/{landing.slug}</p>
                </div>

                <div className="bg-white rounded-[2.5rem] p-6 lg:p-10 shadow-xl border border-gray-100">
                    <EditLandingForm landing={landing as any} courses={courses} />
                </div>
            </div>
        </div>
    )
}
