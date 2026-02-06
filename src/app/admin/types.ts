/** Admin UI 使用的产品类型（id 为字符串便于与 luxeadmin 组件兼容） */
export interface AdminProduct {
  id: string;
  title: string;
  description: string;
  images: string[];
  createdAt: number;
}

export type ViewState =
  | { type: 'list' }
  | { type: 'create' }
  | { type: 'edit'; product: AdminProduct };
