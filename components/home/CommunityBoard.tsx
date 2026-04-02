'use client'

import React, { useState, useEffect, useRef } from 'react'
import { getPostsAction } from '@/app/actions/post-actions'
import PostCard from './PostCard'
import PostDetailModal from './PostDetailModal'
import { Newspaper, Loader2, PlusCircle, ChevronLeft, ChevronRight, ArrowRightCircle, ArrowLeftCircle } from 'lucide-react'
import Link from 'next/link'

interface CommunityBoardProps {
    isAdmin: boolean
}

const POSTS_LIMIT = 10 // [OPTIMIZE] Giới hạn số posts ban đầu

export default function CommunityBoard({ isAdmin }: CommunityBoardProps) {
    const [posts, setPosts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
    
    // [OPTIMIZE] Server-side pagination
    const [currentPage, setCurrentPage] = useState(0)
    const [totalPages, setTotalPages] = useState(0)
    const [total, setTotal] = useState(0)

    const fetchPosts = async (page: number = 0) => {
        setLoading(true)
        
        const res = await getPostsAction(page, POSTS_LIMIT)
        
        if (res.success) {
            setPosts(res.posts || [])
            setTotal(res.total || 0)
            setTotalPages(res.totalPages || 0)
            setCurrentPage(page)
        }
        
        setLoading(false)
    }

    useEffect(() => {
        fetchPosts(0)
    }, [])

    const startItem = currentPage * POSTS_LIMIT + 1
    const endItem = Math.min((currentPage + 1) * POSTS_LIMIT, total)
    
    // Server-side pagination, no client slicing needed
    const hasNextPage = currentPage < totalPages - 1
    const hasPrevPage = currentPage > 0

    const nextGroup = () => { 
        if (hasNextPage) fetchPosts(currentPage + 1) 
    }
    const prevGroup = () => { 
        if (hasPrevPage) fetchPosts(currentPage - 1) 
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                    <Newspaper className="w-6 h-6 text-brk-primary" />
                    <div>
                        <h2 className="text-xl font-black text-brk-on-surface uppercase tracking-tight leading-none">Bảng tin</h2>
                        <p className="text-[9px] text-brk-muted font-bold uppercase mt-1">Trang {currentPage + 1} / {totalPages || 1} ({total} bài)</p>
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
                            href="/admin/posts" 
                            className="bg-brk-surface text-brk-primary p-2 rounded-xl hover:bg-brk-background transition-all shadow-lg active:scale-95"
                        >
                            <PlusCircle className="w-5 h-5" />
                        </Link>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="py-12 flex flex-col items-center justify-center text-brk-muted gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-brk-primary" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Đang cập nhật tin mới...</p>
                </div>
            ) : posts.length === 0 ? (
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

                        {posts.map((post: any) => (
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
