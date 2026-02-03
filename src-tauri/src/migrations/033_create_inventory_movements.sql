-- ====================================================
-- MIGRATION 033: ESQUEMA DE MOVIMIENTOS DE INVENTARIO
-- ====================================================

CREATE TABLE IF NOT EXISTS inventory_movements (
  id TEXT PRIMARY KEY NOT NULL,
  product_id TEXT NOT NULL,
  store_id TEXT NOT NULL,       -- Preparado para multi-sucursal
  user_id TEXT NOT NULL,        -- Usuario responsable
  type TEXT NOT NULL CHECK(type IN ('IN', 'OUT')),
  reason TEXT NOT NULL,         -- 'SALE', 'PURCHASE', 'ADJUSTMENT', 'RETURN', 'DAMAGED'
  quantity INTEGER NOT NULL,    -- Siempre positivo
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  cost DECIMAL(10,2),           -- Costo al momento del movimiento
  reference TEXT,               -- Opcional: UUID Venta
  notes TEXT,                   -- Comentarios adicionales
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  
  -- Foreign Keys con restricción para no romper historial
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- Índices para optimizar reportes y búsquedas
CREATE INDEX IF NOT EXISTS idx_movements_product ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_movements_date ON inventory_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_movements_type ON inventory_movements(type);
