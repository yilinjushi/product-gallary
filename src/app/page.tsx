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

  useEffect(() => {
    async function load() {
      const data = await fetchProductsAction();
      setProducts(data);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <div className="flex h-screen w-screen items-center justify-center bg-transparent">
      <div className="animate-pulse text-white/50">正在加载产品...</div>
    </div>;
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
