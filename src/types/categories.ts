export interface CategoryListDto {
  id: string;
  name: string;
  description?: string;
  color: string;
  parent_id?: string;
  sequence: number;
  product_count: number;
  children_count: number;
  depth: number;
  created_at: string;
  is_active: boolean;
}

export interface CreateCategoryDto {
  name: string;
  parent_id?: string | null;
  color: string;
  sequence: number;
  description?: string;
}

export interface UpdateCategoryDto {
  id: string;
  name: string;
  parent_id?: string | null;
  color: string;
  sequence: number;
  description?: string | null;
  is_active?: boolean;
}