-- ==================================================================
-- MIGRATION 028: SEED DE PROMOCIONES TIPO COMBO
-- ==================================================================

-- 🟢 CASO 1: ACTIVA (El clásico "Tinte + Peróxido")
-- Estado esperado: Badge VERDE "Activa"
INSERT INTO promotions (id, name, description, combo_price, start_date, end_date, is_active) VALUES 
('promo_01', 'Pack Rubio Perfecto', 'Llévate el tinte y el peróxido con descuento', 120.00, date('now', '-1 day'), date('now', '+30 days'), 1);

INSERT INTO promotion_combos (id, promotion_id, product_id, quantity) VALUES 
('pc_01_a', 'promo_01', 'p001', 1), -- Tinte Kuul Rubio
('pc_01_b', 'promo_01', 'p005', 1); -- Peróxido Hidra

-- 🟡 CASO 2: PROGRAMADA (Futuro)
-- Estado esperado: Badge AMARILLO "Programada"
INSERT INTO promotions (id, name, description, combo_price, start_date, end_date, is_active) VALUES 
('promo_02', 'Kit Matizador Pro', 'Ideal para mantenimiento de rubios', 290.00, date('now', '+15 days'), date('now', '+45 days'), 1);

INSERT INTO promotion_combos (id, promotion_id, product_id, quantity) VALUES 
('pc_02_a', 'promo_02', 'p004', 1), -- Shampoo Matizador
('pc_02_b', 'promo_02', 'p009', 1); -- Tratamiento Reconstructor


-- 🔴 CASO 3: VENCIDA (Pasado)
-- Estado esperado: Badge ROJO "Vencida"
INSERT INTO promotions (id, name, description, combo_price, start_date, end_date, is_active) VALUES 
('promo_03', 'Oferta Buen Fin (Vencida)', 'Promoción antigua de maquillaje', 150.00, date('now', '-60 days'), date('now', '-10 days'), 1);

INSERT INTO promotion_combos (id, promotion_id, product_id, quantity) VALUES 
('pc_03_a', 'promo_03', 'p011', 1), -- Rimel Bissú
('pc_03_b', 'promo_03', 'p013', 1), -- Maquillaje Líquido
('pc_03_c', 'promo_03', 'p012', 1); -- Corrector


-- ⚫ CASO 4: INACTIVA (Desactivada Manualmente)
-- Estado esperado: Badge GRIS "Inactivo"
INSERT INTO promotions (id, name, description, combo_price, start_date, end_date, is_active) VALUES 
('promo_04', 'Combo Uñas Principiante', 'Suspendido por falta de stock', 230.00, date('now'), date('now', '+30 days'), 0);

INSERT INTO promotion_combos (id, promotion_id, product_id, quantity) VALUES 
('pc_04_a', 'promo_04', 'p021', 1), -- Monómero
('pc_04_b', 'promo_04', 'p022', 1); -- Acrílico Cristal


-- 🟢 CASO 5: ACTIVA (Largo Plazo)
-- Estado esperado: Badge VERDE "Activa"
INSERT INTO promotions (id, name, description, combo_price, start_date, end_date, is_active) VALUES 
('promo_05', 'Barbería Essentials', 'Combo fijo de barbería', 210.00, date('now', '-5 days'), date('now', '+365 days'), 1);

INSERT INTO promotion_combos (id, promotion_id, product_id, quantity) VALUES 
('pc_05_a', 'promo_05', 'p034', 1), -- Cool Care Desinfectante
('pc_05_b', 'promo_05', 'p037', 2); -- Papel Cuello (2 rollos)
