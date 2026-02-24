import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ArrowLeft, MoreHorizontal, X, Info, Mail } from 'lucide-react';
import { Product } from '../types';
import { Post } from './Post';

interface PublicViewProps {
  products: Product[];
  isLoading?: boolean;
  onBackToAdmin: () => void;
}

export const PublicView: React.FC<PublicViewProps> = ({ products, isLoading, onBackToAdmin }) => {
  const [lightboxData, setLightboxData] = useState<{ images: string[], currentIndex: number } | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [targetProductId, setTargetProductId] = useState<string | null>(null);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pid = params.get('product');
    if (pid) setTargetProductId(pid);
  }, []);

  // Handle loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-gray-100 border-t-black rounded-full animate-spin" />
          <p className="text-gray-400 text-sm font-medium">加载中...</p>
        </div>
      </div>
    );
  }

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
  let displayProducts = [...products].sort((a, b) => b.createdAt - a.createdAt);

  if (targetProductId) {
    const target = displayProducts.find(p => p.id === targetProductId);
    if (target) {
      displayProducts = [target];
    }
  }

  return (
    <div className="min-h-screen bg-white flex justify-center font-sans tracking-tight">

      {/* Main Timeline Column */}
      <main className="w-full md:max-w-2xl border-x border-gray-100/60 min-h-screen flex flex-col relative sm:shadow-[0_0_15px_rgba(0,0,0,0.02)]">

        {/* Sticky Header */}
        <header
          className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100/60 py-3 px-4 flex items-center justify-between cursor-pointer"
          onClick={() => {
            if (targetProductId) window.location.href = window.location.pathname;
          }}
        >
          <div className="flex items-center gap-3">
            {targetProductId && (
              <button
                onClick={(e) => { e.stopPropagation(); window.location.href = window.location.pathname; }}
                className="p-1.5 -ml-1 rounded-full hover:bg-gray-100 text-gray-700 transition-colors"
                title="查看所有产品"
              >
                <ArrowLeft size={20} className="text-gray-900" />
              </button>
            )}
            <div className="flex flex-col">
              <h1 className="text-[20px] font-bold text-gray-900 tracking-tight">先越科技</h1>
              <p className="text-[13px] text-gray-500">核心技术驱动，助力电子产品快速落地。</p>
            </div>
          </div>
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-900"
            >
              <MoreHorizontal size={20} />
            </button>

            <AnimatePresence>
              {isMenuOpen && (
                <>
                  {/* Invisible backdrop to close menu when clicking outside */}
                  <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 top-10 w-48 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden py-1 z-50 origin-top-right"
                  >
                    <button
                      onClick={() => { setShowAbout(true); setIsMenuOpen(false); }}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center space-x-3 transition-colors text-[15px] text-gray-700"
                    >
                      <Info size={18} />
                      <span>关于</span>
                    </button>
                    <button
                      onClick={() => { setShowContact(true); setIsMenuOpen(false); }}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center space-x-3 transition-colors text-[15px] text-gray-700"
                    >
                      <Mail size={18} />
                      <span>联系</span>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </header>

        {/* Feed Posts */}
        <div className="flex-1 pb-20">
          {displayProducts.map(product => (
            <Post
              key={product.id}
              product={product}
              onImageClick={(images, index) => setLightboxData({ images, currentIndex: index })}
            />
          ))}
        </div>

      </main>

      {/* --- About Modal --- */}
      <AnimatePresence>
        {showAbout && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAbout(false)}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl"
            >
              <button
                onClick={() => setShowAbout(false)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>

              <div className="mb-6">
                <span className="text-sm font-bold tracking-widest uppercase border-b border-black pb-1">关于我们</span>
              </div>

              <h2 className="text-2xl font-bold mb-4 text-gray-900">先越科技 (DEMO)</h2>
              <p className="text-gray-500 leading-relaxed text-[15px] mb-6">
                这是一家致力于通过核心技术驱动创新的科技企业。这里是关于公司的Demo介绍文字。真实的内容将在此展示我们的愿景、使命和技术实力。
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- Contact Modal --- */}
      <AnimatePresence>
        {showContact && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowContact(false)}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl"
            >
              <button
                onClick={() => setShowContact(false)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>

              <div className="mb-6">
                <span className="text-sm font-bold tracking-widest uppercase border-b border-black pb-1">联系我们</span>
              </div>

              <h2 className="text-2xl font-bold mb-4 text-gray-900">与我们合作 (DEMO)</h2>
              <p className="text-gray-500 leading-relaxed text-[15px] mb-6">
                如果您对我们的技术或产品感兴趣，请通过以下方式联系我们。这里是联系方式的Demo文本，如邮箱、电话等。
              </p>

              <div className="flex flex-col gap-2 text-sm text-gray-700 bg-gray-50 p-4 rounded-xl">
                <p>Email: contact@demo.com</p>
                <p>Phone: +86 100 0000 0000</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lightbox / Zoomed Image Overlay */}
      <AnimatePresence>
        {lightboxData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">

            {/* Dark Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/95 cursor-pointer pointer-events-auto"
              onClick={() => setLightboxData(null)}
            />

            <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden pointer-events-none select-none p-4">
              <AnimatePresence mode="wait">
                <motion.img
                  key={lightboxData.currentIndex}
                  src={lightboxData.images[lightboxData.currentIndex]}
                  alt="Zoomed product"
                  className="max-w-full max-h-[85vh] object-contain shadow-2xl pointer-events-auto cursor-grab active:cursor-grabbing rounded-xl z-50"
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={1}
                  onDragEnd={(_, { offset }) => {
                    const swipe = offset.x;
                    if (swipe < -50 && lightboxData.currentIndex < lightboxData.images.length - 1) {
                      setLightboxData({ ...lightboxData, currentIndex: lightboxData.currentIndex + 1 });
                    } else if (swipe > 50 && lightboxData.currentIndex > 0) {
                      setLightboxData({ ...lightboxData, currentIndex: lightboxData.currentIndex - 1 });
                    }
                  }}
                  onClick={() => setLightboxData(null)}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              </AnimatePresence>

              {/* Pagination Dots */}
              {lightboxData.images.length > 1 && (
                <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-2 z-50 pointer-events-none">
                  {lightboxData.images.map((_, i) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === lightboxData.currentIndex ? 'bg-white' : 'bg-white/30'}`} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </AnimatePresence>

    </div >
  );
};
