import type { Product } from '@/lib/db';

/** 将 DB 的 Product 转为 Admin 使用的 AdminProduct */
export function toAdminProduct(p: Product): { id: string; title: string; description: string; images: string[]; createdAt: number } {
  return {
    id: String(p.id),
    title: p.title,
    description: p.description,
    images: p.images ?? [],
    createdAt: p.created_at ? new Date(p.created_at).getTime() : Date.now(),
  };
}

export function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(timestamp));
}
