'use client'

import { useEffect } from 'react'
import { setHomeSlug } from '@/hooks/useHomeSlug'

interface SetHomeSlugProps {
    slug: string
}

export default function SetHomeSlug({ slug }: SetHomeSlugProps) {
    useEffect(() => {
        setHomeSlug(slug)
    }, [slug])
    
    return null
}
