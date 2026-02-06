import React, { useState, useRef } from 'react';
import { 
  Upload, 
  X, 
  ChevronLeft, 
  Loader2,
  Save
} from 'lucide-react';
import { Product, ProductFormData } from '../types';
import { supabase } from '../utils/supabaseClient';

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
  onCancel 
}) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [tag, setTag] = useState(initialData?.tag || '');
  const [description, setDescription] = useState(initialData?.description || '');
  // Stores URLs for display
  const [images, setImages] = useState<string[]>(initialData?.images || []);
  // Stores raw files pending upload
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setError(null);
      const filesArray = Array.from(e.target.files) as File[];
      
      const totalCount = images.length + pendingFiles.length + filesArray.length;
      if (totalCount > 10) {
        setError("You can only have a maximum of 10 images.");
        return;
      }

      // Add to pending
      setPendingFiles(prev => [...prev, ...filesArray]);
      
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (const file of pendingFiles) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, { upsert: false });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error(`图片上传失败: ${uploadError.message}`);
      }

      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      if (data?.publicUrl) {
        uploadedUrls.push(data.publicUrl);
      }
    }
    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Product title is required.");
      return;
    }
    if (images.length === 0 && pendingFiles.length === 0) {
      setError("At least one product image is required.");
      return;
    }

    setIsSubmitting(true);
    
    setError(null);
    try {
      // 1. Upload pending images
      const newImageUrls = await uploadImages();
      
      // 2. Combine with existing images
      const finalImageList = [...images, ...newImageUrls];

      // 3. Submit data (await so we catch DB errors)
      await onSubmit({ title, description, images: finalImageList, tag: tag.trim() || undefined });
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || err?.error_description || "Failed to save product. Please try again.";
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
          
          {/* Image Upload Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-slate-900">Product Images</label>
              <span className="text-xs text-slate-500">{images.length + pendingFiles.length} / 10 images</span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {/* Upload Button */}
              {images.length + pendingFiles.length < 10 && (
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

              {/* Existing Images */}
              {images.map((img, idx) => (
                <div key={`existing-${idx}`} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm">
                  <img src={img} alt={`Existing ${idx}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-all duration-200" />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity scale-90 group-hover:scale-100 duration-200">
                    <button
                      type="button"
                      onClick={() => removeExistingImage(idx)}
                      className="p-1.5 bg-white text-slate-700 rounded-lg hover:bg-red-50 hover:text-red-600 shadow-sm border border-slate-100"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}

              {/* Pending Files Previews */}
              {pendingFiles.map((file, idx) => (
                <div key={`pending-${idx}`} className="relative group aspect-square rounded-xl overflow-hidden border border-primary-200 bg-primary-50 shadow-sm">
                  <img src={URL.createObjectURL(file)} alt={`Pending ${idx}`} className="w-full h-full object-cover opacity-80" />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <span className="bg-black/50 text-white text-[10px] px-2 py-1 rounded-full">Pending</span>
                  </div>
                  <div className="absolute top-2 right-2">
                    <button
                      type="button"
                      onClick={() => removePendingFile(idx)}
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