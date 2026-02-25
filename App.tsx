import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  PackagePlus,
  Package,
  Menu,
  X,
  LogOut,
  Smartphone,
  AlertTriangle,
  Loader2,
  Settings
} from 'lucide-react';
import { ProductList } from './components/ProductList';
import { ProductForm } from './components/ProductForm';
import { PublicView } from './components/PublicView';
import { AdminSettings } from './components/AdminSettings';
import { Auth } from './components/Auth';
import { Product, ViewState, ProductFormData, SiteSettings } from './types';
import { SidebarItem } from './components/SidebarItem';
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
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      const formattedData: Product[] = (data || []).map(item => ({
        ...item,
        fav: item.fav || 300,
        views: item.views || 3000,
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setAppMode('public');
    window.history.pushState(null, '', '/');
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

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
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 overflow-hidden">

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-30
          w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out
          flex flex-col
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center mr-3 shadow-lg shadow-primary-500/30">
            <LayoutDashboard className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
            LuxeAdmin
          </span>
          <button onClick={toggleSidebar} className="ml-auto lg:hidden text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-2">Inventory</div>

          <SidebarItem
            icon={<Package size={20} />}
            label="Product List"
            isActive={viewState.type === 'list'}
            onClick={() => {
              setViewState({ type: 'list' });
              setIsSidebarOpen(false);
            }}
          />
          <SidebarItem
            icon={<PackagePlus size={20} />}
            label="Add Product"
            isActive={viewState.type === 'create'}
            onClick={() => {
              setViewState({ type: 'create' });
              setIsSidebarOpen(false);
            }}
          />

          <div className="mt-8 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-2">System</div>
          <SidebarItem
            icon={<Settings size={20} />}
            label="Settings"
            isActive={viewState.type === 'settings'}
            onClick={() => {
              setViewState({ type: 'settings' });
              setIsSidebarOpen(false);
            }}
          />

          <div className="mt-8 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-2">Preview</div>
          <SidebarItem
            icon={<Smartphone size={20} />}
            label="Live Frontend"
            isActive={false}
            onClick={() => {
              goToPublic();
              setIsSidebarOpen(false);
            }}
          />
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="px-4 py-2 mb-2 text-xs text-slate-400 truncate">
            Logged in as: <br /> <span className="text-slate-600 font-medium">{session.user.email}</span>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center w-full px-4 py-3 text-sm font-medium text-slate-600 rounded-xl hover:bg-slate-50 transition-colors group"
          >
            <LogOut size={18} className="mr-3 text-slate-400 group-hover:text-red-500 transition-colors" />
            <span className="group-hover:text-slate-900">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header (Mobile) */}
        <header className="h-16 lg:hidden bg-white border-b border-slate-200 flex items-center px-4 justify-between shrink-0">
          <button onClick={toggleSidebar} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg">
            <Menu size={24} />
          </button>
          <span className="font-semibold text-slate-800">
            {viewState.type === 'create' ? 'New Product' : viewState.type === 'edit' ? 'Edit Product' : 'Inventory'}
          </span>
          <div className="w-8" /> {/* Spacer */}
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <div className="max-w-5xl mx-auto">
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
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;