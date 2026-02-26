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
          AND s.status = 'completed'
    ),
    total_card_sales = (
        SELECT COALESCE(SUM(s.card_transfer_amount), 0.0)
        FROM sales s
        WHERE s.cash_register_shift_id = cash_register_shifts.id
          AND s.status = 'completed'
    ),
    total_credit_sales = (
        SELECT COALESCE(SUM(s.total), 0.0)
        FROM sales s
        WHERE s.cash_register_shift_id = cash_register_shifts.id
          AND s.payment_method = 'credit'
    ),
    total_voucher_sales = (
        SELECT COALESCE(SUM(sv.amount), 0.0)
        FROM sale_vouchers sv
        INNER JOIN sales s ON sv.sale_id = s.id
        WHERE s.cash_register_shift_id = cash_register_shifts.id
          AND s.status = 'completed'
    ),
    -- Cash sales = total - card - credit - voucher (derived)
    total_cash_sales = (
        SELECT
            COALESCE(SUM(s.total), 0.0)
            - COALESCE(SUM(s.card_transfer_amount), 0.0)
            - (
                SELECT COALESCE(SUM(s2.total), 0.0)
                FROM sales s2
                WHERE s2.cash_register_shift_id = cash_register_shifts.id
                  AND s2.payment_method = 'credit'
            )
            - (
                SELECT COALESCE(SUM(sv2.amount), 0.0)
                FROM sale_vouchers sv2
                INNER JOIN sales s3 ON sv2.sale_id = s3.id
                WHERE s3.cash_register_shift_id = cash_register_shifts.id
                  AND s3.status = 'completed'
            )
        FROM sales s
        WHERE s.cash_register_shift_id = cash_register_shifts.id
          AND s.status = 'completed'
    ),
    -- Debt payments
    total_debt_payments = (
        SELECT COALESCE(SUM(dp.amount), 0.0)
        FROM debt_payments dp
        WHERE dp.cash_register_shift_id = cash_register_shifts.id
    ),
    debt_payments_cash = (
        SELECT COALESCE(SUM(dp.cash_amount), 0.0)
        FROM debt_payments dp
        WHERE dp.cash_register_shift_id = cash_register_shifts.id
    ),
    debt_payments_card = (
        SELECT COALESCE(SUM(dp.card_transfer_amount), 0.0)
        FROM debt_payments dp
        WHERE dp.cash_register_shift_id = cash_register_shifts.id
    ),
    -- Cash movements
    total_movements_in = (
        SELECT COALESCE(SUM(CASE WHEN cm.type = 'IN' THEN cm.amount ELSE 0 END), 0.0)
        FROM cash_movements cm
        WHERE cm.cash_register_shift_id = cash_register_shifts.id
    ),
    total_movements_out = (
        SELECT COALESCE(SUM(CASE WHEN cm.type = 'OUT' THEN cm.amount ELSE 0 END), 0.0)
        FROM cash_movements cm
        WHERE cm.cash_register_shift_id = cash_register_shifts.id
    )
WHERE status = 'closed';
