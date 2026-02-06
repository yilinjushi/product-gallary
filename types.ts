export interface Product {
  id: string;
  title: string;
  description: string;
  images: string[]; // Base64 or URL strings
  tag?: string;
  createdAt: number;
}

export interface ProductFormData {
  title: string;
  description: string;
  images: string[];
  tag?: string;
}

export type ViewType = 'list' | 'create' | 'edit';

export type ViewState = 
  | { type: 'list' }
  | { type: 'create' }
  | { type: 'edit'; product: Product };