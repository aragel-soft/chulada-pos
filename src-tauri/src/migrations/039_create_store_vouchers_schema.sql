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

-- 3. Indices para rendimiento
CREATE INDEX IF NOT EXISTS idx_store_vouchers_sale_id ON store_vouchers(sale_id);
CREATE INDEX IF NOT EXISTS idx_store_vouchers_code ON store_vouchers(code);
CREATE INDEX IF NOT EXISTS idx_store_vouchers_active ON store_vouchers(is_active);

-- 4. Quitar la columna de notas de cancelación en sales
ALTER TABLE sales DROP COLUMN cancellation_reason;
ALTER TABLE sales DROP COLUMN cancelled_by;
ALTER TABLE sales DROP COLUMN cancelled_at;
