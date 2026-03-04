-- ============================================
-- MIGRATION 035: PERMISOS DE MOVIMIENTOS
-- ============================================

-- 1. Insertar permisos para el módulo de Movimientos
INSERT INTO permissions (id, name, display_name, description, module, sequence)
VALUES 
('perm_inv_mov_view', 'inventory_movements:view', 'Ver Kardex', 'Permite visualizar el historial cronológico de movimientos', 'inventory_movements', 1),
('perm_inv_mov_create', 'inventory_movements:create', 'Crear Ajuste Manual', 'Permite crear movimientos de entrada o salida', 'inventory_movements', 2),
('perm_inv_mov_entry', 'inventory_movements:entry', 'Registrar Entrada Rápida', 'Permite registrar entradas de mercancía', 'inventory_movements', 3);

-- 2. Asignar permisos al rol Administrador
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT 
  'rp-' || id, 
  '550e8400-e29b-41d4-a716-446655440001', 
  id
FROM permissions 
WHERE id IN (
  'perm_inv_mov_view', 
  'perm_inv_mov_create',
  'perm_inv_mov_entry'
);
