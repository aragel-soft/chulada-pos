-- ============================================
-- MIGRATION 040: CREATE SALE VOUCHERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS sale_vouchers (
    id TEXT PRIMARY KEY NOT NULL,
    sale_id TEXT NOT NULL,
    voucher_id TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (voucher_id) REFERENCES store_vouchers(id)
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_sale_vouchers_sale_id ON sale_vouchers(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_vouchers_voucher_id ON sale_vouchers(voucher_id);
