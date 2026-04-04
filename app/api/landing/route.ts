import { NextRequest, NextResponse } from 'next/server'
import { createLandingPage, updateLandingPage, deleteLandingPage } from '@/app/actions/landing-actions'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        
        const result = await createLandingPage({
            slug: body.slug,
            title: body.title,
            subtitle: body.subtitle,
            description: body.description,
            heroImage: body.heroImage,
            ctaText: body.ctaText,
            ctaLink: body.ctaLink,
            template: body.template,
            config: body.config,
            courseId: body.courseId,
            customCommission: body.customCommission,
            isActive: body.isActive ?? true
        })
        
        if (result.success) {
            return NextResponse.json(result)
        } else {
            return NextResponse.json(result, { status: 400 })
        }
    } catch (error) {
        console.error('[API] Create landing error:', error)
        return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json()
        const { id, ...data } = body
        
        if (!id) {
            return NextResponse.json({ success: false, error: 'Missing ID' }, { status: 400 })
        }
        
        const result = await updateLandingPage(id, data)
        
        if (result.success) {
            return NextResponse.json(result)
        } else {
            return NextResponse.json(result, { status: 400 })
        }
    } catch (error) {
        console.error('[API] Update landing error:', error)
        return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        
        if (!id) {
            return NextResponse.json({ success: false, error: 'Missing ID' }, { status: 400 })
        }
        
        const result = await deleteLandingPage(parseInt(id))
        
        if (result.success) {
            return NextResponse.json(result)
        } else {
            return NextResponse.json(result, { status: 400 })
        }
    } catch (error) {
        console.error('[API] Delete landing error:', error)
        return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
    }
}
