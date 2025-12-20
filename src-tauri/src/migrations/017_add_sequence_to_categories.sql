-- ========================================================================
-- MIGRATION 016: Agregar secuencia a las categorías
-- ========================================================================

-- Agregar secuencia a las categorías
ALTER TABLE categories ADD COLUMN sequence INTEGER DEFAULT 0;

-- Insertar datos de ejemplo
INSERT INTO categories (id, name, parent_category_id, color, sequence, created_at, description) VALUES 
-- Cuidado Capilar (Azules sólidos)
('cat-root-1', 'Cuidado Capilar', NULL, '#2563EB', 1, DATETIME('now', '-1 day'), 'Cuidado Capilar especializado'),
('cat-child-1', 'Tintes', 'cat-root-1', '#4F46E5', 1, DATETIME('now', '-18 hours'), 'Tintes para cabello'),
('cat-child-2', 'Shampoos', 'cat-root-1', '#0284C7', 2, DATETIME('now', '-12 hours'), 'Shampoos para cabello'),
('cat-root-2', 'Maquillaje', NULL, '#DB2777', 2, DATETIME('now', '-2 days'), 'Maquillaje especializado'),
('cat-root-3', 'Cremas', NULL, '#7C3AED', 3, DATETIME('now', '-6 hours'), 'Cremas para piel'),
('cat-root-4', 'Labiales', NULL, '#E11D48', 4, DATETIME('now', '-6 hours'), 'Labiales para labios'),
('cat-root-5', 'Peroxidos', NULL, '#059669', 5, DATETIME('now', '-6 hours'), 'Peroxidos para cabello'),
('cat-root-6', 'Decolorantes', NULL, '#8B5CF6', 6, DATETIME('now', '-6 hours'), 'Decolorantes para cabello'),
('cat-root-7', 'Ligas', NULL, '#0D9488', 7, DATETIME('now', '-6 hours'), 'Ligas para cabello'),
('cat-root-8', 'Cabello', NULL, '#D97706', 8, DATETIME('now', '-6 hours'), 'Cabello real'),
('cat-root-9', 'Guadalajara', NULL, '#EA580C', 9, DATETIME('now', '-6 hours'), 'Guadalajara especializada'),
('cat-root-10', 'Hidracolor', NULL, '#BE185D', 10, DATETIME('now', '-6 hours'), 'Hidracolor especializada'),
('cat-child-11', 'Tintes', 'cat-root-10', '#1D4ED8', 1, DATETIME('now', '-6 hours'), 'Tintes para cabello'),
('cat-child-12', 'Shampoos', 'cat-root-10', '#0E7490', 2, DATETIME('now', '-6 hours'), 'Shampoos para cabello'),
('cat-child-13', 'Cremas', 'cat-root-10', '#6D28D9', 3, DATETIME('now', '-6 hours'), 'Cremas para piel',), 
('cat-child-14', 'Ampolletas', 'cat-root-10', '#B45309', 4, DATETIME('now', '-6 hours'), 'Ampolletas para el cabello');

-- Insertar permiso para ver, crear, editar y eliminar categorias
INSERT INTO permissions (id, name, display_name, description, module, sequence)
VALUES 
('perm_categories_view', 'categories:view', 'Ver Categorias', 'Permite ver las categorias', 'inventory', 1),
('perm_categories_create', 'categories:create', 'Crear Categorias', 'Permite crear categorias', 'inventory', 2),
('perm_categories_edit', 'categories:edit', 'Editar Categorias', 'Permite editar categorias', 'inventory', 3),
('perm_categories_delete', 'categories:delete', 'Eliminar Categorias', 'Permite eliminar categorias', 'inventory', 4);

-- Asignar permisos a admin
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT 
  'rp-' || id, 
  (SELECT id FROM roles WHERE name = 'admin'), 
  id
FROM permissions 
WHERE id IN (
  'perm_categories_view', 
  'perm_categories_create', 
  'perm_categories_edit', 
  'perm_categories_delete'
);
