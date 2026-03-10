'use client'

import React from 'react'
import { MessageSquare, Clock, User as UserIcon } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'

interface PostCardProps {
    post: any
    onClick: (post: any) => void
}

export default function PostCard({ post, onClick }: PostCardProps) {
    return (
        <div 
            onClick={() => onClick(post)}
            className="bg-white rounded-3xl p-5 border border-gray-100 shadow-lg shadow-gray-100/50 space-y-4 cursor-pointer hover:shadow-xl transition-all active:scale-[0.98]"
        >
            {post.image && (
                <div className="aspect-video w-full rounded-2xl overflow-hidden bg-gray-100">
                    <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
                </div>
            )}
            
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] font-black text-purple-600 uppercase tracking-widest">
                        <UserIcon className="w-3 h-3" />
                        <span>{post.author?.name || 'Admin'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold uppercase">
                        <Clock className="w-3 h-3" />
                        <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: vi })}</span>
                    </div>
                </div>
                
                <h3 className="font-black text-gray-900 text-lg leading-tight line-clamp-2 uppercase tracking-tight">
                    {post.title}
                </h3>
                
                <p className="text-gray-500 text-sm line-clamp-3 leading-relaxed">
                    {post.content}
                </p>
            </div>

            <div className="pt-4 border-t border-gray-50 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
                <div className="flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                    <span>{post._count?.comments || 0} bình luận</span>
                </div>
                <span className="text-purple-600">Xem chi tiết →</span>
            </div>
        </div>
    )
}
