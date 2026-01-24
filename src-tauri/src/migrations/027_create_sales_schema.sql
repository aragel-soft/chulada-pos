-- ============================================
-- MIGRATION 027: SALES SCHEMA
-- ============================================

-- 1. Tabla sales
CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY NOT NULL,
    folio TEXT NOT NULL UNIQUE, -- Changed to TEXT to support 'XAL1-...' format
    sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    subtotal DECIMAL(10,2) NOT NULL,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed', -- 'completed', 'cancelled'
    customer_id TEXT,
    user_id TEXT NOT NULL,
    cash_register_shift_id TEXT,
    payment_method TEXT NOT NULL, -- 'cash', 'card_transfer', 'credit', 'mixed'
    cash_amount DECIMAL(10,2) DEFAULT 0,
    card_transfer_amount DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    has_discount BOOLEAN DEFAULT 0,
    cancellation_reason TEXT,
    cancelled_by TEXT,
    cancelled_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_synced BOOLEAN DEFAULT 0,
    synced_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id), -- Assuming users table exists
    FOREIGN KEY (cash_register_shift_id) REFERENCES cash_register_shifts(id) -- Assuming shifts table exists
);

-- 2. Tabla sale_items
CREATE TABLE IF NOT EXISTS sale_items (
    id TEXT PRIMARY KEY NOT NULL,
    sale_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL, -- Snapshot
    product_code TEXT NOT NULL, -- Snapshot
    quantity DECIMAL(10,3) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    price_type TEXT NOT NULL, -- 'retail', 'wholesale'
    promotion_id TEXT,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    subtotal DECIMAL(10,2) NOT NULL,
    is_kit_item BOOLEAN DEFAULT 0,
    parent_sale_item_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id), -- Assuming products table exists
    FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_sale_item_id) REFERENCES sale_items(id)
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_sales_folio ON sales(folio);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_user ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
