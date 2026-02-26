import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ArrowLeft, MoreHorizontal, Info, Mail, Sun, Moon } from 'lucide-react';
import { Product, SiteSettings } from '../types';
import { Post } from './Post';
import { PostSkeleton } from './PostSkeleton';
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
  const [activeCategory, setActiveCategory] = useState('全部');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
    }
    return 'dark';
  });
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Apply theme to <html> and persist
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

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

  // Prefetch images for the next 5 products ahead of visible ones
  const prefetchedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (isLoading || products.length === 0) return;

    const productCards = document.querySelectorAll('[data-product-index]');
    if (productCards.length === 0) return;

    const prefetchImages = (startIndex: number) => {
      const sorted = [...products].sort((a, b) => a.sort_order - b.sort_order);
      const filtered = activeCategory !== '全部' ? sorted.filter(p => p.tag === activeCategory) : sorted;

      for (let i = startIndex; i < Math.min(startIndex + 5, filtered.length); i++) {
        const product = filtered[i];
        if (!product?.images) continue;
        product.images.forEach((imgUrl: string) => {
          if (!prefetchedRef.current.has(imgUrl)) {
            prefetchedRef.current.add(imgUrl);
            const img = new Image();
            img.src = imgUrl;
          }
        });
      }
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const index = parseInt((entry.target as HTMLElement).dataset.productIndex || '0', 10);
          prefetchImages(index + 1);
        }
      });
    }, { rootMargin: '200px' });

    productCards.forEach(card => observer.observe(card));

    // Also prefetch the first 5 immediately
    prefetchImages(0);

    return () => observer.disconnect();
  }, [products, activeCategory, isLoading, targetProductId]);

  // Handle loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col font-sans tracking-tight" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <header
          className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md py-4 h-16"
          style={{ backgroundColor: 'var(--bg-header)', borderBottom: '1px solid var(--border-color)', paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
        />
        <div className="flex-1 pb-20 max-w-7xl mx-auto w-full px-0 sm:px-6 lg:px-8 mt-4" style={{ paddingTop: 'calc(4.5rem + env(safe-area-inset-top, 0px))' }}>
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="break-inside-avoid">
                <PostSkeleton />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Handle empty state
  if (products.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: 'var(--hover-bg)' }}>
          <ShoppingBag size={24} style={{ color: 'var(--text-muted)' }} />
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>No Posts Yet</h2>
        <p className="mb-6 text-center text-[15px]" style={{ color: 'var(--text-muted)' }}>When products are added to the inventory, they will appear here.</p>
        <button
          onClick={onBackToAdmin}
          className="px-6 py-2 rounded-full font-bold text-[15px] transition-colors"
          style={{ backgroundColor: 'var(--cat-active-bg)', color: 'var(--cat-active-text)' }}
        >
          Sign in to Admin
        </button>
      </div>
    );
  }

  // Sort by admin-defined order (sort_order ascending)
  let displayProducts = [...products].sort((a, b) => a.sort_order - b.sort_order);

  if (activeCategory !== '全部') {
    displayProducts = displayProducts.filter(p => p.tag === activeCategory);
  }

  if (targetProductId) {
    const target = displayProducts.find(p => p.id === targetProductId);
    if (target) {
      displayProducts = [target];
    }
  }

  const categories = ['全部', ...Array.from(new Set(products.map(p => p.tag).filter((tag): tag is string => !!tag)))];

  return (
    <div className="min-h-screen flex justify-center font-sans tracking-tight" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>

      {/* Main Timeline Column */}
      <main className="w-full min-h-screen flex flex-col relative" style={{ backgroundColor: 'var(--bg-primary)' }}>

        {/* Fixed Header */}
        <header
          className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md pt-3 flex flex-col cursor-pointer transition-all duration-300"
          style={{
            backgroundColor: 'var(--bg-header)',
            borderBottom: '1px solid var(--border-color)',
            paddingTop: 'max(0.75rem, env(safe-area-inset-top))'
          }}
          onClick={() => {
            if (targetProductId) window.location.href = window.location.pathname;
          }}
        >
          {/* Top Row: Brand & Menu */}
          <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
            <div className="flex items-center gap-3">
              {targetProductId && (
                <button
                  onClick={(e) => { e.stopPropagation(); window.location.href = window.location.pathname; }}
                  className="p-1.5 -ml-1 rounded-full transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                  title="查看所有产品"
                >
                  <ArrowLeft size={20} style={{ color: 'var(--text-primary)' }} />
                </button>
              )}
              <div className="flex flex-col">
                <h1 className="text-[20px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>先越科技</h1>
                <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>核心技术驱动，助力电子产品快速落地。</p>
              </div>
            </div>
            <div className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-1.5 rounded-full transition-colors"
                style={{ color: 'var(--text-primary)' }}
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
                      className="absolute right-0 top-10 w-48 rounded-xl shadow-2xl overflow-hidden py-1 z-50 origin-top-right"
                      style={{ backgroundColor: 'var(--menu-bg)', border: '1px solid var(--menu-border)' }}
                    >
                      <button
                        onClick={() => { setShowAbout(true); setIsMenuOpen(false); }}
                        className="w-full text-left px-4 py-2.5 flex items-center space-x-3 transition-colors text-[15px]"
                        style={{ color: 'var(--menu-text)' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--menu-hover)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <Info size={18} />
                        <span>关于</span>
                      </button>
                      <button
                        onClick={() => { setShowContact(true); setIsMenuOpen(false); }}
                        className="w-full text-left px-4 py-2.5 flex items-center space-x-3 transition-colors text-[15px]"
                        style={{ color: 'var(--menu-text)' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--menu-hover)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <Mail size={18} />
                        <span>联系</span>
                      </button>
                      {/* Divider */}
                      <div className="my-1" style={{ borderTop: '1px solid var(--border-color)' }} />
                      <button
                        onClick={() => { setTheme('light'); setIsMenuOpen(false); }}
                        className="w-full text-left px-4 py-2.5 flex items-center space-x-3 transition-colors text-[15px]"
                        style={{ color: 'var(--menu-text)' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--menu-hover)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <Sun size={18} />
                        <span>白色风格</span>
                      </button>
                      <button
                        onClick={() => { setTheme('dark'); setIsMenuOpen(false); }}
                        className="w-full text-left px-4 py-2.5 flex items-center space-x-3 transition-colors text-[15px]"
                        style={{ color: 'var(--menu-text)' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--menu-hover)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <Moon size={18} />
                        <span>黑色风格</span>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Bottom Row: Category Scroller */}
          {!targetProductId && categories.length > 1 && (
            <div className="w-full overflow-x-auto hide-scrollbar mt-3 pb-2 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex items-center gap-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' as any }}>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={(e) => { e.stopPropagation(); window.scrollTo({ top: 0, behavior: 'smooth' }); setActiveCategory(cat); }}
                  className="px-4 py-1.5 rounded-full text-[14px] border font-medium transition-colors whitespace-nowrap"
                  style={activeCategory === cat
                    ? { backgroundColor: 'var(--cat-active-bg)', color: 'var(--cat-active-text)', borderColor: 'transparent' }
                    : { backgroundColor: 'transparent', color: 'var(--cat-inactive-text)', borderColor: 'var(--cat-border)' }
                  }
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </header>

        {/* Feed Posts */}
        <div
          className="flex-1 pb-20 max-w-7xl mx-auto w-full px-0 sm:px-6 lg:px-8 mt-2"
          style={{ paddingTop: !targetProductId && categories.length > 1 ? 'calc(7.5rem + env(safe-area-inset-top, 0px))' : 'calc(4.5rem + env(safe-area-inset-top, 0px))' }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayProducts.map((product, index) => (
              <div key={product.id} className="break-inside-avoid" data-product-index={index}>
                <Post product={product} />
              </div>
            ))}
          </div>

          {/* Infinite Scroll Sentinel */}
          {!targetProductId && (
            <div ref={sentinelRef} className="flex justify-center py-8">
              {isLoadingMore && (
                <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--spinner-track)', borderTopColor: 'var(--spinner-head)' }} />
              )}
              {!hasMore && products.length > 0 && (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>已显示全部产品</p>
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
