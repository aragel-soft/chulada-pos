-- ============================================
-- MIGRATION 006: ACTUALIZAR NOMBRES DE PERMISOS
-- Actualiza los 'name' de los permisos al formato modulo:accion
-- ============================================

-- Inventario
UPDATE permissions SET name = 'inventory:create' WHERE id = '650e8400-e29b-41d4-a716-446655440001';
UPDATE permissions SET name = 'inventory:edit' WHERE id = '650e8400-e29b-41d4-a716-446655440002';
UPDATE permissions SET name = 'inventory:delete' WHERE id = '650e8400-e29b-41d4-a716-446655440003';
UPDATE permissions SET name = 'inventory:view' WHERE id = '650e8400-e29b-41d4-a716-446655440004';

-- Ventas
UPDATE permissions SET name = 'sales:create' WHERE id = '650e8400-e29b-41d4-a716-446655440005';
UPDATE permissions SET name = 'sales:cancel' WHERE id = '650e8400-e29b-41d4-a716-446655440006';
UPDATE permissions SET name = 'sales:discount' WHERE id = '650e8400-e29b-41d4-a716-446655440007';
UPDATE permissions SET name = 'sales:view' WHERE id = '650e8400-e29b-41d4-a716-446655440008';

-- Caja
UPDATE permissions SET name = 'cash_register:open' WHERE id = '650e8400-e29b-41d4-a716-446655440009';
UPDATE permissions SET name = 'cash_register:close' WHERE id = '650e8400-e29b-41d4-a716-446655440010';
UPDATE permissions SET name = 'cash_register:view' WHERE id = '650e8400-e29b-41d4-a716-446655440011';

-- Reportes
UPDATE permissions SET name = 'reports:view' WHERE id = '650e8400-e29b-41d4-a716-446655440012';
UPDATE permissions SET name = 'reports:export' WHERE id = '650e8400-e29b-41d4-a716-446655440013';

-- Usuarios
UPDATE permissions SET name = 'users:create' WHERE id = '650e8400-e29b-41d4-a716-446655440014';
UPDATE permissions SET name = 'users:edit' WHERE id = '650e8400-e29b-41d4-a716-446655440015';
UPDATE permissions SET name = 'users:delete' WHERE id = '650e8400-e29b-41d4-a716-446655440016';
UPDATE permissions SET name = 'users:view' WHERE id = '650e8400-e29b-41d4-a716-446655440017';