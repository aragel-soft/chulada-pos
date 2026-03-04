-- ============================================
-- MIGRATION 042: SHORTEN VOUCHER CODES
-- ============================================
-- Cambia el formato de códigos de vale de VT-YYYYMMDD-HHMMSS a V-{folio}
-- para que el código de barras impreso sea más legible

UPDATE store_vouchers
SET code = 'V' || (
    SELECT s.folio FROM sales s WHERE s.id = store_vouchers.sale_id
),
updated_at = CURRENT_TIMESTAMP
WHERE code LIKE 'VT-%';
