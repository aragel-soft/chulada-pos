-- ============================================
-- MIGRATION 034: CREATE RETURNS SCHEMA
-- ============================================

-- 1. Tabla returns
CREATE TABLE IF NOT EXISTS returns (
    id TEXT PRIMARY KEY NOT NULL,
    folio INTEGER NOT NULL UNIQUE,
    sale_id TEXT NOT NULL,
    return_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    total DECIMAL(10,2) NOT NULL,
    reason TEXT NOT NULL,
    refund_method TEXT NOT NULL DEFAULT 'cash', -- Solo efectivo por ahora
    user_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_synced BOOLEAN DEFAULT 0,
    synced_at DATETIME,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 2. Tabla return_items
CREATE TABLE IF NOT EXISTS return_items (
    id TEXT PRIMARY KEY NOT NULL,
    return_id TEXT NOT NULL,
    sale_item_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE CASCADE,
    FOREIGN KEY (sale_item_id) REFERENCES sale_items(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Indices para rendimiento
CREATE INDEX IF NOT EXISTS idx_returns_sale_id ON returns(sale_id);
CREATE INDEX IF NOT EXISTS idx_returns_folio ON returns(folio);
CREATE INDEX IF NOT EXISTS idx_returns_date ON returns(return_date);
CREATE INDEX IF NOT EXISTS idx_return_items_return_id ON return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_return_items_sale_item_id ON return_items(sale_item_id);
