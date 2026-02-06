'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, ChevronLeft, Loader2, Save } from 'lucide-react';
import type { AdminProduct } from '../types';

const MAX_IMAGES = 10;
const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB

interface ProductFormProps {
  mode: 'create' | 'edit';
  initialData?: AdminProduct;
  onSubmit: (data: { title: string; description: string; imageFiles: File[] }) => Promise<void>;
  onCancel: () => void;
}

export function ProductForm({ mode, initialData, onSubmit, onCancel }: ProductFormProps) {
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [existingUrls] = useState<string[]>(initialData?.images ?? []);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const newPreviews = newFiles.map((f) => ({ file: f, url: URL.createObjectURL(f) }));

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setError(null);
    const files = Array.from(e.target.files);
    const total = existingUrls.length + newFiles.length + files.length;
    if (total > MAX_IMAGES) {
      setError(`最多上传 ${MAX_IMAGES} 张图片。`);
      return;
    }
    const valid = files.filter((f) => {
      if (f.size > MAX_FILE_SIZE) {
        setError(`文件 ${f.name} 超过 3MB`);
        return false;
      }
      return true;
    });
    setNewFiles((prev) => [...prev, ...valid]);
    e.target.value = '';
  };

  const removeNewFile = (index: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('请填写产品标题');
      return;
    }
    const hasImages = mode === 'create' ? newFiles.length > 0 : existingUrls.length > 0 || newFiles.length > 0;
    if (!hasImages) {
      setError('请至少上传一张产品图片');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({ title: title.trim(), description: description.trim(), imageFiles: newFiles });
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center mr-2 group-hover:border-slate-300 transition-colors shadow-sm">
            <ChevronLeft size={16} />
          </div>
          返回列表
        </button>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          {mode === 'create' ? '添加产品' : '编辑产品'}
        </h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-slate-900">产品图片</label>
              <span className="text-xs text-slate-500">
                {existingUrls.length + newFiles.length} / {MAX_IMAGES}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {existingUrls.length + newFiles.length < MAX_IMAGES && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-indigo-400 transition-all cursor-pointer flex flex-col items-center justify-center group"
                >
                  <div className="p-3 bg-white rounded-full shadow-sm mb-2 group-hover:scale-110 group-hover:shadow-md transition-all duration-200">
                    <Upload size={20} className="text-slate-400 group-hover:text-indigo-600" />
                  </div>
                  <span className="text-xs font-medium text-slate-500 group-hover:text-indigo-600">上传</span>
                </div>
              )}
              {existingUrls.map((url, idx) => (
                <div key={`e-${idx}`} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
              {newPreviews.map(({ file, url }, idx) => (
                <div key={`n-${idx}`} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <div className="absolute top-2 right-2">
                    <button
                      type="button"
                      onClick={() => removeNewFile(idx)}
                      className="p-1.5 bg-white text-slate-700 rounded-lg hover:bg-red-50 hover:text-red-600 shadow-sm border border-slate-100"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*"
              multiple
            />
          </div>

          <div className="h-px bg-slate-100" />

          <div className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-semibold text-slate-900 mb-2">
                产品标题
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：涂鸦WIFI智能气象钟"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-slate-900 placeholder:text-slate-400 font-medium"
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-semibold text-slate-900 mb-2">
                描述
              </label>
              <textarea
                id="description"
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="描述产品特点、材质等..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-slate-900 placeholder:text-slate-400 resize-none leading-relaxed"
              />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-600 text-sm rounded-xl flex items-center border border-red-100">
              <span className="mr-2">⚠️</span> {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors border border-transparent hover:border-slate-200"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-2.5 rounded-xl text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 focus:ring-4 focus:ring-slate-900/20 active:scale-95 transition-all flex items-center disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-slate-900/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save size={16} className="mr-2" />
                  {mode === 'create' ? '创建产品' : '保存'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
