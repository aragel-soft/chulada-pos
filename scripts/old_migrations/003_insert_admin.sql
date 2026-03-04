-- ============================================
-- MIGRATION 003: USUARIO ADMIN INICIAL
-- ============================================

-- Usuario admin por defecto
INSERT OR IGNORE INTO users (id, username, password_hash, full_name, role_id, is_active) VALUES
(
  '450e8400-e29b-41d4-a716-446655440001',
  'admin',
  '$argon2id$v=19$m=19456,t=2,p=1$KzjNy3L+pho+pXWjTETtUQ$Fu+WvcCBCyUml+tpx/nxLqeVUB2rCd1CZ79y+FBfqqE',
  'Administrador del Sistema',
  '550e8400-e29b-41d4-a716-446655440001',
  1
);
