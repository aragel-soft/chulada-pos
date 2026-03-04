-- ============================================
-- MIGRATION 052: RESTORE CANCELLATION COLUMNS
-- ============================================
-- La migración 040 movió los datos de cancelación a la tabla returns
-- y eliminó las columnas de sales. Esta migración las restaura para
-- que el nuevo comando cancel_sale las use directamente.

-- 1. Re-agregar columnas eliminadas por 040
ALTER TABLE sales ADD COLUMN cancellation_reason TEXT;
ALTER TABLE sales ADD COLUMN cancelled_by TEXT;
ALTER TABLE sales ADD COLUMN cancelled_at DATETIME;

-- 2. Restaurar datos desde los returns migrados por 040
--    (sus IDs tienen el prefijo 'return-cancel-')
UPDATE sales SET
  cancellation_reason = (
    SELECT r.notes FROM returns r WHERE r.id = 'return-cancel-' || sales.id
  ),
  cancelled_by = (
    SELECT r.user_id FROM returns r WHERE r.id = 'return-cancel-' || sales.id
  ),
  cancelled_at = (
    SELECT r.return_date FROM returns r WHERE r.id = 'return-cancel-' || sales.id
  )
WHERE status = 'cancelled'
  AND EXISTS (
    SELECT 1 FROM returns r WHERE r.id = 'return-cancel-' || sales.id
  );

-- 3. Limpiar registros espurios creados por migración 040
DELETE FROM return_items WHERE return_id LIKE 'return-cancel-%';
DELETE FROM returns WHERE id LIKE 'return-cancel-%';
DELETE FROM store_vouchers WHERE id LIKE 'voucher-cancel-%';
