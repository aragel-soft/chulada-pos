-- ============================================
-- MIGRATION 048: SIMPLIFY CASH REGISTER SHIFTS
-- Removes columns that depended on manual physical cash counting.
-- The closing flow now uses system-calculated amounts only.
-- ============================================

ALTER TABLE cash_register_shifts DROP COLUMN final_cash;
ALTER TABLE cash_register_shifts DROP COLUMN cash_difference;
ALTER TABLE cash_register_shifts DROP COLUMN card_terminal_total;
ALTER TABLE cash_register_shifts DROP COLUMN card_expected_total;
ALTER TABLE cash_register_shifts DROP COLUMN card_difference;
