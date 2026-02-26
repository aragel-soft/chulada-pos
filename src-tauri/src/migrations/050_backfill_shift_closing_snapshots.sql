-- ============================================
-- MIGRATION 050: BACKFILL CLOSING SNAPSHOT TOTALS
-- Populates the snapshot columns (added in 049) for all existing
-- CLOSED shifts by recalculating from transactional data.
--
-- Uses the same logic as `calculate_shift_totals` in shifts.rs.
-- ============================================

UPDATE cash_register_shifts
SET
    -- Sales totals
    total_sales = (
        SELECT COALESCE(SUM(s.total), 0.0)
        FROM sales s
        WHERE s.cash_register_shift_id = cash_register_shifts.id
          AND NOT s.status = 'canceled'
    )
WHERE status = 'closed';
