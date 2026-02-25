import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ArrowLeft, MoreHorizontal, Info, Mail } from 'lucide-react';
import { Product, SiteSettings } from '../types';
import { Post } from './Post';
import { AboutModal } from './AboutModal';
import { ContactModal } from './ContactModal';

interface PublicViewProps {
  products: Product[];
  isLoading?: boolean;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  onBackToAdmin: () => void;
  settings?: SiteSettings | null;
}

export const PublicView: React.FC<PublicViewProps> = ({ products, isLoading, hasMore, isLoadingMore, onLoadMore, onBackToAdmin, settings }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [targetProductId, setTargetProductId] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pid = params.get('product');
    if (pid) setTargetProductId(pid);
  }, []);

  // IntersectionObserver for infinite scroll
  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const target = entries[0];
    if (target.isIntersecting && hasMore && !isLoadingMore && !targetProductId && onLoadMore) {
      onLoadMore();
    }
  }, [hasMore, isLoadingMore, targetProductId, onLoadMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(handleObserver, { rootMargin: '100px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleObserver]);

  // Handle loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-white/10 border-t-white rounded-full animate-spin" />
          <p className="text-gray-400 text-sm font-medium">加载中...</p>
        </div>
      </div>
    );
  }

  // Handle empty state
  if (products.length === 0) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8">
        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6">
          <ShoppingBag size={24} className="text-gray-600" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">No Posts Yet</h2>
        <p className="text-gray-400 mb-6 text-center text-[15px]">When products are added to the inventory, they will appear here.</p>
        <button
          onClick={onBackToAdmin}
          className="bg-white text-black px-6 py-2 rounded-full font-bold text-[15px] hover:bg-gray-200 transition-colors"
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
    <div className="min-h-screen bg-black flex justify-center font-sans tracking-tight">

      {/* Main Timeline Column */}
      <main className="w-full md:max-w-2xl border-x border-white/5 min-h-screen flex flex-col relative sm:shadow-none">

        {/* Sticky Header */}
        <header
          className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/5 py-3 px-4 flex items-center justify-between cursor-pointer"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
          onClick={() => {
            if (targetProductId) window.location.href = window.location.pathname;
          }}
        >
          <div className="flex items-center gap-3">
            {targetProductId && (
              <button
                onClick={(e) => { e.stopPropagation(); window.location.href = window.location.pathname; }}
                className="p-1.5 -ml-1 rounded-full hover:bg-white/10 text-gray-300 transition-colors"
                title="查看所有产品"
              >
                <ArrowLeft size={20} className="text-white" />
              </button>
            )}
            <div className="flex flex-col">
              <h1 className="text-[20px] font-bold text-white tracking-tight">先越科技</h1>
              <p className="text-[13px] text-gray-400">核心技术驱动，助力电子产品快速落地。</p>
            </div>
          </div>
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-white"
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
                    className="absolute right-0 top-10 w-48 bg-[#1a1a1a] rounded-xl shadow-2xl border border-white/10 overflow-hidden py-1 z-50 origin-top-right"
                  >
                    <button
                      onClick={() => { setShowAbout(true); setIsMenuOpen(false); }}
                      className="w-full text-left px-4 py-2.5 hover:bg-white/5 flex items-center space-x-3 transition-colors text-[15px] text-gray-200"
                    >
                      <Info size={18} />
                      <span>关于</span>
                    </button>
                    <button
                      onClick={() => { setShowContact(true); setIsMenuOpen(false); }}
                      className="w-full text-left px-4 py-2.5 hover:bg-white/5 flex items-center space-x-3 transition-colors text-[15px] text-gray-200"
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
            />
          ))}

          {/* Infinite Scroll Sentinel */}
          {!targetProductId && (
            <div ref={sentinelRef} className="flex justify-center py-8">
              {isLoadingMore && (
                <div className="w-8 h-8 border-4 border-white/10 border-t-white rounded-full animate-spin" />
              )}
              {!hasMore && products.length > 0 && (
                <p className="text-gray-500 text-sm">已显示全部产品</p>
              )}
            </div>
          )}
        </div>

      </main>

      {/* --- About Modal --- */}
      <AnimatePresence>
        {showAbout && (
          <AboutModal
            onClose={() => setShowAbout(false)}
            text={settings?.about_text || '暂无关于信息。'}
          />
        )}
      </AnimatePresence>

      {/* --- Contact Modal --- */}
      <AnimatePresence>
        {showContact && (
          <ContactModal
            onClose={() => setShowContact(false)}
            text={settings?.contact_text || '暂无联系信息。'}
          />
        )}
      </AnimatePresence>


    </div >
  );
};
