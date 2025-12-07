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

