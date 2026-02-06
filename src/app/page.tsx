"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCoverflow, Pagination } from "swiper/modules";

// Import Swiper styles
import "swiper/css";
import "swiper/css/effect-coverflow";
import "swiper/css/pagination";

import { useEffect, useState } from "react";
import { fetchProductsAction } from "@/lib/actions";
import { Product } from "@/lib/db";
import ProductCard from "@/components/ProductCard";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchProductsAction();
        setProducts(Array.isArray(data) ? data : []);
      } catch (e) {
        setProducts([]);
        setError(e instanceof Error ? e.message : "加载失败");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[var(--bg-color)]">
        <div className="animate-pulse text-white/50">正在加载产品...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[var(--bg-color)]">
        <div className="text-center text-white/80">
          <p className="mb-2">加载失败</p>
          <p className="text-sm text-white/50">{error}</p>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[var(--bg-color)]">
        <div className="text-center text-white/60">暂无产品数据</div>
      </div>
    );
  }

  return (
    <main className="flex h-screen w-screen items-center justify-center overflow-hidden">
      <div className="w-full flex items-center justify-center">
        <Swiper
          effect={"coverflow"}
          grabCursor={true}
          centeredSlides={true}
          slidesPerView={"auto"}
          slideToClickedSlide={true}
          coverflowEffect={{
            rotate: 20,
            stretch: -20,
            depth: 150,
            modifier: 1,
            slideShadows: true,
          }}
          pagination={{
            clickable: true,
          }}
          modules={[EffectCoverflow, Pagination]}
          className="mySwiper w-full"
        >
          {products.map((product) => (
            <SwiperSlide key={product.id}>
              <ProductCard product={product} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </main>
  );
}
