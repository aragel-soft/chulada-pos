-- ============================================
-- MIGRATION 013: PERMISOS DE INVENTARIO 
-- ============================================

-- Eliminar permisos de inventario existentes 
DELETE FROM role_permissions 
WHERE permission_id IN (SELECT id FROM permissions WHERE module = 'inventory');

DELETE FROM permissions 
WHERE module = 'inventory';

-- Insertar permisos de inventario

-- Permiso General del Dashboard
INSERT INTO permissions (id, name, display_name, description, module) VALUES 
('perm-inv-view', 'inventory:view', 'Ver Inventario', 'Acceso al dashboard general de inventario', 'inventory');

-- Permisos de Recurso: PRODUCTOS
INSERT INTO permissions (id, name, display_name, description, module) VALUES 
('perm-prod-view',   'products:view',   'Ver Productos',      'Ver lista y detalles de productos',    'inventory'),
('perm-prod-create', 'products:create', 'Crear Productos',    'Crear nuevos productos',               'inventory'),
('perm-prod-edit',   'products:edit',   'Editar Productos',   'Modificar datos de productos',         'inventory'),
('perm-prod-del',    'products:delete', 'Eliminar Productos', 'Eliminar o desactivar productos',      'inventory');

-- 3. Asignar permisos de inventario al rol 'admin'
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT 
  'rp-' || id, 
  (SELECT id FROM roles WHERE name = 'admin'), 
  id 
FROM permissions WHERE module = 'inventory';
