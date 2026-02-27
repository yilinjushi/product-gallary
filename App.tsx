import React, { useState, useEffect, Suspense } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { PublicView } from './components/PublicView';
import { Product, ViewState, ProductFormData, SiteSettings } from './types';
import { supabase, isConfigured } from './utils/supabaseClient';

// Lazy load admin-only components (not needed for public users)
const ProductList = React.lazy(() => import('./components/ProductList').then(m => ({ default: m.ProductList })));
const ProductForm = React.lazy(() => import('./components/ProductForm').then(m => ({ default: m.ProductForm })));
const AdminSettings = React.lazy(() => import('./components/AdminSettings').then(m => ({ default: m.AdminSettings })));
const AdminBackup = React.lazy(() => import('./components/AdminBackup').then(m => ({ default: m.AdminBackup })));
const Auth = React.lazy(() => import('./components/Auth').then(m => ({ default: m.Auth })));
const AdminLayout = React.lazy(() => import('./components/AdminLayout').then(m => ({ default: m.AdminLayout })));

const PAGE_SIZE = 12;

const App: React.FC = () => {
  // --- State ---
  const [products, setProducts] = useState<Product[]>([]);
  const [viewState, setViewState] = useState<ViewState>({ type: 'list' });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [appMode, setAppMode] = useState<'admin' | 'public'>(() =>
    typeof window !== 'undefined' && window.location.pathname === '/adminportal' ? 'admin' : 'public'
  );
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Instantly load cached products for public mode
  useEffect(() => {
    if (appMode === 'public') {
      try {
        const cached = localStorage.getItem('cachedProducts');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setProducts(parsed);
            setIsLoading(false); // Show cached data immediately
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, [appMode]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);

  // --- Effects ---

  // Check Supabase Config
  if (!isConfigured) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-4 z-50">
        <div className="bg-white p-8 rounded-2xl max-w-lg w-full text-center">
          <AlertTriangle size={48} className="text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Supabase Not Configured</h1>
          <p className="text-slate-600 mb-6">
            To use this as a real product, you must connect it to a Supabase backend.
          </p>
          <div className="text-left bg-slate-100 p-4 rounded-lg text-sm font-mono text-slate-700 overflow-x-auto mb-6">
            1. Go to utils/supabaseClient.ts<br />
            2. Enter your SUPABASE_URL<br />
            3. Enter your SUPABASE_ANON_KEY
          </div>
          <p className="text-xs text-slate-400">
            See supabase-setup.md for table schema and Storage bucket.
          </p>
        </div>
      </div>
    );
  }

  // Initial Data Load & Admin Token Check
  useEffect(() => {
    // Check for stored admin token
    const storedToken = localStorage.getItem('adminToken');
    const storedExpiry = localStorage.getItem('adminTokenExpiry');
    if (storedToken && storedExpiry && Date.now() < parseInt(storedExpiry, 10)) {
      // Verify token with server
      fetch('/api/admin-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: storedToken }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.valid) {
            setSession({ token: storedToken });
          } else {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminTokenExpiry');
          }
        })
        .catch(() => {
          // Offline — trust the local expiry
          setSession({ token: storedToken });
        });
    }

    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase.from('site_settings').select('*').eq('id', 1).single();
        if (!error && data) {
          setSiteSettings(data);
        }
      } catch (err) {
        console.error('Failed to fetch settings:', err);
      }
    };

    fetchSettings();
  }, []);

  // Sync appMode with URL (back/forward)
  useEffect(() => {
    const onPopState = () => {
      setAppMode(window.location.pathname === '/admin' ? 'admin' : 'public');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const fetchProducts = async (mode: 'admin' | 'public' = appMode) => {
    setIsLoading(true);
    try {
      // Check if there's a specific product to load via URL param
      const params = new URLSearchParams(window.location.search);
      const targetProductId = params.get('product');

      if (mode === 'public' && targetProductId) {
        // Fetch the specific shared product directly
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', targetProductId)
          .single();

        if (error) throw error;

        const formattedData: Product[] = data ? [{
          ...data,
          fav: data.fav || 300,
          views: data.views || 3000,
          sort_order: data.sort_order ?? 0,
          createdAt: new Date(data.created_at).getTime()
        }] : [];

        setProducts(formattedData);
        setHasMore(false);
      } else {
        let query = supabase
          .from('products')
          .select('*')
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: false });

        if (mode === 'public') {
          query = query.range(0, PAGE_SIZE - 1);
        }

        const { data, error } = await query;

        if (error) throw error;

        const formattedData: Product[] = (data || []).map(item => ({
          ...item,
          fav: item.fav || 300,
          views: item.views || 3000,
          sort_order: item.sort_order ?? 0,
          createdAt: new Date(item.created_at).getTime()
        }));

        setProducts(formattedData);
        setHasMore(mode === 'public' ? (data || []).length >= PAGE_SIZE : false);

        // Save to localStorage for instant load next time
        if (mode === 'public') {
          try { localStorage.setItem('cachedProducts', JSON.stringify(formattedData)); } catch (e) { }
        }
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch products whenever the app mode changes
  useEffect(() => {
    fetchProducts(appMode);
  }, [appMode]);

  const loadMoreProducts = async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const from = products.length;
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      const formattedData: Product[] = (data || []).map(item => ({
        ...item,
        fav: item.fav || 300,
        views: item.views || 3000,
        sort_order: item.sort_order ?? 0,
        createdAt: new Date(item.created_at).getTime()
      }));

      setProducts(prev => [...prev, ...formattedData]);
      setHasMore((data || []).length >= PAGE_SIZE);
    } catch (error) {
      console.error('Error loading more products:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // --- Handlers ---

  const handleCreateProduct = async (data: ProductFormData) => {
    if (!session) return;

    // Optimistic Update (Optional, but let's stick to fetch for truth)
    try {
      const { error } = await supabase.from('products').insert([{
        title: data.title,
        description: data.description,
        images: data.images, // URLs from storage
        tag: data.tag,
        fav: data.fav,
        views: data.views,
        user_id: session.user.id
      }]);

      if (error) throw error;
      fetchProducts(); // Refresh list
      setViewState({ type: 'list' });
    } catch (error: any) {
      console.error("Error creating product:", error);
      throw error;
    }
  };

  const handleUpdateProduct = async (id: string, data: ProductFormData) => {
    if (!session) return;

    try {
      const { error } = await supabase
        .from('products')
        .update({
          title: data.title,
          description: data.description,
          images: data.images,
          tag: data.tag,
          fav: data.fav,
          views: data.views
        })
        .eq('id', id);

      if (error) throw error;
      fetchProducts();
      setViewState({ type: 'list' });
    } catch (error) {
      console.error("Error updating product:", error);
      alert("Failed to update product");
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!session) return;

    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("Failed to delete product");
    }
  };

  const handleReorderProducts = async (reorderedProducts: Product[]) => {
    // Optimistic update
    setProducts(reorderedProducts);

    try {
      const updates = reorderedProducts.map((p, index) => ({
        id: p.id,
        sort_order: index
      }));

      for (const u of updates) {
        const { error } = await supabase
          .from('products')
          .update({ sort_order: u.sort_order })
          .eq('id', u.id);
        if (error) throw error;
      }
    } catch (error) {
      console.error("Error reordering products:", error);
      fetchProducts(); // Rollback on failure
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminTokenExpiry');
    setSession(null);
    setAppMode('public');
    window.history.pushState(null, '', '/');
  };

  // toggleSidebar has been moved to AdminLayout

  const goToAdmin = () => {
    setAppMode('admin');
    window.history.pushState(null, '', '/adminportal');
  };
  const goToPublic = () => {
    setAppMode('public');
    window.history.pushState(null, '', '/');
  };

  // --- Render Logic ---

  if (appMode === 'public') {
    return (
      <PublicView
        products={products}
        isLoading={isLoading}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        onLoadMore={loadMoreProducts}
        onBackToAdmin={goToAdmin}
        settings={siteSettings}
      />
    );
  }

  // If Admin Mode requested but not logged in
  if (!session) {
    return (
      <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 size={32} className="animate-spin text-slate-300" /></div>}>
        <Auth
          onCancel={goToPublic}
          onAuth={(token, expiresAt) => {
            localStorage.setItem('adminToken', token);
            localStorage.setItem('adminTokenExpiry', expiresAt.toString());
            setSession({ token });
          }}
        />
      </Suspense>
    );
  }

  // --- Render Admin View (Authenticated) ---
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 size={32} className="animate-spin text-slate-300" /></div>}>
      <AdminLayout
        session={session}
        viewState={viewState}
        setViewState={setViewState}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        handleSignOut={handleSignOut}
        goToPublic={goToPublic}
      >
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="animate-spin text-slate-300">
              <Loader2 size={32} />
            </div>
          </div>
        ) : (
          <>
            {viewState.type === 'list' && (
              <ProductList
                products={products}
                onEdit={(product) => setViewState({ type: 'edit', product })}
                onDelete={handleDeleteProduct}
                onAddNew={() => setViewState({ type: 'create' })}
                onReorder={handleReorderProducts}
              />
            )}

            {viewState.type === 'create' && (
              <ProductForm
                mode="create"
                onSubmit={handleCreateProduct}
                onCancel={() => setViewState({ type: 'list' })}
              />
            )}

            {viewState.type === 'edit' && (
              <ProductForm
                mode="edit"
                initialData={viewState.product}
                onSubmit={(data) => handleUpdateProduct(viewState.product.id, data)}
                onCancel={() => setViewState({ type: 'list' })}
              />
            )}

            {viewState.type === 'settings' && (
              <AdminSettings
                settings={siteSettings}
                onUpdate={(newSettings) => setSiteSettings(newSettings)}
              />
            )}

            {viewState.type === 'backup' && (
              <AdminBackup />
            )}
          </>
        )}
      </AdminLayout>
    </Suspense>
  );
};

export default App;