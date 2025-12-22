-- ============================================
-- MIGRATION 019: SEED DATA KITS (PRUEBAS)
-- ============================================

-- CASO A: KIT ESTÁTICO 1 a 1 (Regla estricta)
-- "En la compra de la Plancha, llévate 1 Ampolleta GRATIS"
INSERT INTO product_kit_options (id, name, description, is_required, max_selections, is_active)
VALUES ('kit-plancha-regalo', 'Regalo por Plancha', 'Incluye 1 ampolleta de cortesía', 1, 1, 1);

-- Trigger: Plancha Babyliss (p042)
INSERT INTO product_kit_main (kit_option_id, main_product_id)
VALUES ('kit-plancha-regalo', 'p042');

-- Item de Regalo: Ampolleta (p007) - Cantidad 1
INSERT INTO product_kit_items (id, kit_option_id, included_product_id, quantity) 
VALUES ('ki-001', 'kit-plancha-regalo', 'p007', 1);

-- CASO B: KIT DINÁMICO (Muchos Triggers -> 1 Regalo)
-- "En la compra de CUALQUIER tinte, llévate 1 Peróxido"
-- Aunque hay muchos triggers, la regla es 1 a 1 en el momento de la venta.
INSERT INTO product_kit_options (id, name, description, is_required, max_selections, is_active)
VALUES ('kit-promo-tinte', 'Promo Tinte + Peróxido', 'Peróxido gratis al comprar tinte', 1, 1, 1);

-- Triggers: Tintes Kuul, Hidra y Loqual
INSERT INTO product_kit_main (kit_option_id, main_product_id) VALUES 
('kit-promo-tinte', 'p001'), -- Kuul 902
('kit-promo-tinte', 'p002'), -- Kuul 744
('kit-promo-tinte', 'p003'), -- Kuul Negro
('kit-promo-tinte', 'p010'); -- Loqual Uva

-- Item de Regalo: Peróxido 20 vol (p066)
INSERT INTO product_kit_items (id, kit_option_id, included_product_id, quantity)
VALUES ('ki-003', 'kit-promo-tinte', 'p066', 1);
