-- ============================================
-- MIGRATION 010: INSERTAR USUARIO SIN PERMISOS
-- ============================================

-- Insertar un rol sin permisos
INSERT OR IGNORE INTO roles (id, name, display_name, description) VALUES
('880e8400-e29b-41d4-a716-446655440001', 'no_permissions', 'Sin Permisos', 'Rol asignado a usuarios sin permisos específicos');

-- Insertar un usuario sin permisos asignados
INSERT OR IGNORE INTO users (id, username, password_hash, full_name, role_id) VALUES
('770e8400-e29b-41d4-a716-446655440001', 'nobody', '$argon2id$v=19$m=19456,t=2,p=1$KzjNy3L+pho+pXWjTETtUQ$Fu+WvcCBCyUml+tpx/nxLqeVUB2rCd1CZ79y+FBfqqE', 'Usuario Sin Permisos', '880e8400-e29b-41d4-a716-446655440001');
