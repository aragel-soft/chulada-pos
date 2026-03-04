-- ==================================================================
-- MIGRATION 027: ESQUEMA DE PROMOCIONES Y COMBOS
-- ==================================================================

-- TABLA 1: Cabecera de Promociones
-- Define la vigencia, el precio final del paquete y el estado general.
CREATE TABLE promotions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'combo', 
  combo_price DECIMAL(10,2) NOT NULL,
  start_date TEXT NOT NULL, -- ISO8601 YYYY-MM-DD
  end_date TEXT NOT NULL,   -- ISO8601 YYYY-MM-DD
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME
);

-- TABLA 2: Relación de Productos (El contenido del Combo)
-- Relaciona N productos a 1 promoción.
CREATE TABLE promotion_combos (
  id TEXT PRIMARY KEY,
  promotion_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  
  -- Integridad Referencial: Si borras la promo, se borran sus items.
  FOREIGN KEY(promotion_id) REFERENCES promotions(id) ON DELETE CASCADE,
  FOREIGN KEY(product_id) REFERENCES products(id)
);

-- ÍNDICES DE RENDIMIENTO
-- Evita duplicar el mismo producto en la misma promo
CREATE UNIQUE INDEX idx_promo_product_unique ON promotion_combos(promotion_id, product_id);
-- Optimiza la búsqueda de promociones vigentes
CREATE INDEX idx_promotions_dates ON promotions(start_date, end_date) WHERE deleted_at IS NULL;
