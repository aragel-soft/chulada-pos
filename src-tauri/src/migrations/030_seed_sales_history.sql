-- ============================================
-- MIGRATION 029: SEED SALES HISTORY 
-- ============================================

-- 1. OBTENER UN ID DE USUARIO
-- Si no tienes un usuario fijo, esto tomará el primero que encuentre.
CREATE TEMP TABLE _vars(user_id TEXT);
INSERT INTO _vars (user_id) SELECT id FROM users LIMIT 1;

-- ==================================================================================
-- ESCENARIO 1: VENTA RETAIL SIMPLE (HOY)
-- Objetivo: Verificar carga inicial, badge 'completed', pago 'cash'.
-- ==================================================================================
INSERT INTO sales (id, folio, sale_date, subtotal, total, status, payment_method, cash_amount, user_id, has_discount)
SELECT 
  'sale-001', '00000001', datetime('now', 'localtime'), 130.00, 130.00, 'completed', 'cash', 130.00, user_id, 0
FROM _vars;

INSERT INTO sale_items (id, sale_id, product_id, product_name, product_code, quantity, unit_price, price_type, subtotal) VALUES
('si-001-a', 'sale-001', 'p011', 'Rimel Bissú Explosive', 'BIS-RIM', 1, 65.00, 'retail', 65.00),
('si-001-b', 'sale-001', 'p011', 'Rimel Bissú Explosive', 'BIS-RIM', 1, 65.00, 'retail', 65.00);

-- ==================================================================================
-- ESCENARIO 2: VENTA MAYOREO (AYER)
-- Objetivo: Verificar filtro de fechas y Tag Azul "Mayoreo" en detalle.
-- ==================================================================================
INSERT INTO sales (id, folio, sale_date, subtotal, total, status, payment_method, card_transfer_amount, user_id, has_discount)
SELECT 
  'sale-002', '00000002', datetime('now', '-1 day', 'localtime'), 315.00, 315.00, 'completed', 'card_transfer', 315.00, user_id, 0
FROM _vars;

-- 3 Tintes Kuul (Precio Retail $55, Mayoreo $42)
-- 1 Peróxido (Retail $85, Mayoreo $65)
-- Total Mayoreo: (42 * 3) + 65 = 126 + 65 = 191 (Ajuste manual para el ejemplo: 315 simulando más items o precios distintos, ajustaré a precios reales del seed)
-- Corrección matemática estricta con seed productos:
-- 5 Tintes Kuul (5 * 42 = 210) + 1 Rimel Mayoreo (45) + 1 Peroxido Mayoreo (65) = 320. Usaremos 320.
UPDATE sales SET subtotal = 320.00, total = 320.00, card_transfer_amount = 320.00 WHERE id = 'sale-002';

INSERT INTO sale_items (id, sale_id, product_id, product_name, product_code, quantity, unit_price, price_type, subtotal) VALUES
('si-002-a', 'sale-002', 'p001', 'Tinte Kuul Rubio Ultra', 'KUL-902', 5, 42.00, 'wholesale', 210.00),
('si-002-b', 'sale-002', 'p011', 'Rimel Bissú Explosive', 'BIS-RIM', 1, 45.00, 'wholesale', 45.00),
('si-002-c', 'sale-002', 'p005', 'Peróxido Hidra 20 Vol', 'HID-PER', 1, 65.00, 'wholesale', 65.00);

-- ==================================================================================
-- ESCENARIO 3: VENTA CON KIT/REGALO (HACE 2 DÍAS)
-- Objetivo: Verificar lógica de Kit (Item con precio 0 y badge "KIT").
-- Compra Plancha (p042) -> Regalo Ampolleta (p007)
-- ==================================================================================
INSERT INTO sales (id, folio, sale_date, subtotal, total, status, payment_method, cash_amount, user_id)
SELECT 
  'sale-003', '00000003', datetime('now', '-2 days', '12:00:00'), 2800.00, 2800.00, 'completed', 'cash', 2800.00, user_id
FROM _vars;

INSERT INTO sale_items (id, sale_id, product_id, product_name, product_code, quantity, unit_price, price_type, subtotal, is_kit_item, parent_sale_item_id) VALUES
('si-003-a', 'sale-003', 'p042', 'Plancha Babyliss Optima', 'PLA-BAB', 1, 2800.00, 'retail', 2800.00, 0, NULL),
('si-003-b', 'sale-003', 'p007', 'Ampolleta Alfaparf (REGALO)', 'ALF-OIL', 1, 0.00, 'kit-item', 0.00, 1, 'si-003-a');

-- ==================================================================================
-- ESCENARIO 4: VENTA CANCELADA (HACE 1 SEMANA)
-- Objetivo: Verificar color Rojo en tabla y estado 'cancelled'.
-- ==================================================================================
INSERT INTO sales (id, folio, sale_date, subtotal, total, status, payment_method, user_id, cancellation_reason, cancelled_at)
SELECT 
  'sale-004', '00000004', datetime('now', '-7 days'), 180.00, 180.00, 'cancelled', 'cash', user_id, 'Cliente olvidó la cartera', datetime('now', '-7 days', '+10 minutes')
FROM _vars;

INSERT INTO sale_items (id, sale_id, product_id, product_name, product_code, quantity, unit_price, price_type, subtotal) VALUES
('si-004-a', 'sale-004', 'p021', 'Monómero MC Nails 8oz', 'MC-MON', 1, 180.00, 'retail', 180.00);

-- ==================================================================================
-- ESCENARIO 5: PAGO MIXTO Y DESCUENTO GLOBAL (AYER)
-- Objetivo: Verificar Footer Financiero (Subtotal - Descuento = Total) y desglose mixto.
-- ==================================================================================
-- Subtotal: 1000. Descuento 10% (100). Total: 900.
-- Pago: 400 Efectivo, 500 Tarjeta.
INSERT INTO sales (id, folio, sale_date, subtotal, discount_percentage, discount_amount, total, status, payment_method, cash_amount, card_transfer_amount, has_discount, user_id)
SELECT 
  'sale-005', '00000005', datetime('now', '-1 day', '16:30:00'), 1000.00, 10.00, 100.00, 900.00, 'completed', 'mixed', 400.00, 500.00, 1, user_id
FROM _vars;

INSERT INTO sale_items (id, sale_id, product_id, product_name, product_code, quantity, unit_price, price_type, subtotal) VALUES
('si-005-a', 'sale-005', 'p031', 'Máquina Wahl Super Taper (Desc Global)', 'WAHL-SUP', 1, 1000.00, 'retail', 1000.00);

-- ==================================================================================
-- ESCENARIO 6: VENTA DE PROMO/COMBO (HOY)
-- Objetivo: Verificar visualización de items agrupados o Tag "Combo".
-- Promo: Tinte (55) + Peroxido (85) = 140. Precio Combo = 120.
-- ==================================================================================
INSERT INTO sales (id, folio, sale_date, subtotal, total, status, payment_method, cash_amount, user_id)
SELECT 
  'sale-006', '00000006', datetime('now', 'localtime'), 120.00, 120.00, 'completed', 'cash', 120.00, user_id
FROM _vars;

-- Nota: Ajustamos el precio unitario para reflejar el combo, o usamos price_type='promo' si el sistema lo soporta.
-- Aquí simularemos que el precio unitario bajó por la promo.
INSERT INTO sale_items (id, sale_id, product_id, product_name, product_code, promotion_id, quantity, unit_price, price_type, subtotal) VALUES
('si-006-a', 'sale-006', 'p001', 'Tinte Kuul Rubio (Pack)', 'KUL-902', 'promo_01', 1, 50.00, 'promo', 50.00), -- Bajó de 55 a 50
('si-006-b', 'sale-006', 'p005', 'Peróxido Hidra (Pack)', 'HID-PER', 'promo_01', 1, 70.00, 'promo', 70.00); -- Bajó de 85 a 70

-- ==================================================================================
-- ESCENARIO 7: VENTA BUSQUEDA DIFÍCIL (NOMBRE ESPECIFICO)
-- Objetivo: Probar el buscador LIKE %query%
-- ==================================================================================
INSERT INTO sales (id, folio, sale_date, subtotal, total, status, payment_method, cash_amount, user_id)
SELECT 
  'sale-007', '00000007', datetime('now', '-3 days'), 45.00, 45.00, 'completed', 'cash', 45.00, user_id
FROM _vars;

INSERT INTO sale_items (id, sale_id, product_id, product_name, product_code, quantity, unit_price, price_type, subtotal) VALUES
('si-007-a', 'sale-007', 'p097', 'Tinte Fantasía Rosa Neón 90g', 'TINT-NEON', 1, 45.00, 'retail', 45.00);

-- Limpieza
DROP TABLE _vars;
