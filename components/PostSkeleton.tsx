import React from 'react';

export const PostSkeleton: React.FC = () => {
    return (
        <article className="py-6 border-b border-white/10 sm:border-y sm:my-2 bg-black hover:bg-[#0a0a0a] transition-colors cursor-default block animate-pulse sm:rounded-2xl overflow-hidden">
            {/* Image Skeleton */}
            <div className="w-full aspect-[4/3] bg-[#1a1a1a] mb-5 sm:rounded-2xl mx-0 sm:mx-4 sm:w-[calc(100%-2rem)] border border-white/5" />

            {/* Content Area */}
            <div
                className="min-w-0"
                style={{
                    paddingLeft: 'max(1.5rem, env(safe-area-inset-left))',
                    paddingRight: 'max(1.5rem, env(safe-area-inset-right))'
                }}
            >
                {/* Text Content Skeleton */}
                <div className="mb-4 space-y-3">
                    <div className="h-7 bg-white/10 rounded w-3/4" />
                    <div className="space-y-2">
                        <div className="h-4 bg-white/5 rounded w-full" />
                        <div className="h-4 bg-white/5 rounded w-5/6" />
                        <div className="h-4 bg-white/5 rounded w-4/6" />
                    </div>
                </div>

                {/* Interaction Bar Skeleton */}
                <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-6 sm:gap-8">
                        <div className="h-5 w-12 bg-white/10 rounded" />
                        <div className="h-5 w-12 bg-white/10 rounded" />
                        <div className="h-5 w-8 bg-white/10 rounded" />
                    </div>
                    <div className="h-4 w-16 bg-white/10 rounded" />
                </div>
            </div>
        </article>
    );
};
