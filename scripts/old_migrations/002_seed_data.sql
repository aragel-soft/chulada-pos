-- ============================================
-- MIGRATION 002: DATOS INICIALES (SEED)
-- ============================================

-- Roles del sistema
INSERT OR IGNORE INTO roles (id, name, display_name, description) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'admin', 'Administrador', 'Acceso total al sistema'),
('550e8400-e29b-41d4-a716-446655440002', 'manager', 'Gerente', 'Gestión de inventario, ventas y reportes'),
('550e8400-e29b-41d4-a716-446655440003', 'cashier', 'Cajero', 'Registro de ventas y operaciones de caja');

-- Permisos básicos del sistema
INSERT OR IGNORE INTO permissions (id, name, display_name, module, description) VALUES
-- Inventario
('650e8400-e29b-41d4-a716-446655440001', 'create_product', 'Crear Producto', 'inventory', 'Permite registrar nuevos productos'),
('650e8400-e29b-41d4-a716-446655440002', 'edit_product', 'Editar Producto', 'inventory', 'Permite modificar productos existentes'),
('650e8400-e29b-41d4-a716-446655440003', 'delete_product', 'Eliminar Producto', 'inventory', 'Permite eliminar productos'),
('650e8400-e29b-41d4-a716-446655440004', 'view_inventory', 'Ver Inventario', 'inventory', 'Permite consultar inventario'),

-- Ventas
('650e8400-e29b-41d4-a716-446655440005', 'create_sale', 'Crear Venta', 'sales', 'Permite registrar ventas'),
('650e8400-e29b-41d4-a716-446655440006', 'cancel_sale', 'Cancelar Venta', 'sales', 'Permite anular ventas'),
('650e8400-e29b-41d4-a716-446655440007', 'apply_discount', 'Aplicar Descuento', 'sales', 'Permite aplicar descuentos'),
('650e8400-e29b-41d4-a716-446655440008', 'view_sales', 'Ver Ventas', 'sales', 'Permite consultar historial de ventas'),

-- Caja
('650e8400-e29b-41d4-a716-446655440009', 'open_cash_register', 'Abrir Caja', 'cash_register', 'Permite abrir turno de caja'),
('650e8400-e29b-41d4-a716-446655440010', 'close_cash_register', 'Cerrar Caja', 'cash_register', 'Permite cerrar turno de caja'),
('650e8400-e29b-41d4-a716-446655440011', 'view_cash_register', 'Ver Caja', 'cash_register', 'Permite consultar movimientos de caja'),

-- Reportes
('650e8400-e29b-41d4-a716-446655440012', 'view_reports', 'Ver Reportes', 'reports', 'Permite generar y consultar reportes'),
('650e8400-e29b-41d4-a716-446655440013', 'export_reports', 'Exportar Reportes', 'reports', 'Permite exportar reportes'),

-- Usuarios
('650e8400-e29b-41d4-a716-446655440014', 'create_user', 'Crear Usuario', 'users', 'Permite registrar nuevos usuarios'),
('650e8400-e29b-41d4-a716-446655440015', 'edit_user', 'Editar Usuario', 'users', 'Permite modificar usuarios'),
('650e8400-e29b-41d4-a716-446655440016', 'delete_user', 'Eliminar Usuario', 'users', 'Permite desactivar usuarios'),
('650e8400-e29b-41d4-a716-446655440017', 'view_users', 'Ver Usuarios', 'users', 'Permite listar usuarios');

-- Asignar TODOS los permisos al admin
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id)
SELECT 
  lower(hex(randomblob(16))),
  '550e8400-e29b-41d4-a716-446655440001',
  id
FROM permissions;

-- Permisos para MANAGER (sin gestión de usuarios)
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id) VALUES
('750e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440001'),
('750e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440002'),
('750e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440003'),
('750e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440004'),
('750e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440005'),
('750e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440006'),
('750e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440007'),
('750e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440008'),
('750e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440009'),
('750e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440010'),
('750e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440011'),
('750e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440012'),
('750e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440013');

-- Permisos para CASHIER (solo ventas y caja)
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id) VALUES
('850e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440004'),
('850e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440005'),
('850e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440008'),
('850e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440009'),
('850e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440010'),
('850e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440011');
