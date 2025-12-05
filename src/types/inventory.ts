export interface Product {
  id: string;
  code: string;
  barcode?: string; 
  name: string;
  category_name?: string;
  retail_price: number;
  wholesale_price: number;
  stock: number;
  min_stock: number;
  image_url?: string;
  is_active: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}