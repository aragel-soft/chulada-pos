export interface Product {
  id: string;
  code: string;
  barcode?: string; 
  name: string;
  description?: string;
  category_id: string;
  category_name?: string;
  category_color?: string;
  retail_price: number;
  wholesale_price: number;
  purchase_price?: number;
  stock: number;
  min_stock: number;
  image_url?: string;
  is_active: boolean;
  created_at: string;
}

export interface CreateProductPayload {
  code: string;
  barcode?: string;
  name: string;
  description?: string;
  category_id: string;
  retail_price: number;
  wholesale_price: number;
  purchase_price?: number;
  stock?: number;
  min_stock?: number;
  image_url?: string; 
}

// TODO: Hacer genérica esta interfaz para paginación, algo como QueryResult<T>
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface Category {
  id: string;
  name: string;
  color?: string;
}

export type ImageAction = 'Keep' | 'Remove' | 'Replace';

export interface ProductDetail extends Omit<Product, 'current_stock'> {
  description?: string;
  purchase_price: number;
  stock: number;    
  min_stock: number;  
  tags: string[];     
}
export interface UpdateProductPayload {
  id: string;
  code: string;
  barcode?: string;
  name: string;
  description?: string;
  category_id: string;
  retail_price: number;
  wholesale_price: number;
  purchase_price?: number;
  min_stock?: number; 
  is_active: boolean;
  tags: string[];
  image_action: ImageAction;
  new_image_bytes?: number[];
}

export interface BulkUpdateProductsPayload {
  ids: string[];
  category_id?: string;
  is_active?: boolean;
  retail_price?: number;
  wholesale_price?: number;
  tags_to_add?: string[];
}
