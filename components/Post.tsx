import React, { useState, useRef } from 'react';
import { Heart, Share, BarChart2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Product } from '../types';
import { formatRelativeTime } from '../utils/dateUtils';
import { supabase } from '../utils/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { MagneticButton } from './MagneticButton';

interface PostProps {
    product: Product;
}

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
        <article className="py-6 border-b-2 border-white/20 bg-black hover:bg-[#0a0a0a] transition-colors cursor-default block">

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
                            <div key={idx} className="w-full h-full flex-shrink-0 snap-center relative bg-[#1a1a1a] cursor-pointer" onClick={handleImageTap}>
                                <img
                                    src={img}
                                    className="absolute inset-0 w-full h-full object-cover select-none"
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
                            onClick={handleLikeClick}
                            className={`w-9 h-9 rounded-full flex items-center justify-center shadow-sm transition-colors pointer-events-auto ${isLiked ? 'bg-amber-500 text-white border border-transparent' : 'bg-black/50 backdrop-blur-md text-white hover:text-amber-500 border border-white/10'}`}
                        >
                            <Heart size={18} fill={isLiked ? "currentColor" : "none"} strokeWidth={1.8} className={isLiked ? "animate-heart-bounce" : ""} />
                        </button>
                    </div>

                    {/* Desktop Arrow Buttons */}
                    {product.images.length > 1 && (
                        <>
                            {activeIndex > 0 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); scrollToIndex(activeIndex - 1); }}
                                    className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/50 backdrop-blur-md border border-white/10 shadow items-center justify-center text-white hover:bg-black/80 transition-all opacity-0 group-hover/carousel:opacity-100 pointer-events-auto"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                            )}
                            {activeIndex < product.images.length - 1 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); scrollToIndex(activeIndex + 1); }}
                                    className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/50 backdrop-blur-md border border-white/10 shadow items-center justify-center text-white hover:bg-black/80 transition-all opacity-0 group-hover/carousel:opacity-100 pointer-events-auto"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            )}
                        </>
                    )}

                    {/* Story-style Progress Line */}
                    {product.images.length > 1 && (
                        <div className="absolute bottom-3 left-3 right-3 flex gap-1 z-10 pointer-events-none">
                            {product.images.map((_, i) => (
                                <div key={i} className="h-[2px] rounded-full overflow-hidden flex-1 bg-white/20 select-none shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                                    {i === activeIndex && (
                                        <motion.div
                                            className="h-full bg-white w-full shadow-sm"
                                            initial={{ scaleX: 0, originX: 0 }}
                                            animate={{ scaleX: 1 }}
                                            transition={{ duration: 0.2, ease: "easeOut" }}
                                        />
                                    )}
                                    {i < activeIndex && (
                                        <div className="h-full bg-white w-full" />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Double Tap Heart Overlay */}
                    <AnimatePresence>
                        {showHeartOverlay && (
                            <motion.div
                                initial={{ scale: 0.5, opacity: 0, y: 0, rotate: 0 }}
                                animate={{
                                    scale: [0.5, 1.4, 1.1],
                                    opacity: [0, 1, 0],
                                    y: [0, -10, -30],
                                    rotate: [-10, 15, -5]
                                }}
                                transition={{
                                    duration: 0.9,
                                    times: [0, 0.4, 1],
                                    ease: ["easeOut", "easeInOut"]
                                }}
                                className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
                            >
                                <Heart size={100} fill="white" className="text-white drop-shadow-[0_10px_35px_rgba(255,255,255,0.4)]" />
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
                <div className="text-[15px] text-gray-200 leading-snug break-words mb-4">
                    <h2 className="font-bold text-[22px] sm:text-[24px] tracking-tight leading-tight mb-2.5 text-white">{product.title}</h2>
                    <p className="whitespace-pre-line text-gray-300 leading-relaxed text-[15px]">{product.description}</p>
                </div>

                {/* Interaction Bar & Meta */}
                <div className="flex flex-wrap items-center justify-between text-gray-400 mt-2" onClick={handleActionClick}>

                    <div className="flex items-center gap-5 sm:gap-7">
                        <MagneticButton onClick={handleLikeClick} intensity={0.4} className={`flex items-center gap-1.5 text-[14px] font-medium transition-colors cursor-pointer ${isLiked ? 'text-amber-500' : 'text-gray-400 hover:text-white'}`}>
                            <Heart size={16} fill={isLiked ? "currentColor" : "none"} strokeWidth={1.5} />
                            {formatCount(likesCount)}
                        </MagneticButton>

                        <MagneticButton intensity={0.2} className="flex items-center gap-2 text-gray-400 p-0 cursor-default hover:text-white transition-colors">
                            <div className="p-2 -ml-2">
                                <BarChart2 size={20} strokeWidth={1.5} />
                            </div>
                            <span className="text-[14px] font-medium">{formatCount(viewsCount)}</span>
                        </MagneticButton>

                        <div className="relative z-10">
                            <MagneticButton
                                onClick={handleShare}
                                intensity={0.6}
                                className="flex items-center gap-2 group p-0 transition-colors text-gray-400 hover:text-white"
                                title="分享链接"
                            >
                                <div className="p-2 rounded-full group-hover:bg-white/10 transition-colors -ml-2">
                                    <Share size={18} strokeWidth={1.5} />
                                </div>
                            </MagneticButton>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-[13px] text-gray-400 font-medium whitespace-nowrap">
                        <span>{formatRelativeTime(product.createdAt)}</span>
                    </div>

                </div>
            </div>

        </article>
    );
};
