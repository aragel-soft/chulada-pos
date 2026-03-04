-- ============================================
-- MIGRATION 045: REPORT PERFORMANCE INDEXES
-- ============================================
-- Adds composite index on sales(created_at, status) to optimize
-- report queries that filter by date range and completed status.
-- Also adds index on sale_items(product_id) for the JOIN in profit calculations.

CREATE INDEX IF NOT EXISTS idx_sales_created_at_status ON sales(created_at, status);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);
