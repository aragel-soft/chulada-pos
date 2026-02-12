-- ============================================
-- MIGRATION 040: FIX SEED DATA FOR RETURN STATUS
-- ============================================
-- Esta migración actualiza los datos de prueba existentes
-- para crear vouchers de devolución

-- Actualizar datos existentes de la migración 038
-- ==================================================================================
-- ESCENARIO 1: DEVOLUCIÓN PARCIAL en Sale 1 (sale-test-return-001)
-- Venta original: sale-test-return-001 (folio 00000012)
-- Devolvemos: 1 unidad de Pintalabios (de las 2 vendidas)
-- Esto deja 1 unidad disponible para devolver
-- ==================================================================================

INSERT INTO store_vouchers (id, sale_id, code, initial_balance, current_balance, is_active, created_at, updated_at, used_at, expires_at)
VALUES (
    'voucher-001',
    'sale-test-return-001',
    'V00000012',
    15.00,
    15.00,
    1,
    datetime('now', 'localtime', '-2 days'),
    datetime('now', 'localtime', '-2 days'),
    NULL,
    datetime('now', 'localtime', '+1 year')
);

-- ==================================================================================
-- ESCENARIO 2: DEVOLUCIÓN TOTAL en Sale 2 (sale-test-return-002)
-- Venta original: sale-test-return-002 (folio 00000013) - Esmaltes mayoreo
-- Devolvemos: TODOS los esmaltes
-- Esto hace que la venta esté completamente devuelta
-- ==================================================================================

INSERT INTO store_vouchers (id, sale_id, code, initial_balance, current_balance, is_active, created_at, updated_at, used_at, expires_at)
VALUES (
    'voucher-002',
    'sale-test-return-002',
    'V00000013',
    476.00, -- Total de la venta
    476.00,
    1,
    datetime('now', 'localtime', '-5 hours'),
    datetime('now', 'localtime', '-5 hours'),
    NULL,
    datetime('now', 'localtime', '+1 year')
);

-- ==================================================================================
-- ESCENARIO 3: MÚLTIPLES DEVOLUCIONES PARCIALES en Sale 4 (sale-test-return-004)
-- Venta original: sale-test-return-004 (folio 00000015) - Combo geles
-- Primera devolución: 1 unidad de cada gel
-- Segunda devolución: 1 unidad más de Gel Kuul Fijación
-- Quedan cantidades disponibles para más devoluciones
-- ==================================================================================

INSERT INTO store_vouchers (id, sale_id, code, initial_balance, current_balance, is_active, created_at, updated_at, used_at, expires_at)
VALUES (
    'voucher-003',
    'sale-test-return-004',
    'V00000015',
    220.00, 
    220.00,
    1,
    datetime('now', 'localtime', '-10 days'),
    datetime('now', 'localtime', '-10 days'),
    NULL,
    datetime('now', 'localtime', '+1 year')
);

-- Segunda devolución parcial: incrementar saldo del vale
UPDATE store_vouchers 
SET 
    initial_balance = 295.00,
    current_balance = 295.00,
    updated_at = datetime('now', 'localtime', '-3 days')
WHERE id = 'voucher-003';

-- Tercera devolución parcial: incrementar saldo del vale nuevamente
UPDATE store_vouchers 
SET 
    initial_balance = 370.00,
    current_balance = 370.00,
    updated_at = datetime('now', 'localtime', '-1 days')
WHERE id = 'voucher-003';


