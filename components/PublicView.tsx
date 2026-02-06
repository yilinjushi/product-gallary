import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ShoppingBag, Menu, X, FileText, LayoutDashboard } from 'lucide-react';
import { Product } from '../types';

interface PublicViewProps {
  products: Product[];
  onBackToAdmin: () => void;
}

// Wrap helper for infinite loop
const wrap = (min: number, max: number, v: number) => {
  const rangeSize = max - min;
  return ((((v - min) % rangeSize) + rangeSize) % rangeSize) + min;
};

const swipeConfidenceThreshold = 10000;
const swipePower = (offset: number, velocity: number) => {
  return Math.abs(offset) * velocity;
};

export const PublicView: React.FC<PublicViewProps> = ({ products, onBackToAdmin }) => {
  const [[page, direction], setPage] = useState([0, 0]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  
  // Menu States
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  // Reset image index when product page changes
  useEffect(() => {
    setActiveImageIndex(0);
  }, [page]);

  // Handle empty state
  if (products.length === 0) {
    return (
      <div className="h-screen w-full bg-white flex flex-col items-center justify-center p-8">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-6">
          <ShoppingBag size={24} className="text-gray-300" />
        </div>
        <h2 className="text-xl font-light text-gray-900 mb-2">Collection Empty</h2>
        <button 
          onClick={onBackToAdmin}
          className="mt-6 text-sm text-gray-500 hover:text-black transition-colors underline underline-offset-4"
        >
          Sign in to Admin to add products
        </button>
      </div>
    );
  }

  const productIndex = wrap(0, products.length, page);
  const currentProduct = products[productIndex];
  
  // Safe image access
  const currentImage = currentProduct.images.length > 0 
    ? currentProduct.images[activeImageIndex % currentProduct.images.length] 
    : undefined;

  const paginate = (newDirection: number) => {
    setPage([page + newDirection, newDirection]);
  };

  const cycleImage = () => {
    if (currentProduct.images.length > 1) {
      setActiveImageIndex(prev => (prev + 1) % currentProduct.images.length);
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
      scale: 0.95
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0,
      scale: 0.95
    })
  };

  return (
    <div className="fixed inset-0 bg-white text-gray-900 overflow-hidden font-sans select-none">
      
      {/* --- Top Left Menu --- */}
      <div className="absolute top-6 left-6 z-50">
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-3 bg-white/80 backdrop-blur-md rounded-full hover:bg-white shadow-sm hover:shadow-md transition-all border border-gray-100 group"
        >
          <Menu size={20} className="text-gray-700 group-hover:text-black" />
        </button>

        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute top-14 left-0 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden py-2 origin-top-left"
            >
              <button 
                onClick={() => {
                  setShowAbout(true);
                  setIsMenuOpen(false);
                }}
                className="w-full text-left px-5 py-3 hover:bg-gray-50 flex items-center space-x-3 transition-colors text-sm font-medium text-gray-700"
              >
                <FileText size={16} />
                <span>关于</span>
              </button>
              
              <div className="h-px bg-gray-100 mx-4 my-1" />
              
              <button 
                onClick={() => {
                  onBackToAdmin();
                  setIsMenuOpen(false);
                }}
                className="w-full text-left px-5 py-3 hover:bg-gray-50 flex items-center space-x-3 transition-colors text-sm font-medium text-gray-700"
              >
                <LayoutDashboard size={16} />
                <span>管理</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
              className="relative bg-white w-full max-w-md p-8 md:p-10 rounded-3xl shadow-2xl"
            >
              <button 
                onClick={() => setShowAbout(false)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              
              <div className="mb-6">
                <span className="text-sm font-bold tracking-widest uppercase border-b border-black pb-1">Luxe. Studio</span>
              </div>
              
              <h2 className="text-2xl font-light mb-4 text-gray-900">Curating Modern Aesthetics.</h2>
              <p className="text-gray-500 leading-relaxed text-sm mb-6">
                Established in 2024, Luxe is dedicated to bringing the finest minimalist furniture designs to your digital space. We believe that good design is as little design as possible.
              </p>
              
              <div className="flex flex-col gap-2 text-xs text-gray-400">
                <p>Version 1.0.0</p>
                <p>© 2024 Luxe Inc. All rights reserved.</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- Main Content Area --- */}
      <div className="w-full h-full flex flex-col md:flex-row relative">
        
        {/* Background Number (Decorative) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[20vw] font-bold text-gray-50 pointer-events-none select-none">
          {productIndex + 1 < 10 ? `0${productIndex + 1}` : productIndex + 1}
        </div>

        {/* Carousel Container */}
        <div className="relative w-full h-full flex items-center justify-center">
          <AnimatePresence initial={false} custom={direction} mode='popLayout'>
            <motion.div
              key={page}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 }
              }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={1}
              onDragEnd={(e, { offset, velocity }) => {
                const swipe = swipePower(offset.x, velocity.x);
                if (swipe < -swipeConfidenceThreshold) {
                  paginate(1);
                } else if (swipe > swipeConfidenceThreshold) {
                  paginate(-1);
                }
              }}
              className="absolute w-full h-full md:w-3/4 md:h-3/4 flex flex-col md:flex-row items-center justify-center p-4 md:p-6 cursor-grab active:cursor-grabbing"
            >
              {/* 产品卡片：边框 + 阴影，统一包住图片与文案 */}
              <div className="w-full max-w-4xl bg-white rounded-2xl border border-gray-200 shadow-xl shadow-gray-200/60 overflow-hidden flex flex-col md:flex-row md:min-h-0 flex-1 md:flex-initial md:max-h-full">
                {/* 图片区 - 点击切换多图 */}
                <div
                  className="w-full md:w-1/2 aspect-[4/3] md:aspect-auto md:min-h-[320px] bg-gray-100 relative overflow-hidden cursor-pointer flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    cycleImage();
                  }}
                >
                  {currentImage ? (
                    <motion.img
                      key={`${currentProduct.id}-${activeImageIndex}`}
                      initial={{ opacity: 0.8 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      src={currentImage}
                      alt={currentProduct.title}
                      className="w-full h-full object-cover pointer-events-none"
                      draggable={false}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <ShoppingBag size={48} />
                    </div>
                  )}
                  {currentProduct.images.length > 1 && (
                    <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
                      {currentProduct.images.map((_, idx) => (
                        <div
                          key={idx}
                          className={`rounded-full transition-all ${idx === activeImageIndex % currentProduct.images.length ? 'w-5 h-1.5 md:w-6 md:h-1.5 bg-gray-900' : 'w-1.5 h-1.5 md:w-2 md:h-2 bg-white/80'}`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* 文案区 */}
                <div className="w-full md:w-1/2 flex flex-col justify-center p-5 md:p-8 md:pl-10 text-left">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="h-px w-8 bg-gray-900" />
                      <span className="text-xs font-semibold tracking-widest uppercase text-gray-500">
                        {currentProduct.tag || 'New Arrival'}
                      </span>
                    </div>
                    <h1 className="text-2xl md:text-4xl font-light leading-tight mb-4 text-gray-900">
                      {currentProduct.title}
                    </h1>
                    <div className="text-sm md:text-base text-gray-500 leading-relaxed max-w-md whitespace-pre-line">
                      {currentProduct.description}
                    </div>
                  </motion.div>
                </div>
              </div>

            </motion.div>
          </AnimatePresence>
        </div>

        {/* 底部导航：手机端加大圆点、提高对比度并留出安全区，保证可见可点 */}
        <div className="absolute bottom-4 md:bottom-8 left-0 right-0 flex justify-between items-center px-4 md:px-8 pb-[env(safe-area-inset-bottom)] z-20 pointer-events-none">
          <div className="flex items-center gap-2 md:gap-3 py-2 px-3 rounded-full bg-white/90 backdrop-blur-sm border border-gray-200/80 shadow-sm pointer-events-auto">
            {products.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  const diff = idx - productIndex;
                  if (diff !== 0) paginate(diff);
                }}
                className={`transition-all duration-300 rounded-full flex-shrink-0 ${
                  idx === productIndex ? 'w-6 h-2 md:w-8 md:h-1.5 bg-gray-900' : 'w-2 h-2 md:w-2 md:h-2 bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`查看第 ${idx + 1} 个产品`}
              />
            ))}
          </div>
          <div className="flex items-center gap-1 md:gap-2 pointer-events-auto">
            <button
              onClick={() => paginate(-1)}
              disabled={productIndex === 0}
              className="p-2.5 md:p-3 rounded-full border border-gray-200 bg-white/90 backdrop-blur-sm shadow-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="上一个产品"
            >
              <ChevronLeft size={22} className="text-gray-600 md:w-5 md:h-5" />
            </button>
            <button
              onClick={() => paginate(1)}
              disabled={productIndex === products.length - 1}
              className="p-2.5 md:p-3 rounded-full border border-gray-200 bg-white/90 backdrop-blur-sm shadow-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="下一个产品"
            >
              <ChevronRight size={22} className="text-gray-600 md:w-5 md:h-5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
