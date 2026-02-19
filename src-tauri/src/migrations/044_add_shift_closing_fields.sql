-- ============================================
-- MIGRATION 044: ADD SHIFT CLOSING FIELDS
-- Adds columns needed for the guided cash cut process
-- ============================================

ALTER TABLE cash_register_shifts ADD COLUMN expected_cash DECIMAL(10,2);
ALTER TABLE cash_register_shifts ADD COLUMN cash_difference DECIMAL(10,2);
ALTER TABLE cash_register_shifts ADD COLUMN card_terminal_total DECIMAL(10,2);
ALTER TABLE cash_register_shifts ADD COLUMN card_expected_total DECIMAL(10,2);
ALTER TABLE cash_register_shifts ADD COLUMN card_difference DECIMAL(10,2);
ALTER TABLE cash_register_shifts ADD COLUMN cash_withdrawal DECIMAL(10,2);
