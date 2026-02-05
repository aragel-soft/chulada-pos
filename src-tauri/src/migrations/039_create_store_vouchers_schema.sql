-- ============================================
-- MIGRATION 039: CREATE STORE VOUCHERS SCHEMA
-- ============================================

-- 1. Crear tabla store_vouchers
CREATE TABLE IF NOT EXISTS store_vouchers (
    id TEXT PRIMARY KEY NOT NULL,
    sale_id TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    initial_balance DECIMAL(10,2) NOT NULL,
    current_balance DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    used_at DATETIME,
    expires_at DATETIME,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
);

-- 2. Añadir columnas a la tabla returns
ALTER TABLE returns ADD COLUMN notes TEXT;

-- 3. Actualizar tabla sales para status de devoluciones
ALTER TABLE sales ADD COLUMN return_status TEXT DEFAULT 'none' CHECK(return_status IN ('none', 'partial_return', 'fully_returned'));

-- 4. Indices para rendimiento
CREATE INDEX IF NOT EXISTS idx_store_vouchers_sale_id ON store_vouchers(sale_id);
CREATE INDEX IF NOT EXISTS idx_store_vouchers_code ON store_vouchers(code);
CREATE INDEX IF NOT EXISTS idx_store_vouchers_active ON store_vouchers(is_active);
CREATE INDEX IF NOT EXISTS idx_sales_return_status ON sales(return_status);

-- 5. Actualizar datos existentes
UPDATE sales SET return_status = 'none' WHERE return_status IS NULL;
