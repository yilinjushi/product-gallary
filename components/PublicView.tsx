import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ArrowLeft, MoreHorizontal } from 'lucide-react';
import { Product } from '../types';
import { Post } from './Post';

interface PublicViewProps {
  products: Product[];
  onBackToAdmin: () => void;
}

export const PublicView: React.FC<PublicViewProps> = ({ products, onBackToAdmin }) => {
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Handle empty state
  if (products.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-6">
          <ShoppingBag size={24} className="text-gray-300" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">No Posts Yet</h2>
        <p className="text-gray-500 mb-6 text-center text-[15px]">When products are added to the inventory, they will appear here.</p>
        <button
          onClick={onBackToAdmin}
          className="bg-black text-white px-6 py-2 rounded-full font-bold text-[15px] hover:bg-gray-800 transition-colors"
        >
          Sign in to Admin
        </button>
      </div>
    );
  }

  // Ensure newest first (in case the query wasn't perfect, or for optimistic updates)
  const sortedProducts = [...products].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="min-h-screen bg-white flex justify-center font-sans tracking-tight">

      {/* Main Timeline Column */}
      <main className="w-full md:max-w-2xl border-x border-gray-100/60 min-h-screen flex flex-col relative sm:shadow-[0_0_15px_rgba(0,0,0,0.02)]">

        {/* Sticky Header */}
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100/60 py-3 px-4 flex items-center justify-between cursor-pointer">
          <div className="flex items-center gap-6">
            <h1 className="text-[20px] font-bold text-gray-900 tracking-tight">Home</h1>
          </div>
          <button
            onClick={onBackToAdmin}
            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-900"
            title="Admin Dashboard"
          >
            <MoreHorizontal size={20} />
          </button>
        </header>

        {/* New Item Composer (Mock) */}
        <div className="px-4 py-3 border-b border-gray-100/60 flex gap-4 hidden sm:flex">
          <div className="w-12 h-12 bg-gray-900 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold">L</div>
          <div className="flex-1 pt-2">
            <p className="text-xl text-gray-500 font-medium">What is happening?!</p>
            <div className="mt-4 border-t border-gray-100/60 pt-3 text-right">
              <button className="bg-blue-400 text-white font-bold px-4 py-1.5 rounded-full font-bold opacity-50 cursor-not-allowed">Post</button>
            </div>
          </div>
        </div>

        {/* Feed Posts */}
        <div className="flex-1 pb-20">
          {sortedProducts.map(product => (
            <Post
              key={product.id}
              product={product}
              onImageClick={(img) => setLightboxImage(img)}
            />
          ))}
        </div>

      </main>

      {/* Lightbox / Zoomed Image Overlay */}
      <AnimatePresence>
        {lightboxImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">

            {/* Dark Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/90 cursor-pointer pointer-events-auto"
              onClick={() => setLightboxImage(null)}
            />

            {/* Top Left Close/Back Button */}
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 left-4 p-2.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors z-50 pointer-events-auto"
            >
              <ArrowLeft size={24} />
            </button>

            {/* The Image itself */}
            <motion.div
              layoutId={`lightbox-${lightboxImage}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{
                type: "spring",
                damping: 25,
                stiffness: 300
              }}
              className="relative w-full h-full max-w-[100vw] max-h-[100vh] p-4 flex items-center justify-center pointer-events-none"
            >
              <img
                src={lightboxImage}
                alt="Zoomed product"
                className="max-w-full max-h-full object-contain pointer-events-auto drop-shadow-2xl rounded-sm"
                onClick={(e) => e.stopPropagation()} // Prevent click propagating to backdrop and closing
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
