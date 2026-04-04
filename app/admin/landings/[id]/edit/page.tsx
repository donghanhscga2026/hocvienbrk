import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import { getLandingPage, getCourses } from '@/app/actions/landing-actions'
import { EditLandingForm } from '@/components/admin/EditLandingForm'

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
                <h1 className="text-2xl font-bold">Chỉnh sửa Landing Page</h1>
                <p className="text-gray-500 mt-1">/landing/{landing.slug}</p>
            </div>
            
            <EditLandingForm landing={landing as any} courses={courses} />
        </div>
    )
}
