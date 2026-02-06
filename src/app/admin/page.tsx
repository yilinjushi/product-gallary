'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  PackagePlus,
  Package,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { ProductList } from './components/ProductList';
import { ProductForm } from './components/ProductForm';
import { SidebarItem } from './components/SidebarItem';
import type { ViewState, AdminProduct } from './types';
import { toAdminProduct } from './helpers';
import {
  fetchProductsAction,
  createProductAction,
  updateProductAction,
  deleteProductAction,
  checkPasswordAction,
} from '@/lib/actions';

const ADMIN_AUTHORIZED_KEY = 'admin_authorized';

export default function AdminPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [viewState, setViewState] = useState<ViewState>({ type: 'list' });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem(ADMIN_AUTHORIZED_KEY) === 'true') {
      setIsAuthorized(true);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    const data = await fetchProductsAction();
    setProducts(data.map(toAdminProduct));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthorized) loadProducts();
  }, [isAuthorized, loadProducts]);

  const handleCreateProduct = async (data: { title: string; description: string; imageFiles: File[] }) => {
    if (data.imageFiles.length === 0) return;
    const formData = new FormData();
    formData.set('title', data.title);
    formData.set('description', data.description);
    data.imageFiles.forEach((f) => formData.append('images', f));
    const result = await createProductAction(formData);
    if (!result.success) throw new Error(result.error);
    await loadProducts();
    setViewState({ type: 'list' });
  };

  const handleUpdateProduct = async (
    id: string,
    data: { title: string; description: string; imageFiles: File[] }
  ) => {
    const formData = new FormData();
    formData.set('title', data.title);
    formData.set('description', data.description);
    data.imageFiles.forEach((f) => formData.append('images', f));
    const result = await updateProductAction(Number(id), formData);
    if (!result.success) throw new Error(result.error);
    await loadProducts();
    setViewState({ type: 'list' });
  };

  const handleDeleteProduct = async (id: string) => {
    await deleteProductAction(Number(id));
    await loadProducts();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await checkPasswordAction(password);
    if (ok) {
      localStorage.setItem(ADMIN_AUTHORIZED_KEY, 'true');
      setIsAuthorized(true);
    } else {
      alert('密码错误');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_AUTHORIZED_KEY);
    setIsAuthorized(false);
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-10">
          <h1 className="text-2xl font-bold text-center text-slate-800 mb-6">管理后台</h1>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">访问密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800"
                placeholder="Password"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors"
            >
              登录
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 overflow-hidden">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setIsSidebarOpen(false)}
          role="button"
          tabIndex={0}
          aria-label="关闭"
        />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-30
          w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out
          flex flex-col
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center mr-3 shadow-lg shadow-indigo-500/30">
            <LayoutDashboard className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
            LuxeAdmin
          </span>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="ml-auto lg:hidden text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-2">
            库存
          </div>
          <SidebarItem
            icon={<Package size={20} />}
            label="产品列表"
            isActive={viewState.type === 'list'}
            onClick={() => {
              setViewState({ type: 'list' });
              setIsSidebarOpen(false);
            }}
          />
          <SidebarItem
            icon={<PackagePlus size={20} />}
            label="添加产品"
            isActive={viewState.type === 'create'}
            onClick={() => {
              setViewState({ type: 'create' });
              setIsSidebarOpen(false);
            }}
          />
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-sm font-medium text-slate-600 rounded-xl hover:bg-slate-50 transition-colors group"
          >
            <LogOut size={18} className="mr-3 text-slate-400 group-hover:text-red-500 transition-colors" />
            <span className="group-hover:text-slate-900">退出登录</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-16 lg:hidden bg-white border-b border-slate-200 flex items-center px-4 justify-between shrink-0">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            <Menu size={24} />
          </button>
          <span className="font-semibold text-slate-800">
            {viewState.type === 'create' ? '添加产品' : viewState.type === 'edit' ? '编辑产品' : '产品列表'}
          </span>
          <div className="w-8" />
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <div className="max-w-5xl mx-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-slate-400">加载中...</div>
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
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
