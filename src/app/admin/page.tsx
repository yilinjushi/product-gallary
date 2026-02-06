'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { createProductAction, deleteProductAction, fetchProductsAction, updateProductAction } from '@/lib/actions';
import { Product } from '@/lib/db';
import Image from 'next/image';

const ADMIN_AUTHORIZED_KEY = 'admin_authorized';

export default function AdminPage() {
    const [view, setView] = useState<'add' | 'products'>('products');
    const [products, setProducts] = useState<Product[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [password, setPassword] = useState('');
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [editFiles, setEditFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const editFileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && localStorage.getItem(ADMIN_AUTHORIZED_KEY) === 'true') {
            setIsAuthorized(true);
        }
    }, []);

    useEffect(() => {
        if (isAuthorized) loadProducts();
    }, [isAuthorized]);

    async function loadProducts() {
        const data = await fetchProductsAction();
        setProducts(data);
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (selectedFiles.length === 0) {
            alert('请选择至少一张图片');
            return;
        }
        setIsUploading(true);
        const formData = new FormData(e.currentTarget);
        selectedFiles.forEach((file) => formData.append('images', file));
        try {
            const result = await createProductAction(formData);
            if (!result.success) {
                alert(result.error);
                return;
            }
            (e.target as HTMLFormElement).reset();
            setSelectedFiles([]);
            loadProducts();
            alert('产品已成功添加');
            setView('products');
        } catch (error) {
            alert(error instanceof Error ? error.message : '添加失败');
        } finally {
            setIsUploading(false);
        }
    }

    async function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!editingProduct) return;
        const title = (e.currentTarget.querySelector('[name="edit-title"]') as HTMLInputElement)?.value?.trim() ?? '';
        const description = (e.currentTarget.querySelector('[name="edit-description"]') as HTMLTextAreaElement)?.value?.trim() ?? '';
        if (!title || !description) {
            alert('请填写标题和描述');
            return;
        }
        if (editFiles.length === 0 && title === editingProduct.title && description === editingProduct.description) {
            alert('无修改内容，或请选择新图片以更换');
            return;
        }
        const formData = new FormData();
        formData.set('title', title);
        formData.set('description', description);
        editFiles.forEach((file) => formData.append('images', file));
        setIsUploading(true);
        try {
            const result = await updateProductAction(editingProduct.id, formData);
            if (!result.success) {
                alert(result.error);
                return;
            }
            loadProducts();
            setEditingProduct(null);
            setEditFiles([]);
        } catch (err) {
            alert(err instanceof Error ? err.message : '更新失败');
        } finally {
            setIsUploading(false);
        }
    }

    async function handleDelete(id: number) {
        if (confirm('确定要删除这个产品吗？')) {
            await deleteProductAction(id);
            loadProducts();
        }
    }

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        const { checkPasswordAction } = await import('@/lib/actions');
        const isValid = await checkPasswordAction(password);
        if (isValid) {
            localStorage.setItem(ADMIN_AUTHORIZED_KEY, 'true');
            setIsAuthorized(true);
        } else {
            alert('密码错误');
        }
    }

    function handleLogout() {
        localStorage.removeItem(ADMIN_AUTHORIZED_KEY);
        setIsAuthorized(false);
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const valid = files.filter((f) => {
            if (f.size > 3 * 1024 * 1024) {
                alert(`文件 ${f.name} 超过 3MB`);
                return false;
            }
            return true;
        });
        setSelectedFiles((prev) => [...prev, ...valid]);
    };

    const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const valid = files.filter((f) => {
            if (f.size > 3 * 1024 * 1024) {
                alert(`文件 ${f.name} 超过 3MB`);
                return false;
            }
            return true;
        });
        setEditFiles((prev) => [...prev, ...valid]);
    };

    if (!isAuthorized) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-10 border border-gray-100">
                    <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">管理后台</h1>
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-500 mb-1">访问密码</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-gray-800"
                                placeholder="Password"
                                required
                            />
                        </div>
                        <button type="submit" className="w-full py-3.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-colors">
                            登录
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-primary)] font-sans">
            {/* 顶部导航：无侧栏，适合桌面端 */}
            <header className="sticky top-0 z-10 border-b border-white/10 bg-[var(--bg-color)]/95 backdrop-blur">
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-4">
                    <h1 className="text-lg sm:text-xl font-semibold text-white truncate">管理后台</h1>
                    <nav className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => setView('add')}
                            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${view === 'add' ? 'bg-[var(--accent-color)] text-white' : 'text-white/70 hover:text-white hover:bg-white/5'}`}
                        >
                            发布
                        </button>
                        <button
                            type="button"
                            onClick={() => setView('products')}
                            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${view === 'products' ? 'bg-[var(--accent-color)] text-white' : 'text-white/70 hover:text-white hover:bg-white/5'}`}
                        >
                            产品
                        </button>
                    </nav>
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="p-2.5 rounded-lg text-white/50 hover:text-red-400 hover:bg-white/5 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                        title="退出登录"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                </div>
            </header>

            <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
                {view === 'add' ? (
                    <div className="max-w-2xl mx-auto">
                        <p className="text-white/50 text-sm mb-6">填写下方信息并上传图片后保存，即可发布到画廊。</p>
                        <form onSubmit={handleSubmit} className="admin-card rounded-2xl overflow-hidden flex flex-col">
                            <div
                                role="button"
                                tabIndex={0}
                                onClick={() => fileInputRef.current?.click()}
                                onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                                className="admin-card-image flex flex-col items-center justify-center cursor-pointer hover:bg-[#252530] transition-colors min-h-[240px] sm:min-h-[280px] lg:min-h-[320px]"
                            >
                                <input type="file" multiple accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                                {selectedFiles.length > 0 ? (
                                    <div className="flex flex-wrap gap-3 justify-center p-4">
                                        {selectedFiles.map((file, idx) => (
                                            <div key={idx} className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border border-white/20">
                                                <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="" />
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); setSelectedFiles((p) => p.filter((_, i) => i !== idx)); }}
                                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <>
                                        <svg className="w-14 h-14 text-white/40 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                        <p className="text-white/50 text-sm">点击或拖拽上传图片（可多选，将全部展示在前端）</p>
                                    </>
                                )}
                            </div>
                            <div className="admin-card-text px-5 sm:px-6 lg:px-8 pt-5 pb-3">
                                <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">产品标题</label>
                                <input
                                    name="title"
                                    type="text"
                                    required
                                    placeholder="例如：涂鸦WIFI智能气象钟"
                                    className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)] outline-none transition-all text-base"
                                />
                            </div>
                            <div className="admin-card-text px-5 sm:px-6 lg:px-8 py-5">
                                <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">产品描述</label>
                                <textarea
                                    name="description"
                                    required
                                    rows={5}
                                    placeholder="通过WIFI连接涂鸦APP，自动获取网络标准时间及当地未来天气预报数据..."
                                    className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)] outline-none transition-all resize-none text-base"
                                />
                            </div>
                            <div className="px-5 sm:px-6 lg:px-8 pb-6 pt-2 flex gap-3">
                                <button
                                    type="submit"
                                    disabled={isUploading}
                                    className="flex-1 py-3.5 rounded-xl bg-[var(--accent-color)] hover:bg-indigo-600 disabled:opacity-50 text-white font-semibold transition-colors min-h-[44px]"
                                >
                                    {isUploading ? '保存中...' : '保存产品'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setView('products')}
                                    className="px-6 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 transition-colors min-h-[44px]"
                                >
                                    取消
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <>
                        <p className="text-white/50 text-sm mb-6 sm:mb-8">共 {products.length} 个产品，可编辑或删除。</p>
                        {products.length === 0 ? (
                            <div className="admin-card rounded-2xl py-20 text-center">
                                <p className="text-white/40 mb-4">暂无产品</p>
                                <button type="button" onClick={() => setView('add')} className="text-[var(--accent-color)] font-semibold hover:underline">
                                    发布第一个产品
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5 sm:gap-6 lg:gap-8">
                                {products.map((product) => (
                                    <div key={product.id} className="admin-card rounded-2xl overflow-hidden flex flex-col">
                                        <div className="admin-card-image relative min-h-[200px] sm:min-h-[240px] lg:min-h-[260px] bg-[#1e1e26]">
                                            <Image
                                                src={product.images[0]}
                                                alt={product.title}
                                                fill
                                                className="object-contain p-5"
                                                sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                                            />
                                        </div>
                                        <div className="admin-card-text px-4 sm:px-5 pt-4 pb-3 flex-1">
                                            <h3 className="font-semibold text-white text-base lg:text-lg mb-1 truncate" style={{ background: 'linear-gradient(to right, #fff, #a5a5a5)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                                {product.title}
                                            </h3>
                                            <p className="text-sm text-white/60 line-clamp-3 leading-relaxed">{product.description}</p>
                                        </div>
                                        <div className="px-4 sm:px-5 pb-4 pt-2 flex gap-3">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setEditFiles([]);
                                                    setEditingProduct({ ...product });
                                                }}
                                                className="flex-1 py-2.5 rounded-xl border border-white/20 text-white/90 hover:bg-white/10 font-medium text-sm transition-colors min-h-[44px]"
                                            >
                                                编辑
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(product.id)}
                                                className="flex-1 py-2.5 rounded-xl border border-red-500/50 text-red-400 hover:bg-red-500/10 font-medium text-sm transition-colors min-h-[44px]"
                                            >
                                                删除
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* 编辑弹窗：用 Portal 挂到 body，避免被父级 overflow 或 z-index 遮挡 */}
            {typeof document !== 'undefined' && editingProduct && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setEditingProduct(null)} role="dialog" aria-modal="true">
                    <div className="admin-card rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-white/10">
                            <h2 className="text-lg font-semibold text-white">编辑产品</h2>
                            <button type="button" onClick={() => { setEditingProduct(null); setEditFiles([]); }} className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/5">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="p-5 sm:p-6 space-y-5">
                            <div
                                role="button"
                                tabIndex={0}
                                onClick={() => editFileInputRef.current?.click()}
                                className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/20 bg-[#1e1e26] min-h-[200px] cursor-pointer hover:border-white/30 transition-colors"
                            >
                                <input type="file" multiple accept="image/*" ref={editFileInputRef} className="hidden" onChange={handleEditFileChange} />
                                {editFiles.length > 0 ? (
                                    <div className="flex flex-wrap gap-2 justify-center p-4">
                                        {editFiles.map((file, idx) => (
                                            <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/20">
                                                <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="" />
                                                <button type="button" onClick={(e) => { e.stopPropagation(); setEditFiles((p) => p.filter((_, i) => i !== idx)); }} className="absolute -top-0.5 -right-0.5 bg-red-500 text-white rounded-full p-0.5">
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <>
                                        <svg className="w-10 h-10 text-white/40 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" /></svg>
                                        <p className="text-white/50 text-sm">点击更换图片（不选则保留原图）</p>
                                    </>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">产品标题</label>
                                <input
                                    name="edit-title"
                                    type="text"
                                    defaultValue={editingProduct.title}
                                    className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)] outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">产品描述</label>
                                <textarea
                                    name="edit-description"
                                    rows={5}
                                    defaultValue={editingProduct.description}
                                    className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)] outline-none resize-none"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="submit" disabled={isUploading} className="flex-1 py-3.5 rounded-xl bg-[var(--accent-color)] hover:bg-indigo-600 disabled:opacity-50 text-white font-semibold min-h-[44px]">
                                    {isUploading ? '保存中...' : '保存修改'}
                                </button>
                                <button type="button" onClick={() => { setEditingProduct(null); setEditFiles([]); }} className="px-6 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 min-h-[44px]">
                                    取消
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
