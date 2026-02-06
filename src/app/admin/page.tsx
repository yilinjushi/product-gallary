'use client';

import { useState, useEffect, useRef } from 'react';
import { createProductAction, deleteProductAction, fetchProductsAction } from '@/lib/actions';
import { Product } from '@/lib/db';
import Image from 'next/image';

const ADMIN_AUTHORIZED_KEY = 'admin_authorized';

export default function AdminPage() {
    const [view, setView] = useState<'add' | 'products'>('add');
    const [products, setProducts] = useState<Product[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [password, setPassword] = useState('');
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
            console.error(error);
            alert(error instanceof Error ? error.message : '添加失败');
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
        const validFiles = files.filter((file) => {
            if (file.size > 3 * 1024 * 1024) {
                alert(`文件 ${file.name} 超过 3MB`);
                return false;
            }
            return true;
        });
        setSelectedFiles((prev) => [...prev, ...validFiles]);
    };

    const removeFile = (index: number) => {
        setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    };

    // ——— 登录页（保持原样） ———
    if (!isAuthorized) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4 font-sans">
                <div className="max-w-md w-full bg-white rounded-3xl shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] p-10 border border-gray-100">
                    <div className="flex justify-center mb-8">
                        <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-center mb-2 text-gray-800 tracking-tight">管理后台</h1>
                    <p className="text-gray-400 text-sm text-center mb-8">请输入访问密码以继续</p>
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">访问密码</label>
                            <input
                                type="password"
                                autoFocus
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-800 shadow-inner"
                                placeholder="Password"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-blue-100 transition-all transform active:scale-[0.98]"
                        >
                            登录系统
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // ——— 已登录：深色背景 + 侧边栏 + 主内容（与前端卡片风格一致） ———
    return (
        <div className="min-h-screen flex font-sans bg-[var(--bg-color)] text-[var(--text-primary)]">
            {/* 侧边栏 */}
            <aside className="w-[80px] md:w-[100px] border-r border-white/10 flex flex-col items-center py-8 gap-6 flex-shrink-0">
                <div className="p-2.5 rounded-2xl bg-white/5 text-[var(--accent-color)]">
                    <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                    </svg>
                </div>
                <nav className="flex flex-col gap-4 w-full">
                    <button
                        onClick={() => setView('add')}
                        className={`flex flex-col items-center gap-1 py-3 w-full rounded-xl transition-all relative ${view === 'add' ? 'text-[var(--accent-color)] bg-white/5' : 'text-white/50 hover:text-white/80'}`}
                    >
                        {view === 'add' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--accent-color)] rounded-r-full" />}
                        <svg className="w-6 h-6 md:w-7 md:h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="text-[10px] font-bold uppercase tracking-widest">新增</span>
                    </button>
                    <button
                        onClick={() => setView('products')}
                        className={`flex flex-col items-center gap-1 py-3 w-full rounded-xl transition-all relative ${view === 'products' ? 'text-[var(--accent-color)] bg-white/5' : 'text-white/50 hover:text-white/80'}`}
                    >
                        {view === 'products' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--accent-color)] rounded-r-full" />}
                        <svg className="w-6 h-6 md:w-7 md:h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect width="18" height="18" x="3" y="3" rx="4" />
                            <circle cx="12" cy="12" r="3" />
                        </svg>
                        <span className="text-[10px] font-bold uppercase tracking-widest">产品</span>
                    </button>
                </nav>
                <div className="mt-auto">
                    <button
                        onClick={handleLogout}
                        type="button"
                        className="p-2.5 text-white/40 hover:text-red-400 transition-colors rounded-xl"
                        title="退出"
                    >
                        <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                </div>
            </aside>

            <main className="flex-1 overflow-y-auto p-6 md:p-10 lg:p-12">
                <header className="mb-8 md:mb-10">
                    <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-1">
                        {view === 'add' ? '新增产品' : '管理产品'}
                    </h1>
                    <p className="text-white/50 text-sm md:text-base">
                        {view === 'add' ? '填写下方卡片并保存，即可发布到画廊' : `共 ${products.length} 个产品`}
                    </p>
                </header>

                {view === 'add' ? (
                    /* ——— 新增：单张卡片表单（与前端卡片同风格） ——— */
                    <form onSubmit={handleSubmit} className="max-w-lg mx-auto">
                        <div className="admin-card rounded-[var(--radius)] overflow-hidden flex flex-col">
                            {/* 第一行：上传图片 */}
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="admin-card-image flex flex-col items-center justify-center cursor-pointer hover:bg-[#252530] transition-colors min-h-[220px] md:min-h-[280px]"
                            >
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    ref={fileInputRef}
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                                {selectedFiles.length > 0 ? (
                                    <div className="flex flex-wrap gap-2 justify-center p-4">
                                        {selectedFiles.map((file, idx) => (
                                            <div key={idx} className="relative w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden border border-white/20">
                                                <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="" />
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                                                    className="absolute -top-0.5 -right-0.5 bg-red-500 text-white rounded-full p-0.5"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <>
                                        <svg className="w-12 h-12 md:w-14 md:h-14 text-white/40 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                        <p className="text-white/50 text-sm">点击或拖拽上传图片</p>
                                    </>
                                )}
                            </div>

                            {/* 第二行：产品标题 */}
                            <div className="admin-card-text px-4 md:px-6 pt-4 pb-2">
                                <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">产品标题</label>
                                <input
                                    name="title"
                                    type="text"
                                    required
                                    placeholder="例如：涂鸦WIFI智能气象钟"
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)] outline-none transition-all"
                                />
                            </div>

                            {/* 第三行：产品描述 */}
                            <div className="admin-card-text px-4 md:px-6 py-4">
                                <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">产品描述</label>
                                <textarea
                                    name="description"
                                    required
                                    rows={4}
                                    placeholder="通过WIFI连接涂鸦APP，自动获取网络标准时间及当地未来天气预报数据..."
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)] outline-none transition-all resize-none"
                                />
                            </div>

                            {/* 底部：保存 / 取消 */}
                            <div className="px-4 md:px-6 pb-6 pt-2 flex gap-3">
                                <button
                                    type="submit"
                                    disabled={isUploading}
                                    className="flex-1 py-3.5 rounded-xl bg-[var(--accent-color)] hover:bg-indigo-600 disabled:opacity-50 text-white font-semibold transition-all"
                                >
                                    {isUploading ? '保存中...' : '保存产品'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setView('products')}
                                    className="px-6 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 transition-all"
                                >
                                    取消
                                </button>
                            </div>
                        </div>
                    </form>
                ) : (
                    /* ——— 产品列表：卡片网格，每张卡片底部删除按钮 ——— */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl">
                        {products.length === 0 ? (
                            <div className="col-span-full admin-card rounded-[var(--radius)] py-16 text-center">
                                <p className="text-white/40 mb-4">暂无产品</p>
                                <button
                                    onClick={() => setView('add')}
                                    className="text-[var(--accent-color)] font-semibold hover:underline"
                                >
                                    添加第一个产品
                                </button>
                            </div>
                        ) : (
                            products.map((product) => (
                                <div key={product.id} className="admin-card rounded-[var(--radius)] overflow-hidden flex flex-col">
                                    <div className="admin-card-image relative min-h-[180px] md:min-h-[220px] bg-[#1e1e26]">
                                        <Image
                                            src={product.images[0]}
                                            alt={product.title}
                                            fill
                                            className="object-contain p-4"
                                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                        />
                                    </div>
                                    <div className="admin-card-text px-4 md:px-5 pt-3 pb-2 flex-1">
                                        <h3 className="font-semibold text-white text-lg mb-1 truncate" style={{ background: 'linear-gradient(to right, #fff, #a5a5a5)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                            {product.title}
                                        </h3>
                                        <p className="text-sm text-white/60 line-clamp-3 leading-relaxed">{product.description}</p>
                                    </div>
                                    <div className="px-4 md:px-5 pb-4 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(product.id)}
                                            className="w-full py-2.5 rounded-xl border border-red-500/50 text-red-400 hover:bg-red-500/10 font-medium text-sm transition-all"
                                        >
                                            删除产品
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
