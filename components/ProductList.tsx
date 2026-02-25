import React, { useState } from 'react';
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  AlertTriangle,
  GripVertical,
} from 'lucide-react';
import { Product } from '../types';
import { formatDate } from '../utils/helpers';

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ProductListProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onAddNew: () => void;
  onReorder: (products: Product[]) => void;
}

// --- Sortable Row Sub-component ---
const SortableRow: React.FC<{
  product: Product;
  onEdit: (product: Product) => void;
  onDeleteRequest: (id: string) => void;
  isDragDisabled: boolean;
}> = ({ product, onEdit, onDeleteRequest, isDragDisabled }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id, disabled: isDragDisabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto' as any,
    position: 'relative' as any,
    opacity: isDragging ? 0.85 : 1,
    boxShadow: isDragging ? '0 8px 25px rgba(0,0,0,0.15)' : 'none',
    backgroundColor: isDragging ? '#f8fafc' : undefined,
  };

  return (
    <tr ref={setNodeRef} style={style} className="hover:bg-slate-50/50 transition-colors group">
      {/* Drag Handle */}
      <td className="pl-2 pr-0 py-4 w-8">
        {!isDragDisabled && (
          <button
            {...attributes}
            {...listeners}
            className="p-1 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing rounded touch-none"
            title="拖动排序"
          >
            <GripVertical size={16} />
          </button>
        )}
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center">
          <div className="h-12 w-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0">
            {product.images[0] ? (
              <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">No Img</div>
            )}
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-slate-900">{product.title}</div>
            <div className="text-xs text-slate-500 line-clamp-1 max-w-xs">{product.description}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
        <span className="text-sm text-slate-500">{formatDate(product.createdAt)}</span>
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end space-x-2">
          <button
            onClick={() => onEdit(product)}
            className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            title="Edit"
          >
            <Edit3 size={18} />
          </button>
          <button
            onClick={() => onDeleteRequest(product.id)}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </td>
    </tr>
  );
};

// --- Main ProductList Component ---
export const ProductList: React.FC<ProductListProps> = ({
  products,
  onEdit,
  onDelete,
  onAddNew,
  onReorder,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const isSearchActive = searchTerm.trim().length > 0;

  const filteredProducts = isSearchActive
    ? products.filter(p =>
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
    : products;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = products.findIndex(p => p.id === active.id);
    const newIndex = products.findIndex(p => p.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(products, oldIndex, newIndex).map((p, idx) => ({
      ...p,
      sort_order: idx,
    }));
    onReorder(reordered);
  };

  return (
    <>
      <div className="animate-fade-in">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Products</h1>
            <p className="text-slate-500 text-sm mt-1">Manage your product inventory — drag to reorder</p>
          </div>
          <button
            onClick={onAddNew}
            className="inline-flex items-center justify-center px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors shadow-lg shadow-slate-900/20 active:scale-95"
          >
            <Plus size={18} className="mr-2" />
            Add Product
          </button>
        </div>

        {/* Search & Stats */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex items-center justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
            />
          </div>
          <div className="hidden sm:block text-sm text-slate-500 font-medium">
            Total: <span className="text-slate-900">{products.length}</span> items
          </div>
        </div>

        {/* Product Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {filteredProducts.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="text-slate-300" size={24} />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-1">No products found</h3>
              <p className="text-slate-500 text-sm">Try adjusting your search or add a new product.</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={filteredProducts.map(p => p.id)} strategy={verticalListSortingStrategy}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="pl-2 pr-0 py-4 w-8"></th>
                        <th className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Date Added</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredProducts.map((product) => (
                        <SortableRow
                          key={product.id}
                          product={product}
                          onEdit={onEdit}
                          onDeleteRequest={setDeleteId}
                          isDragDisabled={isSearchActive}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {isSearchActive && (
          <p className="text-xs text-slate-400 mt-3 text-center">拖拽排序在搜索时不可用，请先清空搜索条件。</p>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setDeleteId(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-scale-up">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Product?</h3>
            <p className="text-sm text-slate-500 mb-6">
              Are you sure you want to delete this product? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDelete(deleteId);
                  setDeleteId(null);
                }}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors shadow-lg shadow-red-600/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
