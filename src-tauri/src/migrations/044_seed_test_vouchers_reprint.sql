-- Seed data for testing Voucher Reprint limitations
-- 1. Active Voucher (Reprintable)
-- 2. Used Voucher (Not Reprintable)


-- SCENARIO 1: Active Voucher (Reprintable)
-- Sale
INSERT INTO sales (id, folio, sale_date, subtotal, total, status, payment_method, card_transfer_amount, has_discount, user_id)
SELECT 
  'sale-test-voucher-001', 
  '00000020', 
  datetime('now', 'localtime', '-1 day'), 
  476.00, -- Subtotal 
  476.00, -- Total
  'completed', 
  'credit', 
  476.00, 
  0, 
  '450e8400-e29b-41d4-a716-446655440001'
;


INSERT INTO sale_items (id, sale_id, product_id, product_name, product_code, quantity, unit_price, price_type, subtotal) VALUES
('si-test-voucher-01', 'sale-test-voucher-001', 'p056', 'Esmalte Bissú Tono 01 Blanco Francés', 'ESM-01', 5, 14.00, 'wholesale', 70.00),
('si-test-voucher-02', 'sale-test-voucher-001', 'p057', 'Esmalte Bissú Tono 05 Negro', 'ESM-05', 7, 14.00, 'wholesale', 98.00),
('si-test-voucher-03', 'sale-test-voucher-001', 'p058', 'Esmalte Bissú Tono 18 Rosa Pastel', 'ESM-18', 10, 14.00, 'wholesale', 140.00),
('si-test-voucher-04', 'sale-test-voucher-001', 'p059', 'Esmalte Bissú Tono 20 Rojo Quemado', 'ESM-20', 12, 14.00, 'wholesale', 168.00);

INSERT INTO returns (id, folio, sale_id, return_date, total, reason, refund_method, user_id)
VALUES (
    'return-test-voucher-001',
    22,
    'sale-test-voucher-001',
    datetime('now', 'localtime', '-5 hours'),
    476.00, -- Total de la venta
    'Producto defectuoso - lote completo',
    'coupon',
    '450e8400-e29b-41d4-a716-446655440001'
);

-- Devolvemos todos los esmaltes
INSERT INTO return_items (id, return_id, sale_item_id, product_id, quantity, unit_price, subtotal)
VALUES 
    ('ri-test-voucher-01', 'return-test-voucher-001', 'si-test-voucher-01', 'p056', 5.000, 14.00, 70.00),  -- Esmalte 01 Blanco
    ('ri-test-voucher-02', 'return-test-voucher-001', 'si-test-voucher-02', 'p057', 7.000, 14.00, 98.00),  -- Esmalte 05 Negro
    ('ri-test-voucher-03', 'return-test-voucher-001', 'si-test-voucher-03', 'p058', 10.000, 14.00, 140.00), -- Esmalte 18 Rosa
    ('ri-test-voucher-04', 'return-test-voucher-001', 'si-test-voucher-04', 'p059', 12.000, 14.00, 168.00); -- Esmalte 20 Rojo

-- Update sale status to fully_returned (all items returned)
UPDATE sales SET status = 'fully_returned' WHERE id = 'sale-test-voucher-001';

-- Voucher (Active)
INSERT INTO store_vouchers (id, sale_id, code, initial_balance, current_balance, is_active, created_at, updated_at, used_at, expires_at)
VALUES (
    'voucher-test-voucher-001',
    'sale-test-voucher-001',
    'V00000020',
    476.00, -- Total de la venta
    476.00,
    1,
    datetime('now', 'localtime', '-5 hours'),
    datetime('now', 'localtime', '-5 hours'),
    NULL,
    datetime('now', 'localtime', '+1 year')
);


-- SCENARIO 2: Used Voucher (Reprintable but used a partial amount)
-- Sale
INSERT INTO sales (id, folio, sale_date, subtotal, total, status, payment_method, card_transfer_amount, has_discount, user_id)
SELECT 
  'sale-test-voucher-002', 
  '00000021', 
  datetime('now', 'localtime', '-1 day'), 
  476.00, -- Subtotal 
  476.00, -- Total
  'completed', 
  'credit', 
  476.00, 
  0, 
  '450e8400-e29b-41d4-a716-446655440001'
;


INSERT INTO sale_items (id, sale_id, product_id, product_name, product_code, quantity, unit_price, price_type, subtotal) VALUES
('si-test-voucher-05', 'sale-test-voucher-002', 'p056', 'Esmalte Bissú Tono 01 Blanco Francés', 'ESM-01', 5, 14.00, 'wholesale', 70.00),
('si-test-voucher-06', 'sale-test-voucher-002', 'p057', 'Esmalte Bissú Tono 05 Negro', 'ESM-05', 7, 14.00, 'wholesale', 98.00),
('si-test-voucher-07', 'sale-test-voucher-002', 'p058', 'Esmalte Bissú Tono 18 Rosa Pastel', 'ESM-18', 10, 14.00, 'wholesale', 140.00),
('si-test-voucher-08', 'sale-test-voucher-002', 'p059', 'Esmalte Bissú Tono 20 Rojo Quemado', 'ESM-20', 12, 14.00, 'wholesale', 168.00);

INSERT INTO returns (id, folio, sale_id, return_date, total, reason, refund_method, user_id)
VALUES (
    'return-test-voucher-002',
    23,
    'sale-test-voucher-002',
    datetime('now', 'localtime', '-5 hours'),
    476.00, -- Total de la venta
    'Producto defectuoso - lote completo',
    'coupon',
    '450e8400-e29b-41d4-a716-446655440001'
);

-- Devolvemos todos los esmaltes
INSERT INTO return_items (id, return_id, sale_item_id, product_id, quantity, unit_price, subtotal)
VALUES 
    ('ri-test-voucher-05', 'return-test-voucher-002', 'si-test-voucher-05', 'p056', 5.000, 14.00, 70.00),  -- Esmalte 01 Blanco
    ('ri-test-voucher-06', 'return-test-voucher-002', 'si-test-voucher-06', 'p057', 7.000, 14.00, 98.00),  -- Esmalte 05 Negro
    ('ri-test-voucher-07', 'return-test-voucher-002', 'si-test-voucher-07', 'p058', 10.000, 14.00, 140.00), -- Esmalte 18 Rosa
    ('ri-test-voucher-08', 'return-test-voucher-002', 'si-test-voucher-08', 'p059', 12.000, 14.00, 168.00); -- Esmalte 20 Rojo

-- Update sale status to fully_returned (all items returned)
UPDATE sales SET status = 'fully_returned' WHERE id = 'sale-test-voucher-002';

-- Voucher (Active)
INSERT INTO store_vouchers (id, sale_id, code, initial_balance, current_balance, is_active, created_at, updated_at, used_at, expires_at)
VALUES (
    'voucher-test-voucher-002',
    'sale-test-voucher-002',
    'V00000021',
    476.00, -- Total de la venta 
    200.00,
    1,
    datetime('now', 'localtime', '-5 hours'),
    datetime('now', 'localtime', '-5 hours'),
    NULL,
    datetime('now', 'localtime', '+1 year')
);

-- SCENARIO 2: Used Voucher (No Reprintable)
-- Sale
INSERT INTO sales (id, folio, sale_date, subtotal, total, status, payment_method, card_transfer_amount, has_discount, user_id)
SELECT 
  'sale-test-voucher-003', 
  '00000022', 
  datetime('now', 'localtime', '-1 day'), 
  476.00, -- Subtotal 
  476.00, -- Total
  'completed', 
  'credit', 
  476.00, 
  0, 
  '450e8400-e29b-41d4-a716-446655440001'
;


INSERT INTO sale_items (id, sale_id, product_id, product_name, product_code, quantity, unit_price, price_type, subtotal) VALUES
('si-test-voucher-09', 'sale-test-voucher-003', 'p056', 'Esmalte Bissú Tono 01 Blanco Francés', 'ESM-01', 5, 14.00, 'wholesale', 70.00),
('si-test-voucher-10', 'sale-test-voucher-003', 'p057', 'Esmalte Bissú Tono 05 Negro', 'ESM-05', 7, 14.00, 'wholesale', 98.00),
('si-test-voucher-11', 'sale-test-voucher-003', 'p058', 'Esmalte Bissú Tono 18 Rosa Pastel', 'ESM-18', 10, 14.00, 'wholesale', 140.00),
('si-test-voucher-12', 'sale-test-voucher-003', 'p059', 'Esmalte Bissú Tono 20 Rojo Quemado', 'ESM-20', 12, 14.00, 'wholesale', 168.00);

INSERT INTO returns (id, folio, sale_id, return_date, total, reason, refund_method, user_id)
VALUES (
    'return-test-voucher-003',
    24,
    'sale-test-voucher-003',
    datetime('now', 'localtime', '-5 hours'),
    476.00, -- Total de la venta
    'Producto defectuoso - lote completo',
    'coupon',
    '450e8400-e29b-41d4-a716-446655440001'
);

-- Devolvemos todos los esmaltes
INSERT INTO return_items (id, return_id, sale_item_id, product_id, quantity, unit_price, subtotal)
VALUES 
    ('ri-test-voucher-09', 'return-test-voucher-003', 'si-test-voucher-09', 'p056', 5.000, 14.00, 70.00),  -- Esmalte 01 Blanco
    ('ri-test-voucher-10', 'return-test-voucher-003', 'si-test-voucher-10', 'p057', 7.000, 14.00, 98.00),  -- Esmalte 05 Negro
    ('ri-test-voucher-11', 'return-test-voucher-003', 'si-test-voucher-11', 'p058', 10.000, 14.00, 140.00), -- Esmalte 18 Rosa
    ('ri-test-voucher-12', 'return-test-voucher-003', 'si-test-voucher-12', 'p059', 12.000, 14.00, 168.00); -- Esmalte 20 Rojo

-- Update sale status to fully_returned (all items returned)
UPDATE sales SET status = 'fully_returned' WHERE id = 'sale-test-voucher-003';

-- Voucher (Active)
INSERT INTO store_vouchers (id, sale_id, code, initial_balance, current_balance, is_active, created_at, updated_at, used_at, expires_at)
VALUES (
    'voucher-test-voucher-003',
    'sale-test-voucher-003',
    'V00000022',
    476.00, -- Total de la venta 
    0,
    0,
    datetime('now', 'localtime', '-5 hours'),
    datetime('now', 'localtime', '-5 hours'),
    datetime('now', 'localtime', '-4 hours'),
    datetime('now', 'localtime', '+1 year')
);