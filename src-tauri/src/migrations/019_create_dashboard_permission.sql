-- ============================================
-- MIGRATION 019: DASHBOARD PERMISSION
-- ============================================
-- Insertar permiso para ver, crear, editar historial e agregar inventario
INSERT INTO permissions (id, name, display_name, description, module, sequence)
VALUES 
('perm_history_view', 'history:view', 'Ver Historial', 'Permite ver el historial', 'dashboard', 1),
('perm_add_inventory_view', 'add_inventory:view', 'Agregar Inventario', 'Permite agregar inventario', 'add_inventory', 1),
('perm_add_inventory_add', 'add_inventory:add', 'Agregar Inventario', 'Permite agregar inventario', 'add_inventory', 2),
('perm_history_devolution', 'history:devolution', 'Devolver productos', 'Permite devolver productos', 'dashboard', 2),
('perm_history_cancel', 'history:cancel', 'Cancelar ventas', 'Permite cancelar ventas', 'dashboard', 3);

-- Asignar permisos a admin
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT 
  'rp-' || id, 
  '550e8400-e29b-41d4-a716-446655440001', 
  id
FROM permissions 
WHERE id IN (
  'perm_history_view', 
  'perm_add_inventory_view', 
  'perm_add_inventory_add', 
  'perm_history_devolution', 
  'perm_history_cancel'
);