-- ============================================
-- MIGRATION 035: SEED PARTIAL RETURN DATA
-- ============================================
-- Este archivo crea datos de prueba para devoluciones parciales,
-- devoluciones completas, y múltiples devoluciones sobre la misma venta.
-- ============================================

-- ==================================================================================
-- ESCENARIO 1: DEVOLUCIÓN PARCIAL en Sale 1 (sale-test-return-001)
-- Venta original: sale-test-return-001 (folio 00000012)
-- Devolvemos: 1 unidad de Pintalabios (de las 2 vendidas)
-- Esto deja 1 unidad disponible para devolver
-- ==================================================================================

INSERT INTO returns (id, folio, sale_id, return_date, total, reason, refund_method, user_id)
VALUES (
    'return-001',
    1,
    'sale-test-return-001',
    datetime('now', 'localtime', '-2 days'),
    15.00, -- 1 unidad x $15.00
    'Cliente ya no lo necesita',
    'coupon',
    '450e8400-e29b-41d4-a716-446655440001'
);

-- Return item: 1 de 2 Pintalabios
-- El sale_item_id es 'si-test-06' que vendió 2 unidades a $15.00 c/u
INSERT INTO return_items (id, return_id, sale_item_id, product_id, quantity, unit_price, subtotal)
VALUES (
    'ri-001',
    'return-001',
    'si-test-06', -- Pintalabios original sale item
    'p099',
    1.000, -- Devolviendo 1 de 2
    15.00,
    15.00
);

-- Update sale status to partial_return
UPDATE sales SET status = 'partial_return' WHERE id = 'sale-test-return-001';


-- ==================================================================================
-- ESCENARIO 2: DEVOLUCIÓN TOTAL en Sale 2 (sale-test-return-002)
-- Venta original: sale-test-return-002 (folio 00000013) - Esmaltes mayoreo
-- Devolvemos: TODOS los esmaltes
-- Esto hace que la venta esté completamente devuelta
-- ==================================================================================

INSERT INTO returns (id, folio, sale_id, return_date, total, reason, refund_method, user_id)
VALUES (
    'return-002',
    2,
    'sale-test-return-002',
    datetime('now', 'localtime', '-5 hours'),
    476.00, -- Total de la venta
    'Producto defectuoso - lote completo',
    'coupon',
    '450e8400-e29b-41d4-a716-446655440001'
);

-- Devolvemos todos los esmaltes
INSERT INTO return_items (id, return_id, sale_item_id, product_id, quantity, unit_price, subtotal)
VALUES 
    ('ri-002', 'return-002', 'si-test-07', 'p056', 5.000, 14.00, 70.00),  -- Esmalte 01 Blanco
    ('ri-003', 'return-002', 'si-test-08', 'p057', 7.000, 14.00, 98.00),  -- Esmalte 05 Negro
    ('ri-004', 'return-002', 'si-test-09', 'p058', 10.000, 14.00, 140.00), -- Esmalte 18 Rosa
    ('ri-005', 'return-002', 'si-test-10', 'p059', 12.000, 14.00, 168.00); -- Esmalte 20 Rojo

-- Update sale status to fully_returned (all items returned)
UPDATE sales SET status = 'fully_returned' WHERE id = 'sale-test-return-002';

-- ==================================================================================
-- ESCENARIO 3: MÚLTIPLES DEVOLUCIONES PARCIALES en Sale 4 (sale-test-return-004)
-- Venta original: sale-test-return-004 (folio 00000015) - Combo geles
-- Primera devolución: 1 unidad de cada gel
-- Segunda devolución: 1 unidad más de Gel Kuul Fijación
-- Quedan cantidades disponibles para más devoluciones
-- ==================================================================================

-- Primera devolución parcial
INSERT INTO returns (id, folio, sale_id, return_date, total, reason, refund_method, user_id)
VALUES (
    'return-003',
    3,
    'sale-test-return-004',
    datetime('now', 'localtime', '-10 days'),
    220.01, -- 1 de cada gel (3 geles x ~36.67)
    'Cliente cambió de opinión',
    'coupon',
    '450e8400-e29b-41d4-a716-446655440001'
);

INSERT INTO return_items (id, return_id, sale_item_id, product_id, quantity, unit_price, subtotal)
VALUES 
    ('ri-006', 'return-003', 'si-test-15', 'pr-gel-k-1', 2.000, 36.67, 73.34),  -- 2 de 4 Fijación
    ('ri-007', 'return-003', 'si-test-16', 'pr-gel-k-2', 3.000, 36.67, 110.00),  -- 3 de 6 Brillo
    ('ri-008', 'return-003', 'si-test-17', 'pr-gel-k-3', 1.000, 36.67, 36.67);  -- 1 de 2 Wet Look

-- Segunda devolución parcial (solo Gel Fijación)
INSERT INTO returns (id, folio, sale_id, return_date, total, reason, refund_method, user_id)
VALUES (
    'return-004',
    4,
    'sale-test-return-004',
    datetime('now', 'localtime', '-3 days'),
    75.00, -- 1 Gel Fijación
    'Exceso de inventario',
    'coupon',
    '450e8400-e29b-41d4-a716-446655440001'
);

INSERT INTO return_items (id, return_id, sale_item_id, product_id, quantity, unit_price, subtotal)
VALUES 
    ('ri-009', 'return-004', 'si-test-18', 'pr-gel-k-1', 1.000, 75.00, 75.00);  -- 1 más de Fijación

-- Update sale status to partial_return (multiple partial returns)
UPDATE sales SET status = 'partial_return' WHERE id = 'sale-test-return-004';

-- ==================================================================================
-- RESUMEN DE CANTIDADES DISPONIBLES DESPUÉS DE ESTAS DEVOLUCIONES:
-- ==================================================================================
-- Sale 1 (00000012):
--   - Pintalabios: vendido 2, devuelto 1, DISPONIBLE 1
--   - Resto de items: sin devoluciones, DISPONIBLE = vendido
--
-- Sale 2 (00000013):
--   - TODOS los items: COMPLETAMENTE DEVUELTOS (disponible = 0)
--
-- Sale 3 (00000014):
--   - SIN DEVOLUCIONES (pero fuera de tiempo - 31 días)
--
-- Sale 4 (00000015):
--   - Gel Fijación (si-test-15): vendido 4, devuelto 2, DISPONIBLE 2
--   - Gel Brillo (si-test-16): vendido 6, devuelto 3, DISPONIBLE 3
--   - Gel Wet Look (si-test-17): vendido 2, devuelto 1, DISPONIBLE 1
--   - Gel Fijación (si-test-18): vendido 1, devuelto 1, DISPONIBLE 1
-- ==================================================================================
