-- ============================================
-- MIGRATION 049: ADD CLOSING SNAPSHOT TOTALS
-- Stores calculated financial totals at closing time as a permanent
-- snapshot, so the shift's history is reliable even if underlying
-- transactions change later (cancellations, adjustments, etc.).
-- ============================================

ALTER TABLE cash_register_shifts ADD COLUMN total_sales          DECIMAL(10,2);
ALTER TABLE cash_register_shifts ADD COLUMN total_cash_sales     DECIMAL(10,2);
ALTER TABLE cash_register_shifts ADD COLUMN total_card_sales     DECIMAL(10,2);
ALTER TABLE cash_register_shifts ADD COLUMN total_credit_sales   DECIMAL(10,2);
ALTER TABLE cash_register_shifts ADD COLUMN total_voucher_sales  DECIMAL(10,2);
ALTER TABLE cash_register_shifts ADD COLUMN total_debt_payments  DECIMAL(10,2);
ALTER TABLE cash_register_shifts ADD COLUMN debt_payments_cash   DECIMAL(10,2);
ALTER TABLE cash_register_shifts ADD COLUMN debt_payments_card   DECIMAL(10,2);
ALTER TABLE cash_register_shifts ADD COLUMN total_movements_in   DECIMAL(10,2);
ALTER TABLE cash_register_shifts ADD COLUMN total_movements_out  DECIMAL(10,2);
