-- ============================================
-- MIGRATION 020: KITS PERMISSIONS
-- ============================================

-- 1. Insertar permisos para el módulo de Kits
INSERT INTO permissions (id, name, display_name, description, module, sequence)
VALUES 
('perm_kits_view', 'kits:view', 'Ver Kits', 'Permite visualizar el listado de kits', 'kits', 1),
('perm_kits_create', 'kits:create', 'Crear Kits', 'Permite registrar nuevas reglas de kits', 'kits', 2),
('perm_kits_edit', 'kits:edit', 'Editar Kits', 'Permite modificar kits existentes', 'kits', 3),
('perm_kits_delete', 'kits:delete', 'Eliminar Kits', 'Permite desactivar o eliminar kits', 'kits', 4);

-- 2. Asignar permisos al rol Administrador (ID fijo del seed)
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT 
  'rp-' || id, 
  '550e8400-e29b-41d4-a716-446655440001', 
  id
FROM permissions 
WHERE id IN (
  'perm_kits_view', 
  'perm_kits_create', 
  'perm_kits_edit', 
  'perm_kits_delete'
);