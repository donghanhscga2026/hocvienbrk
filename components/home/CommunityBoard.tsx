'use client'

import React, { useState, useEffect, useRef } from 'react'
import PostCard from './PostCard'
import PostDetailModal from './PostDetailModal'
import { Newspaper, Loader2, PlusCircle, ChevronLeft, ChevronRight, ArrowRightCircle, ArrowLeftCircle } from 'lucide-react'
import Link from 'next/link'

interface CommunityBoardProps {
    posts?: any[]
    isAdmin: boolean
    title?: string
}

export default function CommunityBoard({ posts = [], isAdmin, title = 'Bảng tin' }: CommunityBoardProps) {
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
    
    // Client-side pagination với posts từ server
    const [displayCount, setDisplayCount] = useState(3)
    
    const total = posts.length
    const totalPages = Math.ceil(total / displayCount) || 1
    const [currentPage, setCurrentPage] = useState(0)
    
    const visiblePosts = posts.slice(0, (currentPage + 1) * displayCount)
    const hasMore = visiblePosts.length < posts.length
    
    const hasNextPage = hasMore
    const hasPrevPage = currentPage > 0

    const nextGroup = () => { 
        if (hasNextPage) setCurrentPage(prev => prev + 1) 
    }
    const prevGroup = () => { 
        if (hasPrevPage) setCurrentPage(prev => prev - 1) 
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                    <Newspaper className="w-6 h-6 text-brk-primary" />
                    <div>
                        <h2 className="text-xl font-black text-brk-on-surface uppercase tracking-tight leading-none">{title}</h2>
                        <p className="text-[9px] text-brk-accent font-bold uppercase mt-1">({total} bài)</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    {/* Nút điều hướng */}
                    <div className="flex items-center gap-1 bg-brk-background p-1 rounded-xl border border-brk-outline">
                        <button 
                            onClick={prevGroup}
                            disabled={!hasPrevPage}
                            className="p-1.5 rounded-lg hover:bg-brk-surface disabled:opacity-20 transition-all active:scale-90"
                        >
                            <ChevronLeft className="w-4 h-4 text-brk-on-surface" />
                        </button>
                        <button 
                            onClick={nextGroup}
                            disabled={!hasNextPage}
                            className="p-1.5 rounded-lg hover:bg-brk-surface disabled:opacity-20 transition-all active:scale-90"
                        >
                            <ChevronRight className="w-4 h-4 text-brk-on-surface" />
                        </button>
                    </div>

                    {isAdmin && (
                        <Link 
                            href="/tools/posts" 
                            className="bg-brk-surface text-brk-primary p-2 rounded-xl hover:bg-brk-background transition-all shadow-lg active:scale-95"
                        >
                            <PlusCircle className="w-5 h-5" />
                        </Link>
                    )}
                </div>
            </div>

            {posts.length === 0 ? (
                <div className="py-12 text-center bg-brk-surface rounded-[2.5rem] border-2 border-dashed border-brk-outline text-brk-muted mx-2">
                    <p className="text-[10px] font-black uppercase tracking-widest">Hộp thư đang trống</p>
                </div>
            ) : (
                <div className="relative group">
                    {/* Danh sách vuốt ngang */}
                    <div className="flex gap-4 overflow-x-auto pb-6 px-2 no-scrollbar scroll-smooth snap-x snap-mandatory">
                        {/* Nút Quay lại ở đầu trang nếu không phải trang đầu */}
                        {hasPrevPage && (
                            <div className="flex-none w-[120px] snap-center flex flex-col items-center justify-center gap-3">
                                <button 
                                    onClick={prevGroup}
                                    className="w-16 h-16 rounded-full bg-brk-background text-brk-muted flex items-center justify-center hover:bg-brk-surface hover:text-brk-primary transition-all shadow-lg active:scale-90"
                                >
                                    <ArrowLeftCircle className="w-8 h-8" />
                                </button>
                                <span className="text-[10px] font-black text-brk-muted uppercase tracking-widest text-center">Quay lại</span>
                            </div>
                        )}

                        {visiblePosts.map((post: any) => (
                            <div key={post.id} className="flex-none w-[85%] sm:w-[350px] snap-center">
                                <PostCard 
                                    post={post} 
                                    onClick={(p) => setSelectedPostId(p.id)} 
                                />
                            </div>
                        ))}

                        {/* Nút Xem thêm ở cuối trang nếu còn bài */}
                        {hasNextPage && (
                            <div className="flex-none w-[150px] snap-center flex flex-col items-center justify-center gap-3">
                                <button 
                                    onClick={nextGroup}
                                    className="w-16 h-16 rounded-full bg-brk-primary-25 text-brk-primary flex items-center justify-center hover:bg-brk-primary hover:text-brk-on-primary transition-all shadow-lg active:scale-90"
                                >
                                    <ArrowRightCircle className="w-8 h-8" />
                                </button>
                                <span className="text-[10px] font-black text-brk-primary uppercase tracking-widest">Tiếp tục</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal Chi tiết */}
            {selectedPostId && (
                <PostDetailModal 
                    postId={selectedPostId} 
                    onClose={() => setSelectedPostId(null)} 
                />
            )}
        </div>
    )
}
