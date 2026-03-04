-- ============================================
-- MIGRATION 004: USUARIOS DE PRUEBA (SOLO DEBUG)
-- ============================================
-- Estos usuarios solo se crean en modo desarrollo para testing

-- Usuario inactivo para tests E2E
-- Username: inactive_user
-- Password: 1234 (mismo hash que admin)
INSERT OR IGNORE INTO users (id, username, password_hash, full_name, role_id, is_active) VALUES
(
  '450e8400-e29b-41d4-a716-446655440002',
  'inactive_user',
  '$argon2id$v=19$m=19456,t=2,p=1$KzjNy3L+pho+pXWjTETtUQ$Fu+WvcCBCyUml+tpx/nxLqeVUB2rCd1CZ79y+FBfqqE',
  'Usuario Inactivo (Test)',
  '550e8400-e29b-41d4-a716-446655440003',  -- cashier role
  0  -- INACTIVO
);

-- Usuario manager para pruebas futuras
-- Username: manager
-- Password: 1234
INSERT OR IGNORE INTO users (id, username, password_hash, full_name, role_id, is_active) VALUES
(
  '450e8400-e29b-41d4-a716-446655440003',
  'manager',
  '$argon2id$v=19$m=19456,t=2,p=1$KzjNy3L+pho+pXWjTETtUQ$Fu+WvcCBCyUml+tpx/nxLqeVUB2rCd1CZ79y+FBfqqE',
  'Gerente Test',
  '550e8400-e29b-41d4-a716-446655440002',  -- manager role
  1
);

-- Usuario cajero para pruebas futuras
-- Username: cashier
-- Password: 1234
INSERT OR IGNORE INTO users (id, username, password_hash, full_name, role_id, is_active) VALUES
(
  '450e8400-e29b-41d4-a716-446655440004',
  'cashier',
  '$argon2id$v=19$m=19456,t=2,p=1$KzjNy3L+pho+pXWjTETtUQ$Fu+WvcCBCyUml+tpx/nxLqeVUB2rCd1CZ79y+FBfqqE',
  'Cajero Test',
  '550e8400-e29b-41d4-a716-446655440003',  -- cashier role
  1
);