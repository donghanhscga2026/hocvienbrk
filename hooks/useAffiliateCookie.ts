'use client'

import { useState, useEffect } from 'react'

export interface AffiliateData {
    r: string
    l: string | null
    t: number
}

export function useAffiliateCookie(): { refData: AffiliateData | null; loading: boolean } {
    const [refData, setRefData] = useState<AffiliateData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const cookie = document.cookie
            .split('; ')
            .find(row => row.startsWith('aff_ref='))

        if (cookie) {
            try {
                const data = JSON.parse(decodeURIComponent(cookie.split('=')[1])) as AffiliateData
                setRefData(data)
            } catch (e) {
                console.error('Invalid aff_ref cookie:', e)
            }
        }
        setLoading(false)
    }, [])

    return { refData, loading }
}

export function getAffiliateLink(baseUrl: string, refCode: string, landingSlug?: string | null): string {
    const url = landingSlug 
        ? `${baseUrl}/${landingSlug}`
        : baseUrl
    return `${url}?ref=${refCode}`
}
