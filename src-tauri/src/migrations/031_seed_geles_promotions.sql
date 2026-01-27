-- ============================================
-- MIGRATION 031: SEED PROMOCIONES DE GELES
-- ============================================

-- ============================================
-- 1. PRODUCTOS: 3 GELES POR MARCA
-- ============================================

INSERT INTO products (id, code, name, category_id, retail_price, wholesale_price, is_active) VALUES
-- KUUL GELES
('pr-gel-k-1', 'GEL-KUL-FIJ', 'Gel Kuul Fijación Extra Fuerte 500ml', 'cat-capilar', 85.00, 65.00, 1),
('pr-gel-k-2', 'GEL-KUL-BRI', 'Gel Kuul Brillo Extremo 500ml', 'cat-capilar', 85.00, 65.00, 1),
('pr-gel-k-3', 'GEL-KUL-WET', 'Gel Kuul Wet Look 500ml', 'cat-capilar', 85.00, 65.00, 1),

-- NEFERTITI GELES
('pr-gel-n-1', 'GEL-NEF-ULT', 'Gel Nefertiti Ultra Fijación 473ml', 'cat-capilar', 75.00, 60.00, 1),
('pr-gel-n-2', 'GEL-NEF-ALC', 'Gel Nefertiti Sin Alcohol 473ml', 'cat-capilar', 75.00, 60.00, 1),
('pr-gel-n-3', 'GEL-NEF-COL', 'Gel Nefertiti Con Color 473ml', 'cat-capilar', 75.00, 60.00, 1),

-- ALFAPARF GELES (Premium)
('pr-gel-a-1', 'GEL-ALF-SCU', 'Gel Alfaparf Semi Di Lino Sculpting 250ml', 'cat-capilar', 180.00, 140.00, 1),
('pr-gel-a-2', 'GEL-ALF-DEF', 'Gel Alfaparf Style Stories Defining 150ml', 'cat-capilar', 165.00, 130.00, 1),
('pr-gel-a-3', 'GEL-ALF-MOD', 'Gel Alfaparf Modeling Wax 100ml', 'cat-capilar', 150.00, 120.00, 1);

-- Insertar inventario inicial
INSERT INTO store_inventory (id, store_id, product_id, stock, minimum_stock)
SELECT 
  'inv-' || id, 
  'store-main', 
  id, 
  50,
  10
FROM products WHERE id LIKE 'pr-gel-%';

-- ============================================
-- 2. PROMOCIONES DE GELES
-- ============================================

-- 🟢 PROMO 1: Pack 2 Geles Kuul (Activa)
INSERT INTO promotions (id, name, description, combo_price, start_date, end_date, is_active) VALUES 
('promo_gel_01', 'Pack 2 Geles Kuul', 'Llévate 2 geles Kuul con descuento', 150.00, date('now', '-2 days'), date('now', '+60 days'), 1);

INSERT INTO promotion_combos (id, promotion_id, product_id, quantity) VALUES 
('pc_gel_01_a', 'promo_gel_01', 'pr-gel-k-1', 1), -- Gel Fijación
('pc_gel_01_b', 'promo_gel_01', 'pr-gel-k-2', 1); -- Gel Brillo

-- 🟢 PROMO 2: Pack 3 Geles Kuul Completo (Activa)
INSERT INTO promotions (id, name, description, combo_price, start_date, end_date, is_active) VALUES 
('promo_gel_02', 'Pack 3 Geles Kuul Completo', 'Los 3 geles Kuul al mejor precio', 220.00, date('now', '-5 days'), date('now', '+90 days'), 1);

INSERT INTO promotion_combos (id, promotion_id, product_id, quantity) VALUES 
('pc_gel_02_a', 'promo_gel_02', 'pr-gel-k-1', 1), -- Gel Fijación
('pc_gel_02_b', 'promo_gel_02', 'pr-gel-k-2', 1), -- Gel Brillo
('pc_gel_02_c', 'promo_gel_02', 'pr-gel-k-3', 1); -- Gel Wet Look

-- 🟢 PROMO 3: Pack 2 Geles Nefertiti (Activa)
INSERT INTO promotions (id, name, description, combo_price, start_date, end_date, is_active) VALUES 
('promo_gel_03', 'Pack 2 Geles Nefertiti', 'Combo Nefertiti Fijación + Color', 130.00, date('now', '-1 day'), date('now', '+45 days'), 1);

INSERT INTO promotion_combos (id, promotion_id, product_id, quantity) VALUES 
('pc_gel_03_a', 'promo_gel_03', 'pr-gel-n-1', 1), -- Ultra Fijación
('pc_gel_03_b', 'promo_gel_03', 'pr-gel-n-3', 1); -- Con Color

-- 🟢 PROMO 4: Pack 3 Geles Nefertiti Completo (Activa)
INSERT INTO promotions (id, name, description, combo_price, start_date, end_date, is_active) VALUES 
('promo_gel_04', 'Pack 3 Geles Nefertiti Salon', 'Pack completo para estilistas', 195.00, date('now'), date('now', '+60 days'), 1);

INSERT INTO promotion_combos (id, promotion_id, product_id, quantity) VALUES 
('pc_gel_04_a', 'promo_gel_04', 'pr-gel-n-1', 1), -- Ultra Fijación
('pc_gel_04_b', 'promo_gel_04', 'pr-gel-n-2', 1), -- Sin Alcohol
('pc_gel_04_c', 'promo_gel_04', 'pr-gel-n-3', 1); -- Con Color

-- 🟢 PROMO 5: Pack Alfaparf Premium (Activa)
INSERT INTO promotions (id, name, description, combo_price, start_date, end_date, is_active) VALUES 
('promo_gel_05', 'Pack Alfaparf Premium Styling', 'Gel Sculpting + Defining al mejor precio', 310.00, date('now', '-3 days'), date('now', '+120 days'), 1);

INSERT INTO promotion_combos (id, promotion_id, product_id, quantity) VALUES 
('pc_gel_05_a', 'promo_gel_05', 'pr-gel-a-1', 1), -- Sculpting Gel
('pc_gel_05_b', 'promo_gel_05', 'pr-gel-a-2', 1); -- Defining Gel

-- 🟢 PROMO 6: Pack 4 Geles Mixto Kuul + Nefertiti (Activa)
INSERT INTO promotions (id, name, description, combo_price, start_date, end_date, is_active) VALUES 
('promo_gel_06', 'Pack 4 Geles Económico Mixto', 'Combina Kuul y Nefertiti y ahorra', 290.00, date('now', '-1 day'), date('now', '+30 days'), 1);

INSERT INTO promotion_combos (id, promotion_id, product_id, quantity) VALUES 
('pc_gel_06_a', 'promo_gel_06', 'pr-gel-k-1', 1), -- Kuul Fijación
('pc_gel_06_b', 'promo_gel_06', 'pr-gel-k-2', 1), -- Kuul Brillo
('pc_gel_06_c', 'promo_gel_06', 'pr-gel-n-1', 1), -- Nefertiti Ultra
('pc_gel_06_d', 'promo_gel_06', 'pr-gel-n-2', 1); -- Nefertiti Sin Alcohol

-- 🟡 PROMO 7: Pack Alfaparf Completo (Programada para el futuro)
INSERT INTO promotions (id, name, description, combo_price, start_date, end_date, is_active) VALUES 
('promo_gel_07', 'Pack Alfaparf Completo Pro', 'Los 3 productos Alfaparf - Disponible próximamente', 440.00, date('now', '+10 days'), date('now', '+100 days'), 1);

INSERT INTO promotion_combos (id, promotion_id, product_id, quantity) VALUES 
('pc_gel_07_a', 'promo_gel_07', 'pr-gel-a-1', 1), -- Sculpting
('pc_gel_07_b', 'promo_gel_07', 'pr-gel-a-2', 1), -- Defining
('pc_gel_07_c', 'promo_gel_07', 'pr-gel-a-3', 1); -- Modeling Wax
