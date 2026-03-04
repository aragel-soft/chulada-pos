-- ==============================
-- CONFIGURACIONES DEL SISTEMA 
-- ==============================
INSERT OR IGNORE INTO "system_settings" ("key", "value", "updated_at") VALUES 
('store_name', 'Mi Tienda', '2026-03-04 16:10:23'),
('logical_store_name', 'store-main', '2026-03-04 16:10:23'),
('store_address', '', '2026-03-04 16:10:23'),
('ticket_header', '', '2026-03-04 16:10:23'),
('ticket_footer', 'Gracias por su compra', '2026-03-04 16:10:23'),
('ticket_footer_lines', '0', '2026-03-04 16:10:23'),
('default_cash_fund', '500', '2026-03-04 16:10:23'),
('max_cash_limit', '2000', '2026-03-04 16:10:23'),
('tax_rate', '0', '2026-03-04 16:10:23'),
('apply_tax', 'false', '2026-03-04 16:10:23'),
('logo_path', '', '2026-03-04 16:10:23'),
('allow_out_of_stock_sales', 'true', '2026-03-04 19:03:53');

-- ================================
-- USUARIO ADMINISTRADOR PRINCIPAL
-- ================================
INSERT OR IGNORE INTO "users" ("id", "username", "password_hash", "full_name", "role_id", "is_active") VALUES
(
  '450e8400-e29b-41d4-a716-446655440001',
  'admin',
  '$argon2id$v=19$m=19456,t=2,p=1$KzjNy3L+pho+pXWjTETtUQ$Fu+WvcCBCyUml+tpx/nxLqeVUB2rCd1CZ79y+FBfqqE',
  'Administrador del Sistema',
  '550e8400-e29b-41d4-a716-446655440001',
  1
);
