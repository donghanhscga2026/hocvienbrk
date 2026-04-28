'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

interface FooterSectionProps {
    profile: {
        footerText?: string | null
        footerLinks?: any | null
        title?: string | null
    }
}

export default function FooterSection({ profile }: FooterSectionProps) {
    const [year, setYear] = useState(new Date().getFullYear()) // Sửa lỗi hydration - tính năm ở client
    const footerText = profile.footerText || `© ${year} ${profile.title || 'BRK'}. All rights reserved.`
    const footerLinks = profile.footerLinks || []
    
    // Sửa lỗi hydration: Chỉ cập nhật năm sau khi mount ở client
    useEffect(() => {
        setYear(new Date().getFullYear())
    }, [])
    
    return (
        <footer className="bg-brk-background py-12 border-t border-brk-outline">
            <div className="container mx-auto px-4">
                {footerLinks && footerLinks.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-6 mb-6">
                        {footerLinks.map((link: { label: string; url?: string }, idx: number) => (
                            <Link 
                                key={idx}
                                href={link.url || '#'}
                                className="text-brk-primary hover:text-brk-accent transition-colors text-sm font-medium"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                )}
                
                <div className="text-center text-brk-muted text-sm">
                    <p>{footerText}</p>
                </div>
            </div>
        </footer>
    )
}
