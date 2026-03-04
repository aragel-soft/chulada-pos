-- ============================================
-- MIGRATION 011: ESQUEMA DE INVENTARIO
-- ============================================

-- 1. Categorías
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  parent_category_id TEXT,
  color TEXT,
  is_active BOOLEAN DEFAULT 1,
  sequence INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  FOREIGN KEY (parent_category_id) REFERENCES categories(id)
);

-- 2. Productos
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  barcode TEXT,
  name TEXT NOT NULL,
  description TEXT,
  category_id TEXT NOT NULL,
  retail_price DECIMAL(10,2) NOT NULL,
  wholesale_price DECIMAL(10,2) NOT NULL,
  purchase_price DECIMAL(10,2) DEFAULT 0,
  unit_of_measure TEXT DEFAULT 'piece',
  image_url TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- 3. Inventario (Separado para soporte multi-tienda futuro)
CREATE TABLE IF NOT EXISTS store_inventory (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL, 
  product_id TEXT NOT NULL,
  stock INTEGER DEFAULT 0,
  minimum_stock INTEGER DEFAULT 5,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id),
  UNIQUE(store_id, product_id)
);

-- Índices para optimizar búsquedas
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_code_active 
ON products(code) 
WHERE deleted_at IS NULL;