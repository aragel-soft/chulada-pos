-- ============================================
-- MIGRATION 049: ADD CLOSING SNAPSHOT TOTALS
-- Stores calculated financial totals at closing time as a permanent
-- snapshot, so the shift's history is reliable even if underlying
-- transactions change later (cancellations, adjustments, etc.).
-- ============================================

ALTER TABLE cash_register_shifts ADD COLUMN total_sales          DECIMAL(10,2);
