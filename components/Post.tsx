import React, { useState } from 'react';
import { Heart, Share, BarChart2 } from 'lucide-react';
import { Product } from '../types';
import { formatRelativeTime } from '../utils/dateUtils';
import { supabase } from '../utils/supabaseClient';

interface PostProps {
    product: Product;
    onImageClick: (images: string[], index: number) => void;
}

export const Post: React.FC<PostProps> = ({ product, onImageClick }) => {
    const [isLiked, setIsLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(product.fav || 0);
    const [viewsCount, setViewsCount] = useState(product.views || 0);

    // Increment views once when post renders (in a real app, you might want more complex viewed-state logic)
    React.useEffect(() => {
        let isMounted = true;
        const incrementView = async () => {
            try {
                // To avoid multiple rapid calls, we optimistically update local state first
                const newViews = viewsCount + 1;
                if (isMounted) setViewsCount(newViews);
                // Call RPC to increment safely, or direct update (less safe for concurrency but works for simple case)
                await supabase.rpc('increment_views', { product_id: product.id });
                // We will add the RPC later, but if RPC doesn't exist, we can fallback to:
                // await supabase.from('products').update({ views: newViews }).eq('id', product.id);
            } catch (err) {
                console.error("Failed to increment views:", err);
            }
        };
        incrementView();

        return () => { isMounted = false; };
        // We only want this to run once on mount per product
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
            // Revert on failure
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



    // Pseudo views formatting (e.g., 2.1K)
    const formatCount = (count: number) => {
        if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
        return count.toString();
    };

    return (
        <article className="px-4 py-4 border-b border-gray-100/60 bg-white hover:bg-gray-50/50 transition-colors cursor-pointer flex">

            {/* Main Post Content */}
            <div className="flex-1 min-w-0 pb-1">

                {/* Text Content */}
                <div className="text-[15px] text-gray-900 leading-snug break-words mb-3">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <h2 className="font-bold text-[17px] tracking-tight">{product.title}</h2>
                        {product.tag && (
                            <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wide flex-shrink-0 mt-0.5">
                                {product.tag}
                            </span>
                        )}
                        <span className="text-gray-400 text-[13px] flex-shrink-0 ml-auto mt-0.5">
                            {formatRelativeTime(product.createdAt)}
                        </span>
                    </div>
                    <p className="whitespace-pre-line text-[#0f1419]">{product.description}</p>
                </div>

                {/* Media Attachments */}
                {product.images && product.images.length > 0 && (
                    <div className="mt-2 mb-3 rounded-2xl md:rounded-3xl overflow-hidden border border-gray-200/60">
                        {/* If there's 1 image, show big. If multiple, show grid. For simplicity and elegance, we show the first image optimally if there's only one, or a grid if 2+. Here we just show a prominent first image or a simple 2-col grid */}
                        {product.images.length === 1 ? (
                            <div
                                className="w-full relative aspect-[4/3] bg-gray-100 cursor-pointer overflow-hidden group"
                                onClick={(e) => { e.stopPropagation(); onImageClick(product.images, 0); }}
                            >
                                <img
                                    src={product.images[0]}
                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    alt={product.title}
                                    loading="lazy"
                                />
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-0.5 bg-gray-200/60">
                                {product.images.slice(0, 4).map((img, idx) => (
                                    <div
                                        key={idx}
                                        className={`relative bg-gray-100 cursor-pointer overflow-hidden group ${product.images.length === 3 && idx === 0 ? 'row-span-2 col-span-1' : 'aspect-square'} `}
                                        onClick={(e) => { e.stopPropagation(); onImageClick(product.images, idx); }}
                                    >
                                        <img
                                            src={img}
                                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                            alt=""
                                            loading="lazy"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Interaction Bar */}
                <div className="flex items-center gap-12 sm:gap-16 text-gray-500 mt-1" onClick={handleActionClick}>
                    <button
                        onClick={handleLike}
                        className={`flex items-center gap-2 group p-0 transition-colors ${isLiked ? 'text-pink-600' : 'hover:text-pink-600'}`}
                    >
                        <div className="p-2 rounded-full group-hover:bg-pink-50 transition-colors -ml-2">
                            <Heart size={18} fill={isLiked ? "currentColor" : "none"} strokeWidth={1.5} className={isLiked ? "animate-heart-bounce" : ""} />
                        </div>
                        <span className="text-[13px]">{formatCount(likesCount)}</span>
                    </button>

                    <button className="flex items-center gap-2 group p-0 transition-colors hover:text-blue-500">
                        <div className="p-2 rounded-full group-hover:bg-blue-50 transition-colors -ml-2">
                            <BarChart2 size={18} strokeWidth={1.5} />
                        </div>
                        <span className="text-[13px]">{formatCount(viewsCount)}</span>
                    </button>

                    <button
                        onClick={handleShare}
                        className="flex items-center group p-0 transition-colors hover:text-blue-500"
                        title="分享链接"
                    >
                        <div className="p-2 rounded-full group-hover:bg-blue-50 transition-colors -ml-2">
                            <Share size={18} strokeWidth={1.5} />
                        </div>
                    </button>
                </div>

            </div>
        </article>
    );
};
