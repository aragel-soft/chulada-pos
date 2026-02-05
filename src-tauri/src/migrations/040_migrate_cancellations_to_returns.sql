-- ============================================
-- MIGRATION 040: MIGRATE CANCELLATIONS TO RETURNS
-- ============================================
-- Esta migración mueve los datos de cancelación desde los campos
-- cancellation_reason, cancelled_by, cancelled_at de la tabla sales
-- hacia la tabla returns, para unificar devoluciones y cancelaciones.

-- 1. Crear registros en returns para ventas canceladas existentes
INSERT INTO returns (id, folio, sale_id, return_date, total, reason, refund_method, user_id, notes)
SELECT 
    'return-cancel-' || sales.id,
    (SELECT COALESCE(MAX(folio), 0) FROM returns) + ROW_NUMBER() OVER (ORDER BY sales.created_at),
    sales.id,
    COALESCE(sales.cancelled_at, sales.created_at),
    sales.total,
    COALESCE(sales.cancellation_reason, 'Venta cancelada'),
    'store_voucher',
    COALESCE(sales.cancelled_by, sales.user_id),
    'Migración automática de cancelación'
FROM sales
WHERE sales.status = 'cancelled' 
  AND sales.cancellation_reason IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM returns WHERE returns.sale_id = sales.id AND returns.reason LIKE '%cancelled%'
  );

-- 2. Crear return_items para cada sale_item de las ventas canceladas
INSERT INTO return_items (id, return_id, sale_item_id, product_id, quantity, unit_price, subtotal)
SELECT 
    'ri-cancel-' || sale_items.id,
    'return-cancel-' || sale_items.sale_id,
    sale_items.id,
    sale_items.product_id,
    sale_items.quantity,
    sale_items.unit_price,
    sale_items.subtotal
FROM sale_items
INNER JOIN sales ON sale_items.sale_id = sales.id
WHERE sales.status = 'cancelled' 
  AND sales.cancellation_reason IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM return_items WHERE return_items.sale_item_id = sale_items.id
  );

-- 3. Crear store_vouchers para cancelaciones existentes
INSERT INTO store_vouchers (id, sale_id, code, initial_balance, current_balance, is_active, created_at, updated_at, expires_at)
SELECT 
    'voucher-cancel-' || sales.id,
    sales.id,
    'VT-CANCEL-' || substr(sales.folio, -6),
    sales.total,
    sales.total,
    1,
    COALESCE(sales.cancelled_at, sales.created_at),
    COALESCE(sales.cancelled_at, sales.created_at),
    datetime(COALESCE(sales.cancelled_at, sales.created_at), '+1 year')
FROM sales
WHERE sales.status = 'cancelled' 
  AND sales.cancellation_reason IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM store_vouchers WHERE store_vouchers.sale_id = sales.id
  );

-- 4. Ahora que los datos están migrados, eliminar las columnas antiguas
ALTER TABLE sales DROP COLUMN cancellation_reason;
ALTER TABLE sales DROP COLUMN cancelled_by;
ALTER TABLE sales DROP COLUMN cancelled_at;
