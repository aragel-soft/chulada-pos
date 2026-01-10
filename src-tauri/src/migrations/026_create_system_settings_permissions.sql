-- ============================================
-- MIGRATION 026: SYSTEM SETTINGS PERMISSIONS
-- ============================================

-- 1. Insertar permisos para el módulo de Kits
INSERT INTO permissions (id, name, display_name, description, module, sequence)
VALUES 
('perm_hardware_view', 'hardware_settings:view', 'Ver Hardware', 'Permite visualizar el listado de hardware', 'hardware', 1),
('perm_hardware_create_edit', 'hardware_settings:create', 'Crear Hardware', 'Permite Modificar  dispositivos de hardware', 'hardware', 2),
('perm_business_settings_view', 'business_settings:view', 'Ver Configuración del Negocio', 'Permite visualizar la configuración del negocio', 'business_settings', 1),
('perm_business_settings_edit', 'business_settings:edit', 'Editar Configuración del Negocio', 'Permite modificar la configuración del negocio', 'business_settings', 2),
('perm_ticket_settings_view', 'ticket_settings:view', 'Ver Configuración de Tickets', 'Permite visualizar la configuración de tickets', 'ticket_settings', 1),
('perm_ticket_settings_edit', 'ticket_settings:edit', 'Editar Configuración de Tickets', 'Permite modificar la configuración de tickets', 'ticket_settings', 2),
('perm_ticket_settings_print', 'ticket_settings:print', 'Imprimir Tickets de Prueba', 'Permite imprimir tickets de prueba desde el sistema', 'ticket_settings', 3);

-- 2. Asignar permisos al rol Administrador (ID fijo del seed)
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT 
  'rp-' || id, 
  '550e8400-e29b-41d4-a716-446655440001', 
  id
FROM permissions 
WHERE id IN (
  'perm_hardware_view', 
  'perm_hardware_create_edit', 
  'perm_hardware_edit', 
  'perm_hardware_delete',
  'perm_business_settings_view',
  'perm_business_settings_edit',
  'perm_ticket_settings_view',
  'perm_ticket_settings_edit',
  'perm_ticket_settings_print'
);