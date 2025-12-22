-- ============================================
-- MIGRATION 018: ESQUEMA DE KITS / PAQUETES
-- ============================================

-- 1. Cabecera (Reglas del Kit)
CREATE TABLE IF NOT EXISTS product_kit_options (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  -- is_required: Si es 1, el sistema debe obligar/agregar el regalo.
  is_required BOOLEAN DEFAULT 1, 
  -- max_selections: Por defecto 1 para cumplir regla "1 a 1" (un regalo por compra).
  -- Si se quisiera "Compra 1 y llévate 2 cosas", se cambiaría este valor.
  max_selections INTEGER DEFAULT 1, 
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME
);

-- 2. Items (Lo que se lleva de regalo o incluido)
CREATE TABLE IF NOT EXISTS product_kit_items (
  id TEXT PRIMARY KEY,
  kit_option_id TEXT NOT NULL,
  included_product_id TEXT NOT NULL,
  -- quantity: Por defecto 1. Define cuántas unidades de ESTE producto específico se regalan.
  quantity INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(kit_option_id) REFERENCES product_kit_options(id) ON DELETE CASCADE,
  FOREIGN KEY(included_product_id) REFERENCES products(id)
);

-- 3. Triggers (Productos que activan/disparan la regla)
-- Relación Muchos a Uno: Varios productos pueden activar la misma regla.
CREATE TABLE IF NOT EXISTS product_kit_main (
  kit_option_id TEXT NOT NULL,
  main_product_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(kit_option_id) REFERENCES product_kit_options(id) ON DELETE CASCADE,
  FOREIGN KEY(main_product_id) REFERENCES products(id) ON DELETE CASCADE,
  PRIMARY KEY(kit_option_id, main_product_id)
);

-- Índices
-- idx_one_kit_per_product: Garantiza que un producto main solo dispare un kit a la vez.
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_kit_per_product ON product_kit_main(main_product_id);
CREATE INDEX IF NOT EXISTS idx_kit_items_option ON product_kit_items(kit_option_id);
