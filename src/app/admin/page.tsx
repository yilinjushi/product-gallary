'use client';

import { useState, useEffect, useRef } from 'react';
import { createProductAction, deleteProductAction, fetchProductsAction } from '@/lib/actions';
import { Product } from '@/lib/db';

export default function AdminPage() {
    const [view, setView] = useState<'add' | 'products'>('add');
    const [products, setProducts] = useState<Product[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [password, setPassword] = useState('');
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isAuthorized) {
            loadProducts();
        }
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
        // Add multiple files to formData
        selectedFiles.forEach(file => {
            formData.append('images', file);
        });

        try {
            await createProductAction(formData);
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

    function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        if (password === 'admin123') {
            setIsAuthorized(true);
        } else {
            alert('密码错误');
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const validFiles = files.filter(file => {
            if (file.size > 3 * 1024 * 1024) {
                alert(`文件 ${file.name} 超过 3MB`);
                return false;
            }
            return true;
        });
        setSelectedFiles(prev => [...prev, ...validFiles]);
    };

    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

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

    return (
        <div className="min-h-screen bg-[#f8fafc] flex font-sans">
            {/* Sidebar */}
            <aside className="w-[100px] bg-white border-r border-gray-100 flex flex-col items-center py-10 gap-8 shadow-sm">
                <div className="p-3 bg-blue-50 text-blue-500 rounded-2xl mb-4">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                    </svg>
                </div>

                <nav className="flex flex-col gap-6 w-full">
                    <button
                        onClick={() => setView('add')}
                        className={`flex flex-col items-center gap-1 py-4 w-full transition-all relative ${view === 'add' ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        {view === 'add' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full" />}
                        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="text-[10px] font-bold uppercase tracking-widest mt-1">ADD</span>
                    </button>

                    <button
                        onClick={() => setView('products')}
                        className={`flex flex-col items-center gap-1 py-4 w-full transition-all relative ${view === 'products' ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        {view === 'products' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full" />}
                        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" opacity="0.1" />
                            <rect width="18" height="18" x="3" y="3" rx="4" />
                        </svg>
                        <span className="text-[10px] font-bold uppercase tracking-widest mt-1">PRODUCTS</span>
                    </button>
                </nav>

                <div className="mt-auto">
                    <button
                        onClick={() => setIsAuthorized(false)}
                        className="p-3 text-gray-300 hover:text-red-400 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-12 lg:p-16">
                <header className="mb-12 flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
                            {view === 'add' ? '新增产品' : '管理产品'}
                        </h1>
                        <p className="text-gray-400 font-medium">
                            {view === 'add' ? '创建并由发布新的产品信息到画廊' : `当前共有 ${products.length} 个产品在展示`}
                        </p>
                    </div>
                </header>

                {view === 'add' ? (
                    <form onSubmit={handleSubmit} className="space-y-10">
                        <div className="flex flex-col lg:flex-row gap-8">
                            {/* Product Details Card */}
                            <div className="flex-1 bg-white rounded-[40px] p-10 shadow-[0_15px_50px_-15px_rgba(0,0,0,0.05)] border border-gray-50">
                                <h2 className="text-xl font-bold text-gray-800 mb-8">产品详情</h2>
                                <div className="space-y-8">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-400 ml-1">产品名称</label>
                                        <input
                                            name="title"
                                            type="text"
                                            required
                                            className="w-full px-6 py-4 rounded-2xl bg-[#fcfdfe] border border-gray-100 focus:border-blue-300 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-gray-700"
                                            placeholder="Product Title"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-400 ml-1">详细描述</label>
                                        <textarea
                                            name="description"
                                            required
                                            rows={4}
                                            className="w-full px-6 py-4 rounded-2xl bg-[#fcfdfe] border border-gray-100 focus:border-blue-300 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-gray-700 resize-none"
                                            placeholder="Multi Description"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Product Images Card */}
                            <div className="w-full lg:w-[400px] bg-white rounded-[40px] p-10 shadow-[0_15px_50px_-15px_rgba(0,0,0,0.05)] border border-gray-50 flex flex-col">
                                <h2 className="text-xl font-bold text-gray-800 mb-8">产品图片</h2>

                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex-1 border-2 border-dashed border-gray-100 rounded-[30px] bg-[#fcfdfe] hover:bg-blue-50/30 hover:border-blue-200 transition-all flex flex-col items-center justify-center p-8 cursor-pointer group"
                                >
                                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <svg className="w-8 h-8 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                    <p className="text-gray-400 text-sm font-medium mb-6">Drag or Drop Prop</p>
                                    <button type="button" className="px-8 py-3 bg-white border border-blue-500 text-blue-500 rounded-2xl font-bold text-sm shadow-md shadow-blue-50 hover:bg-blue-500 hover:text-white transition-all">
                                        Upload Files
                                    </button>
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        ref={fileInputRef}
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                </div>

                                {/* Selected Files Preview */}
                                {selectedFiles.length > 0 && (
                                    <div className="mt-6 flex flex-wrap gap-2">
                                        {selectedFiles.map((file, idx) => (
                                            <div key={idx} className="relative w-12 h-12 rounded-xl overflow-hidden border border-gray-200">
                                                <img
                                                    src={URL.createObjectURL(file)}
                                                    className="w-full h-full object-cover"
                                                    alt=""
                                                />
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"
                                                >
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button
                                type="submit"
                                disabled={isUploading}
                                className="px-10 py-5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-extrabold rounded-2xl shadow-2xl shadow-blue-100 transition-all transform active:scale-[0.98] min-w-[200px]"
                            >
                                {isUploading ? 'SAVING...' : 'Save Product'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setView('products')}
                                className="px-10 py-5 bg-gray-100 hover:bg-gray-200 text-gray-400 font-extrabold rounded-2xl transition-all min-w-[150px]"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {products.length === 0 ? (
                            <div className="col-span-full py-20 bg-white rounded-[40px] text-center border-2 border-dashed border-gray-100">
                                <p className="text-gray-300 font-bold text-xl mb-4">暂无数据</p>
                                <button
                                    onClick={() => setView('add')}
                                    className="text-blue-500 font-bold hover:underline"
                                >
                                    点击此处添加您的第一个产品
                                </button>
                            </div>
                        ) : (
                            products.map((product) => (
                                <div key={product.id} className="bg-white rounded-[40px] p-8 shadow-[0_15px_50px_-15px_rgba(0,0,0,0.05)] border border-gray-50 flex gap-6 hover:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.08)] transition-all">
                                    <div className="w-24 h-24 rounded-3xl overflow-hidden bg-gray-50 flex-shrink-0">
                                        <img src={product.images[0]} className="w-full h-full object-cover" alt="" />
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-800 truncate mb-1">{product.title}</h3>
                                            <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed">{product.description}</p>
                                        </div>
                                        <div className="flex gap-4 items-center">
                                            <span className="text-[10px] bg-blue-50 text-blue-500 font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                                                {product.images.length} Photos
                                            </span>
                                            <button
                                                onClick={() => handleDelete(product.id)}
                                                className="text-xs font-bold text-red-400 hover:text-red-500 transition-colors uppercase tracking-wider ml-auto"
                                            >
                                                Delete
                                            </button>
                                        </div>
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
