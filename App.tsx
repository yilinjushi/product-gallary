import React, { useState, useEffect } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { ProductList } from './components/ProductList';
import { ProductForm } from './components/ProductForm';
import { PublicView } from './components/PublicView';
import { AdminSettings } from './components/AdminSettings';
import { Auth } from './components/Auth';
import { Product, ViewState, ProductFormData, SiteSettings } from './types';
import { AdminLayout } from './components/AdminLayout';
import { supabase, isConfigured } from './utils/supabaseClient';

const PAGE_SIZE = 2;

const App: React.FC = () => {
  // --- State ---
  const [products, setProducts] = useState<Product[]>([]);
  const [viewState, setViewState] = useState<ViewState>({ type: 'list' });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [appMode, setAppMode] = useState<'admin' | 'public'>(() =>
    typeof window !== 'undefined' && window.location.pathname === '/admin' ? 'admin' : 'public'
  );
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
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

  // Initial Data Load & Auth Check
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

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
    // fetchProducts is now called in the appMode useEffect below

    return () => subscription.unsubscribe();
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setAppMode('public');
    window.history.pushState(null, '', '/');
  };

  // toggleSidebar has been moved to AdminLayout

  const goToAdmin = () => {
    setAppMode('admin');
    window.history.pushState(null, '', '/admin');
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
    return <Auth onCancel={goToPublic} />;
  }

  // --- Render Admin View (Authenticated) ---
  return (
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
        </>
      )}
    </AdminLayout>
  );
};

export default App;