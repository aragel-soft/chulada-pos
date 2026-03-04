-- ============================================
-- MIGRATION 007: AÑADIR PERMISOS DE PERFIL Y CONFIGURACIÓN
-- ============================================

INSERT OR IGNORE INTO permissions (id, name, display_name, module, description) VALUES
('650e8400-e29b-41d4-a716-446655440018', 'profile:view', 'Ver Perfil', 'profile', 'Permite ver y editar el perfil del propio usuario.'),
('650e8400-e29b-41d4-a716-446655440019', 'settings:view', 'Ver Configuración', 'settings', 'Permite acceder a la sección de configuración general.');

-- Asignar los nuevos permisos a los roles existentes
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id) VALUES

-- Asignar a 'admin' (ID: ...0001)
('770e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440018'), 
('770e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440019'), 

-- Asignar a 'manager' (ID: ...0002)
('770e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440018'), 
('770e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440019'), 

-- Asignar a 'cashier' (ID: ...0003)
('770e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440018'), 
('770e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440019'); 