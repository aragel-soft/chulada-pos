-- ========================================================================
-- MIGRATION 015: PERMISO COSTO DE COMPRA Y ACTUALIZACIÓN DE PRODUCTOS
-- ========================================================================

-- Permiso para ver/editar Costo de Compra
INSERT OR IGNORE INTO permissions (id, name, display_name, description, module, sequence)
VALUES 
('perm_products_cost', 'products:purchase_price', 'Ver Costo Compra', 'Permite ver y editar el costo de compra', 'inventory', 5);

-- Asignar permiso al Rol de Admin
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id)
SELECT 
  'rp-' || id, 
  (SELECT id FROM roles WHERE name = 'admin'), 
  id 
FROM permissions WHERE id = 'perm_products_cost';

-- Actualizar productos existentes con costo aleatorio (entre 40% y 80% del precio mayoreo)
UPDATE products 
SET purchase_price = ROUND(wholesale_price * ((ABS(RANDOM()) % 41 + 40) / 100.0), 2)
WHERE purchase_price IS NULL OR purchase_price = 0;
