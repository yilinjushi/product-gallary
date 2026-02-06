"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { useSwiperSlide } from "swiper/react";
import { Product } from "@/lib/db";

interface ProductCardProps {
    product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
    const [currentIdx, setCurrentIdx] = useState(0);
    const swiperSlide = useSwiperSlide();

    const handleSwitch = useCallback((idx: number, e: React.MouseEvent) => {
        if (swiperSlide.isActive) {
            e.stopPropagation();
            setCurrentIdx(idx);
        }
    }, [swiperSlide.isActive]);

    return (
        <div className="product-card group">
            <div className="card-content">
                <div
                    className="image-container relative isolate cursor-pointer"
                    onClick={(e) => {
                        if (product.images.length <= 1) return;
                        e.stopPropagation();
                        setCurrentIdx((prev) => (prev + 1) % product.images.length);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (product.images.length <= 1) return;
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setCurrentIdx((prev) => (prev + 1) % product.images.length);
                        }
                    }}
                    aria-label={product.images.length > 1 ? '点击切换下一张图片' : undefined}
                >
                    {/* All images stacked, fade between current and next */}
                    {product.images.map((img, idx) => (
                        <div
                            key={idx}
                            className={`img-inner absolute inset-0 transition-opacity duration-500 ease-in-out ${currentIdx === idx ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                        >
                            <Image
                                src={img}
                                alt={`${product.title} - ${idx + 1}`}
                                fill
                                sizes="(max-width: 768px) 300px, 500px"
                                className="object-contain"
                                priority={idx === 0}
                            />
                        </div>
                    ))}

                    {/* Tabs / Dots for switching */}
                    {product.images.length > 1 && (
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-20">
                            {product.images.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={(e) => handleSwitch(idx, e)}
                                    className={`w-2 h-2 rounded-full transition-all ${currentIdx === idx ? 'bg-white scale-125' : 'bg-white/40 hover:bg-white/60'}`}
                                    aria-label={`Switch to image ${idx + 1}`}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <div className="text-content">
                    <h2 className="product-title">{product.title}</h2>
                    <p className="product-desc">{product.description}</p>
                </div>
            </div>
        </div>
    );
}
