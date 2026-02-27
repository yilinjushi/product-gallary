export interface Product {
  id: string;
  title: string;
  description: string;
  images: string[]; // Base64 or URL strings
  tag?: string;
  fav: number;
  views: number;
  sort_order: number;
  createdAt: number;
}

export interface ProductFormData {
  title: string;
  description: string;
  images: string[];
  tag?: string;
  fav: number;
  views: number;
}

export type ViewType = 'list' | 'create' | 'edit';

export type ViewState =
  | { type: 'list' }
  | { type: 'create' }
  | { type: 'edit'; product: Product }
  | { type: 'settings' }
  | { type: 'backup' };

export interface SiteSettings {
  id: number;
  about_text: string;
  contact_text: string;
}