import React, { useState, useRef } from 'react';
import { Heart, Share, BarChart2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Product } from '../types';
import { supabase } from '../utils/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

interface PostProps {
    product: Product;
}

// Transform Supabase Storage URLs to use image rendering with resize + WebP
const getOptimizedImageUrl = (url: string, width: number = 600): string => {
    // Only transform Supabase storage URLs
    if (url.includes('/storage/v1/object/public/')) {
        return url.replace(
            '/storage/v1/object/public/',
            `/storage/v1/render/image/public/`
        ) + `?width=${width}&quality=80`;
    }
    return url;
};

export const Post: React.FC<PostProps> = ({ product }) => {
    const [isLiked, setIsLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(product.fav || 0);
    const [viewsCount, setViewsCount] = useState(product.views || 0);
    const [activeIndex, setActiveIndex] = useState(0);
    const [showHeartOverlay, setShowHeartOverlay] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const lastTapRef = useRef<number>(0);

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

    const toggleLike = async () => {
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

    const handleLikeClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        toggleLike();
    };

    const handleImageTap = (e: React.MouseEvent) => {
        e.stopPropagation();
        const now = Date.now();
        const DOUBLE_TAP_DELAY = 300;

        if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
            setShowHeartOverlay(true);
            if (!isLiked) {
                toggleLike();
            }
            setTimeout(() => setShowHeartOverlay(false), 800);
            lastTapRef.current = 0;
        } else {
            lastTapRef.current = now;
        }
    };

    const handleActionClick = () => {
        // Events are stopped individually by child buttons
    };

    const handleShare = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const shareUrl = `${window.location.origin}/?product=${product.id}`;

        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        if (isMobile && navigator.share) {
            try {
                await navigator.share({
                    title: `先越科技 - ${product.title}`,
                    text: product.description.slice(0, 100) + '...',
                    url: shareUrl,
                });
            } catch (err) {
                console.log("分享操作已取消或失败: ", err);
            }
        } else {
            navigator.clipboard.writeText(shareUrl).then(() => {
                alert("已复制链接");
            }).catch(err => {
                console.error("复制链接失败: ", err);
            });
        }
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
        <article className="py-6 border-b-2 transition-colors cursor-default flex flex-col h-full" style={{ borderColor: 'var(--border-strong)', backgroundColor: 'var(--bg-primary)', contentVisibility: 'auto', containIntrinsicSize: 'auto 500px' } as React.CSSProperties}>

            {/* Media Attachments (Full Width Area) */}
            {product.images && product.images.length > 0 && (
                <div className="group/carousel relative w-full aspect-video overflow-hidden mb-5 sm:rounded-2xl mx-0 sm:mx-4 sm:w-[calc(100%-2rem)]" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                    <div
                        ref={scrollRef}
                        onScroll={handleScroll}
                        className="flex overflow-x-auto snap-x snap-mandatory w-full h-full hide-scrollbar"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {product.images.map((img, idx) => (
                            <div key={idx} className="w-full h-full flex-shrink-0 snap-center relative cursor-pointer" style={{ backgroundColor: 'var(--bg-card)' }} onClick={handleImageTap}>
                                <img
                                    src={getOptimizedImageUrl(img, window.innerWidth > 768 ? 800 : 600)}
                                    className="absolute inset-0 w-full h-full object-cover select-none"
                                    alt={product.title}
                                    loading="lazy"
                                    decoding="async"
                                />
                            </div>
                        ))}
                    </div>

                    {/* Tag Badge - Top Left */}
                    {product.tag && (
                        <div className="absolute top-3 left-3 z-10">
                            <span className="backdrop-blur-md text-amber-500 text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-sm uppercase tracking-wide" style={{ backgroundColor: 'var(--tag-bg)', border: '1px solid var(--tag-border)' }}>
                                {product.tag}
                            </span>
                        </div>
                    )}

                    {/* Like Button - Top Right */}
                    <div className="absolute top-3 right-3 z-10">
                        <button
                            onClick={handleLikeClick}
                            className={`w-9 h-9 rounded-full flex items-center justify-center shadow-sm transition-colors pointer-events-auto ${isLiked ? 'bg-amber-500 text-white border border-transparent' : 'backdrop-blur-md text-white hover:text-amber-500'}`}
                            style={!isLiked ? { backgroundColor: 'var(--like-btn-bg)', border: '1px solid var(--like-btn-border)' } : undefined}
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
                                    className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full backdrop-blur-md shadow items-center justify-center text-white transition-all opacity-0 group-hover/carousel:opacity-100 pointer-events-auto"
                                    style={{ backgroundColor: 'var(--arrow-bg)', border: '1px solid var(--like-btn-border)' }}
                                >
                                    <ChevronLeft size={18} />
                                </button>
                            )}
                            {activeIndex < product.images.length - 1 && (
                                <button
                                    onClick={() => scrollToIndex(activeIndex + 1)}
                                    className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full backdrop-blur-md shadow items-center justify-center text-white transition-all opacity-0 group-hover/carousel:opacity-100 pointer-events-auto"
                                    style={{ backgroundColor: 'var(--arrow-bg)', border: '1px solid var(--like-btn-border)' }}
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
                                <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === activeIndex ? 'w-4 bg-white shadow-[0_0_2px_rgba(0,0,0,0.5)]' : 'w-1.5 bg-white/40 shadow-[0_0_2px_rgba(0,0,0,0.3)]'}`} />
                            ))}
                        </div>
                    )}

                    {/* Double Tap Heart Overlay */}
                    <AnimatePresence>
                        {showHeartOverlay && (
                            <motion.div
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: [0.5, 1.3, 1], opacity: [0, 1, 0] }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
                            >
                                <Heart size={100} fill="white" className="text-white drop-shadow-2xl" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Content Area */}
            <div
                className="min-w-0"
                style={{
                    paddingLeft: 'max(1.5rem, env(safe-area-inset-left))',
                    paddingRight: 'max(1.5rem, env(safe-area-inset-right))'
                }}
            >

                {/* Text Content */}
                <div className="text-[15px] leading-snug break-words mb-4" style={{ color: 'var(--text-secondary)' }}>
                    <h2 className="font-bold text-[22px] sm:text-[24px] tracking-tight leading-tight mb-2.5" style={{ color: 'var(--text-primary)' }}>{product.title}</h2>
                    <p className="whitespace-pre-line leading-relaxed text-[15px]" style={{ color: 'var(--text-description)' }}>{product.description}</p>
                </div>

                {/* Interaction Bar & Meta */}
                <div className="flex flex-wrap items-center justify-between mt-2" style={{ color: 'var(--text-muted)' }} onClick={handleActionClick}>

                    <div className="flex items-center gap-6 sm:gap-8">
                        <button onClick={handleLikeClick} className={`flex items-center gap-1.5 text-[14px] font-medium transition-colors cursor-pointer ${isLiked ? 'text-amber-500' : 'hover:text-amber-500'}`} style={!isLiked ? { color: 'var(--text-muted)' } : undefined}>
                            <Heart size={16} fill={isLiked ? "currentColor" : "none"} strokeWidth={1.5} />
                            {formatCount(likesCount)}
                        </button>

                        <div className="flex items-center gap-2 p-0 cursor-default" style={{ color: 'var(--text-muted)' }}>
                            <div className="p-2 -ml-2">
                                <BarChart2 size={20} strokeWidth={1.5} />
                            </div>
                            <span className="text-[14px] font-medium">{formatCount(viewsCount)}</span>
                        </div>

                        <button
                            onClick={handleShare}
                            className="flex items-center gap-2 group p-0 transition-colors hover:text-amber-500"
                            style={{ color: 'var(--text-muted)' }}
                            title="分享链接"
                        >
                            <div className="p-2 rounded-full transition-colors -ml-2">
                                <Share size={18} strokeWidth={1.5} />
                            </div>
                        </button>
                    </div>


                </div>
            </div>

        </article>
    );
};
