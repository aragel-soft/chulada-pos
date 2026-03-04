-- ============================================
-- MIGRATION 024: CASH MOVEMENT PERMISSIONS
-- ============================================

INSERT OR IGNORE INTO permissions (id, name, display_name, module, description) VALUES
('650e8400-e29b-41d4-a716-446655440020', 'cash_register:movements:in', 'Registrar Entradas', 'cash_register', 'Permite registrar entradas de efectivo (cambio, etc).'),
('650e8400-e29b-41d4-a716-446655440021', 'cash_register:movements:out', 'Registrar Salidas', 'cash_register', 'Permite registrar salidas de efectivo (gastos, retiros).');

-- Assign to Admin
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id) VALUES
('770e8400-e29b-41d4-a716-446655440050', '550e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440020'),
('770e8400-e29b-41d4-a716-446655440051', '550e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440021');

-- Assign to Manager
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id) VALUES
('770e8400-e29b-41d4-a716-446655440052', '550e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440020'),
('770e8400-e29b-41d4-a716-446655440053', '550e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440021');

-- Assign to Cashier
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id) VALUES
('770e8400-e29b-41d4-a716-446655440054', '550e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440020'),
('770e8400-e29b-41d4-a716-446655440055', '550e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440021');
