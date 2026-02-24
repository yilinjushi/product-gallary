import React, { useState, useRef } from 'react';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Upload,
  X,
  ChevronLeft,
  Loader2,
  Save,
  GripVertical,
} from 'lucide-react';
import { Product, ProductFormData } from '../types';
import { supabase } from '../utils/supabaseClient';

type ImageItem = { type: 'url'; url: string } | { type: 'file'; file: File; id: string };

function getItemId(item: ImageItem): string {
  return item.type === 'url' ? item.url : item.id;
}

function SortableImageCard({
  item,
  index,
  onRemove,
  onMove,
}: {
  item: ImageItem;
  index: number;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const id = getItemId(item);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group aspect-square rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm ${isDragging ? 'z-50 opacity-90 shadow-lg' : ''}`}
    >
      {item.type === 'url' ? (
        <img src={item.url} alt="" className="w-full h-full object-cover" />
      ) : (
        <>
          <img
            src={URL.createObjectURL(item.file)}
            alt=""
            className="w-full h-full object-cover opacity-90"
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="bg-black/50 text-white text-[10px] px-2 py-1 rounded-full">Pending</span>
          </div>
        </>
      )}
      <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-all duration-200" />
      {/* 拖拽手柄 */}
      <div
        className="absolute top-2 left-2 p-1.5 bg-white/95 rounded-lg shadow border border-slate-200 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        {...attributes}
        {...listeners}
        title="拖动排序"
      >
        <GripVertical size={16} className="text-slate-500" />
      </div>
      {/* 前移 */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        <button
          type="button"
          onClick={() => onMove(-1)}
          disabled={index === 0}
          className="p-3 bg-white/95 rounded-xl hover:bg-slate-50 shadow-md border border-slate-200 disabled:opacity-40 disabled:pointer-events-none pointer-events-auto"
          title="前移"
        >
          <ChevronLeft size={28} strokeWidth={2} />
        </button>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="absolute bottom-2 right-2 p-1.5 bg-white rounded-lg hover:bg-red-50 text-slate-700 hover:text-red-600 shadow-sm border border-slate-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        title="删除"
      >
        <X size={14} />
      </button>
    </div>
  );
}

interface ProductFormProps {
  mode: 'create' | 'edit';
  initialData?: Product;
  onSubmit: (data: ProductFormData) => void | Promise<void>;
  onCancel: () => void;
}

export const ProductForm: React.FC<ProductFormProps> = ({
  mode,
  initialData,
  onSubmit,
  onCancel,
}) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [tag, setTag] = useState(initialData?.tag || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [imageItems, setImageItems] = useState<ImageItem[]>(() =>
    (initialData?.images || []).map((url) => ({ type: 'url' as const, url }))
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setError(null);
    const files = Array.from(e.target.files) as File[];
    if (imageItems.length + files.length > 10) {
      setError('You can only have a maximum of 10 images.');
      return;
    }
    setImageItems((prev) => [
      ...prev,
      ...files.map((file) => ({
        type: 'file' as const,
        file,
        id: `f-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      })),
    ]);
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImageItems((prev) => prev.filter((_, i) => i !== index));
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= imageItems.length) return;
    setImageItems((prev) => {
      const arr = [...prev];
      [arr[index], arr[next]] = [arr[next], arr[index]];
      return arr;
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = imageItems.findIndex((i) => getItemId(i) === active.id);
    const newIndex = imageItems.findIndex((i) => getItemId(i) === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    setImageItems((prev) => arrayMove(prev, oldIndex, newIndex));
  };

  const uploadFiles = async (files: File[]): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of files) {
      const ext = file.name.split('.').pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(path, file, { upsert: false });
      if (uploadError) throw new Error(`图片上传失败: ${uploadError.message}`);
      const { data } = supabase.storage.from('product-images').getPublicUrl(path);
      if (data?.publicUrl) urls.push(data.publicUrl);
    }
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Product title is required.');
      return;
    }
    if (imageItems.length === 0) {
      setError('At least one product image is required.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const filesInOrder = imageItems
        .filter((item): item is Extract<ImageItem, { type: 'file' }> => item.type === 'file')
        .map((item) => item.file);
      const uploadedUrls = await uploadFiles(filesInOrder);
      let fileIndex = 0;
      const finalImageList = imageItems.map((item) =>
        item.type === 'url' ? item.url : uploadedUrls[fileIndex++]
      );
      await onSubmit({
        title,
        description,
        images: finalImageList,
        tag: tag.trim() || undefined,
      });
    } catch (err: any) {
      const msg = err?.message || err?.error_description || 'Failed to save product. Please try again.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onCancel}
          className="flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center mr-2 group-hover:border-slate-300 transition-colors shadow-sm">
            <ChevronLeft size={16} />
          </div>
          Back to list
        </button>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          {mode === 'create' ? 'Add New Product' : 'Edit Product'}
        </h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">

          {/* Image Upload & Order */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-slate-900">Product Images</label>
              <span className="text-xs text-slate-500">
                {imageItems.length} / 10 · 顺序即前台显示顺序，首张为默认图
              </span>
            </div>
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <SortableContext
                items={imageItems.map(getItemId)}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {imageItems.length < 10 && (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-primary-400 transition-all cursor-pointer flex flex-col items-center justify-center group"
                    >
                      <div className="p-3 bg-white rounded-full shadow-sm mb-2 group-hover:scale-110 group-hover:shadow-md transition-all duration-200">
                        <Upload size={20} className="text-slate-400 group-hover:text-primary-600" />
                      </div>
                      <span className="text-xs font-medium text-slate-500 group-hover:text-primary-600">Upload</span>
                    </div>
                  )}
                  {imageItems.map((item, idx) => (
                    <SortableImageCard
                      key={getItemId(item)}
                      item={item}
                      index={idx}
                      onRemove={() => removeImage(idx)}
                      onMove={(dir) => moveImage(idx, dir)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
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

          {/* Text Fields */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <label htmlFor="title" className="block text-sm font-semibold text-slate-900 mb-2">
                  Product Title
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Modern Leather Sofa"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none text-slate-900 placeholder:text-slate-400 font-medium"
                />
              </div>

              <div className="md:col-span-1">
                <label htmlFor="tag" className="block text-sm font-semibold text-slate-900 mb-2">
                  Tag / Category
                </label>
                <input
                  id="tag"
                  type="text"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  placeholder="e.g. New Arrival"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-semibold text-slate-900 mb-2">
                Description
              </label>
              <textarea
                id="description"
                rows={8}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the product features, materials, and dimensions..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none text-slate-900 placeholder:text-slate-400 resize-none leading-relaxed"
              />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-600 text-sm rounded-xl flex items-center animate-shake border border-red-100">
              <span className="mr-2">⚠️</span> {error}
            </div>
          )}

          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors border border-transparent hover:border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-2.5 rounded-xl text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 focus:ring-4 focus:ring-slate-900/20 active:scale-95 transition-all flex items-center disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-slate-900/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Uploading & Saving...
                </>
              ) : (
                <>
                  <Save size={16} className="mr-2" />
                  {mode === 'create' ? 'Create Product' : 'Save Changes'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};