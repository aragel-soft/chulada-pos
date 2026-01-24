-- ============================================
-- MIGRATION 020: PROMOTIONS PERMISSIONS
-- ============================================

-- 1. Insertar permisos para el módulo de Promociones
INSERT INTO permissions (id, name, display_name, description, module, sequence)
VALUES 
('perm_promotions_view', 'promotions:view', 'Ver Promociones', 'Permite visualizar el listado de promociones', 'promotions', 1),
('perm_promotions_create', 'promotions:create', 'Crear Promociones', 'Permite registrar nuevas promociones', 'promotions', 2),
('perm_promotions_edit', 'promotions:edit', 'Editar Promociones', 'Permite modificar promociones existentes', 'promotions', 3),
('perm_promotions_delete', 'promotions:delete', 'Eliminar Promociones', 'Permite desactivar o eliminar promociones', 'promotions', 4);

-- 2. Asignar permisos al rol Administrador (ID fijo del seed)
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT 
  'rp-' || id, 
  '550e8400-e29b-41d4-a716-446655440001', 
  id
FROM permissions 
WHERE id IN (
  'perm_promotions_view',
  'perm_promotions_create',
  'perm_promotions_edit', 
  'perm_promotions_delete'
);
