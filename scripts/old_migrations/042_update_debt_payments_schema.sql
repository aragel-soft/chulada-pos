-- =========================================================================
-- MIGRATION 042: ACTUALIZAR SCHEMA DE PAGOS DE DEUDA
-- Alineación con requerimientos de pagos mixtos y control de caja
-- =========================================================================

-- Agregar referencia al turno de caja
ALTER TABLE debt_payments ADD COLUMN cash_register_shift_id TEXT;

-- Agregar desglose de montos para pagos mixtos
ALTER TABLE debt_payments ADD COLUMN cash_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE debt_payments ADD COLUMN card_transfer_amount DECIMAL(10,2) DEFAULT 0;

-- Nota: La columna existente 'amount' se usará como el 'total'
