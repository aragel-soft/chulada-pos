-- ============================================
-- MIGRATION 009: INSERTAR PERMISOS PARA CLIENTES
-- ============================================

-- Permisos específicos para clientes
INSERT OR IGNORE INTO permissions (id, name, display_name, module, description) VALUES
('960e8400-e29b-41d4-a716-446655440001', 'customers:view', 'Ver Clientes', 'customers', 'Permite consultar la lista de clientes'),
('960e8400-e29b-41d4-a716-446655440002', 'customers:create', 'Crear Cliente', 'customers', 'Permite registrar nuevos clientes'),
('960e8400-e29b-41d4-a716-446655440003', 'customers:edit', 'Editar Cliente', 'customers', 'Permite modificar datos de clientes'),
('960e8400-e29b-41d4-a716-446655440004', 'customers:delete', 'Eliminar Cliente', 'customers', 'Permite eliminar clientes');

-- Permisos para ADMIN (incluyendo gestión de clientes)
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id) VALUES
('a60e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '960e8400-e29b-41d4-a716-446655440001'),
('a60e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', '960e8400-e29b-41d4-a716-446655440002'),
('a60e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', '960e8400-e29b-41d4-a716-446655440003'),
('a60e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', '960e8400-e29b-41d4-a716-446655440004');
