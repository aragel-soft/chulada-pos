-- ============================================
-- MIGRATION 049: ADD CLOSING SNAPSHOT TOTALS
-- Stores calculated financial total sales
-- ============================================

ALTER TABLE cash_register_shifts ADD COLUMN total_sales          DECIMAL(10,2);
