import React, { useState, useRef } from 'react';
import { Heart, Share, BarChart2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Product } from '../types';
import { formatRelativeTime } from '../utils/dateUtils';
import { supabase } from '../utils/supabaseClient';

interface PostProps {
    product: Product;
}

export const Post: React.FC<PostProps> = ({ product }) => {
    const [isLiked, setIsLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(product.fav || 0);
    const [viewsCount, setViewsCount] = useState(product.views || 0);
    const [activeIndex, setActiveIndex] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Increment views once when post renders
    React.useEffect(() => {
        let isMounted = true;
        const incrementView = async () => {
            try {
                const newViews = viewsCount + 1;
                if (isMounted) setViewsCount(newViews);
                await supabase.rpc('increment_views', { product_id: product.id });
            } catch (err) {
                console.error("Failed to increment views:", err);
            }
        };
        incrementView();

        return () => { isMounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [product.id]);

    const handleLike = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const newLikedState = !isLiked;
        setIsLiked(newLikedState);

        const change = newLikedState ? 1 : -1;
        const newLikesCount = Math.max(0, likesCount + change);
        setLikesCount(newLikesCount);

        try {
            const { error } = await supabase.rpc('increment_fav', {
                product_id: product.id,
                amount: change
            });
            if (error) throw error;
        } catch (err) {
            console.error("Failed to update likes:", err);
            setIsLiked(!newLikedState);
            setLikesCount(likesCount);
        }
    };

    const handleActionClick = () => {
        // Events are stopped individually by child buttons
    };

    const handleShare = (e: React.MouseEvent) => {
        e.stopPropagation();
        const url = `${window.location.origin}${window.location.pathname}?product=${product.id}`;
        navigator.clipboard.writeText(url).then(() => {
            alert("产品链接已复制到剪贴板！");
        }).catch(err => {
            console.error("复制链接失败: ", err);
        });
    };

    const formatCount = (count: number) => {
        if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
        return count.toString();
    };

    const handleScroll = () => {
        if (!scrollRef.current) return;
        const { scrollLeft, clientWidth } = scrollRef.current;
        const index = Math.round(scrollLeft / clientWidth);
        if (index !== activeIndex) {
            setActiveIndex(index);
        }
    };

    const scrollToIndex = (index: number) => {
        if (!scrollRef.current) return;
        const clamped = Math.max(0, Math.min(index, product.images.length - 1));
        scrollRef.current.scrollTo({ left: clamped * scrollRef.current.clientWidth, behavior: 'smooth' });
    };

    return (
        <article className="py-6 border-b border-white/5 bg-black hover:bg-[#0a0a0a] transition-colors cursor-default block">

            {/* Media Attachments (Full Width Area) */}
            {product.images && product.images.length > 0 && (
                <div className="group/carousel relative w-full aspect-video bg-[#1a1a1a] overflow-hidden mb-5 sm:rounded-2xl mx-0 sm:mx-4 sm:w-[calc(100%-2rem)] border border-white/5">
                    <div
                        ref={scrollRef}
                        onScroll={handleScroll}
                        className="flex overflow-x-auto snap-x snap-mandatory w-full h-full hide-scrollbar"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {product.images.map((img, idx) => (
                            <div key={idx} className="w-full h-full flex-shrink-0 snap-center relative bg-[#1a1a1a]">
                                <img
                                    src={img}
                                    className="absolute inset-0 w-full h-full object-cover"
                                    alt={product.title}
                                    loading="lazy"
                                />
                            </div>
                        ))}
                    </div>

                    {/* Tag Badge - Top Left */}
                    {product.tag && (
                        <div className="absolute top-3 left-3 z-10">
                            <span className="bg-black/60 backdrop-blur-md text-amber-500 border border-white/10 text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-sm uppercase tracking-wide">
                                {product.tag}
                            </span>
                        </div>
                    )}

                    {/* Like Button - Top Right */}
                    <div className="absolute top-3 right-3 z-10">
                        <button
                            onClick={handleLike}
                            className={`w-9 h-9 rounded-full flex items-center justify-center shadow-sm transition-colors pointer-events-auto ${isLiked ? 'bg-pink-600 text-white' : 'bg-black/50 backdrop-blur-md text-white hover:text-pink-500 border border-white/10'}`}
                        >
                            <Heart size={18} fill={isLiked ? "currentColor" : "none"} strokeWidth={1.8} className={isLiked ? "animate-heart-bounce" : ""} />
                        </button>
                    </div>

                    {/* Desktop Arrow Buttons */}
                    {product.images.length > 1 && (
                        <>
                            {activeIndex > 0 && (
                                <button
                                    onClick={() => scrollToIndex(activeIndex - 1)}
                                    className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/50 backdrop-blur-md border border-white/10 shadow items-center justify-center text-white hover:bg-black/80 transition-all opacity-0 group-hover/carousel:opacity-100 pointer-events-auto"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                            )}
                            {activeIndex < product.images.length - 1 && (
                                <button
                                    onClick={() => scrollToIndex(activeIndex + 1)}
                                    className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/50 backdrop-blur-md border border-white/10 shadow items-center justify-center text-white hover:bg-black/80 transition-all opacity-0 group-hover/carousel:opacity-100 pointer-events-auto"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            )}
                        </>
                    )}

                    {/* Pagination Dots */}
                    {product.images.length > 1 && (
                        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10 pointer-events-none">
                            {product.images.map((_, i) => (
                                <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === activeIndex ? 'bg-white shadow-[0_0_2px_rgba(0,0,0,0.5)]' : 'bg-white/40 shadow-[0_0_2px_rgba(0,0,0,0.3)]'}`} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Content Area */}
            <div className="px-5 min-w-0">

                {/* Text Content */}
                <div className="text-[15px] text-gray-200 leading-snug break-words mb-4">
                    <h2 className="font-bold text-[22px] sm:text-[24px] tracking-tight leading-tight mb-2.5 text-white">{product.title}</h2>
                    <p className="whitespace-pre-line text-gray-400 leading-relaxed text-[16px]">{product.description}</p>
                </div>

                {/* Interaction Bar & Meta */}
                <div className="flex flex-wrap items-center justify-between text-gray-400 mt-2" onClick={handleActionClick}>

                    <div className="flex items-center gap-6 sm:gap-8">
                        <button onClick={handleLike} className={`flex items-center gap-1.5 text-[14px] font-medium transition-colors cursor-pointer ${isLiked ? 'text-pink-500' : 'text-gray-400 hover:text-pink-400'}`}>
                            <Heart size={16} fill={isLiked ? "currentColor" : "none"} strokeWidth={1.5} />
                            {formatCount(likesCount)}
                        </button>

                        <button className="flex items-center gap-2 group p-0 transition-colors text-gray-400 hover:text-blue-400">
                            <div className="p-2 rounded-full group-hover:bg-white/5 transition-colors -ml-2 cursor-default">
                                <BarChart2 size={20} strokeWidth={1.5} />
                            </div>
                            <span className="text-[14px] font-medium">{formatCount(viewsCount)}</span>
                        </button>

                        <button
                            onClick={handleShare}
                            className="flex items-center gap-2 group p-0 transition-colors text-gray-400 hover:text-green-400"
                            title="分享链接"
                        >
                            <div className="p-2 rounded-full group-hover:bg-white/5 transition-colors -ml-2">
                                <Share size={18} strokeWidth={1.5} />
                            </div>
                        </button>
                    </div>

                    <div className="flex items-center gap-2 text-[13px] text-gray-500 font-medium whitespace-nowrap">
                        <span>{formatRelativeTime(product.createdAt)}</span>
                    </div>

                </div>
            </div>

        </article>
    );
};
