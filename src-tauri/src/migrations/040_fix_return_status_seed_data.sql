-- ============================================
-- MIGRATION 040: FIX SEED DATA FOR RETURN STATUS
-- ============================================
-- Esta migración actualiza los datos de prueba existentes
-- para usar el nuevo campo return_status en lugar de status

-- Actualizar datos existentes de la migración 038
UPDATE sales SET return_status = 'partial_return' WHERE id = 'sale-test-return-001';
UPDATE sales SET return_status = 'fully_returned' WHERE id = 'sale-test-return-002';
UPDATE sales SET return_status = 'partial_return' WHERE id = 'sale-test-return-004';

-- Asegurar que todas las demás ventas tengan el status correcto
UPDATE sales SET return_status = 'none' WHERE return_status IS NULL;
