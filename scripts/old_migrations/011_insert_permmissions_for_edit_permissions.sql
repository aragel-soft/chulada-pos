-- ============================================
-- MIGRATION 011: INSERTAR PERMISOS PARA PERMISOS
-- ============================================

-- Permisos específicos para clientes
INSERT OR IGNORE INTO permissions (id, name, display_name, module, description) VALUES
('960e8400-e29b-41d4-a716-446655440011', 'permissions:view', 'Ver Permisos', 'permissions', 'Permite consultar la lista de permisos'),
('960e8400-e29b-41d4-a716-446655440012', 'permissions:edit', 'Editar Permisos', 'permissions', 'Permite modificar asignación de permisos');

-- Permisos para ADMIN (incluyendo gestión de clientes)
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id) VALUES
('a60e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440001', '960e8400-e29b-41d4-a716-446655440011'),
('a60e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440001', '960e8400-e29b-41d4-a716-446655440012');