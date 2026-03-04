-- ============================================
-- MIGRATION 021: SEED DATA KITS (EXPANDED)
-- ============================================
-- Seeding Dyes and Peroxides for: Kuul, Hidra, Anven, Alfaparf

INSERT INTO products (id, code, name, category_id, retail_price, wholesale_price, is_active) VALUES
-- KUUL (3 Dyes, 4 Peroxides)
('pr-kit-k-t1', 'KIT-KUL-902', 'Tinte Kuul Rubio Ultra Claro Nacarado 90ml', 'cat-tintes', 65.00, 48.00, 1),
('pr-kit-k-t2', 'KIT-KUL-744', 'Tinte Kuul Rubio Medio Cobrizo Intenso', 'cat-tintes', 65.00, 48.00, 1),
('pr-kit-k-t3', 'KIT-KUL-BLK', 'Tinte Kuul Negro 1.1', 'cat-tintes', 65.00, 48.00, 1),
('pr-kit-k-p1', 'KIT-KUL-P10', 'Peróxido Kuul 10 Vol 135ml', 'cat-capilar', 25.00, 18.00, 1),
('pr-kit-k-p2', 'KIT-KUL-P20', 'Peróxido Kuul 20 Vol 135ml', 'cat-capilar', 25.00, 18.00, 1),
('pr-kit-k-p3', 'KIT-KUL-P30', 'Peróxido Kuul 30 Vol 135ml', 'cat-capilar', 25.00, 18.00, 1),
('pr-kit-k-p4', 'KIT-KUL-P40', 'Peróxido Kuul 40 Vol 135ml', 'cat-capilar', 25.00, 18.00, 1),

-- HIDRA (3 Dyes, 4 Peroxides)
('pr-kit-h-t1', 'KIT-HID-600', 'Tinte Hidra Rubio Oscuro', 'cat-tintes', 60.00, 45.00, 1),
('pr-kit-h-t2', 'KIT-HID-700', 'Tinte Hidra Rubio Medio', 'cat-tintes', 60.00, 45.00, 1),
('pr-kit-h-t3', 'KIT-HID-800', 'Tinte Hidra Rubio Claro', 'cat-tintes', 60.00, 45.00, 1),
('pr-kit-h-p1', 'KIT-HID-P10', 'Peróxido Hidra 10 Vol 1L', 'cat-capilar', 85.00, 65.00, 1),
('pr-kit-h-p2', 'KIT-HID-P20', 'Peróxido Hidra 20 Vol 1L', 'cat-capilar', 85.00, 65.00, 1),
('pr-kit-h-p3', 'KIT-HID-P30', 'Peróxido Hidra 30 Vol 1L', 'cat-capilar', 85.00, 65.00, 1),
('pr-kit-h-p4', 'KIT-HID-P40', 'Peróxido Hidra 40 Vol 1L', 'cat-capilar', 85.00, 65.00, 1),

-- ANVEN (3 Dyes, 4 Peroxides)
('pr-kit-a-t1', 'KIT-ANV-55', 'Tinte Anven Castaño Claro Caoba', 'cat-tintes', 55.00, 40.00, 1),
('pr-kit-a-t2', 'KIT-ANV-66', 'Tinte Anven Rubio Oscuro Rojizo', 'cat-tintes', 55.00, 40.00, 1),
('pr-kit-a-t3', 'KIT-ANV-77', 'Tinte Anven Rubio Medio Cobrizo', 'cat-tintes', 55.00, 40.00, 1),
('pr-kit-a-p1', 'KIT-ANV-P10', 'Peróxido Anven 10 Vol 90ml', 'cat-capilar', 20.00, 15.00, 1),
('pr-kit-a-p2', 'KIT-ANV-P20', 'Peróxido Anven 20 Vol 90ml', 'cat-capilar', 20.00, 15.00, 1),
('pr-kit-a-p3', 'KIT-ANV-P30', 'Peróxido Anven 30 Vol 90ml', 'cat-capilar', 20.00, 15.00, 1),
('pr-kit-a-p4', 'KIT-ANV-P40', 'Peróxido Anven 40 Vol 90ml', 'cat-capilar', 20.00, 15.00, 1),

-- ALFAPARF (3 Dyes, 4 Peroxides)
('pr-kit-al-t1', 'KIT-ALF-9', 'Tinte Alfaparf 9 Very Light Blonde', 'cat-tintes', 95.00, 75.00, 1),
('pr-kit-al-t2', 'KIT-ALF-10', 'Tinte Alfaparf 10 Platinum', 'cat-tintes', 95.00, 75.00, 1),
('pr-kit-al-t3', 'KIT-ALF-11', 'Tinte Alfaparf 11.11 Super High Lift', 'cat-tintes', 95.00, 75.00, 1),
('pr-kit-al-p1', 'KIT-ALF-P10', 'Peróxido Alfaparf 10 Vol 90ml', 'cat-capilar', 40.00, 30.00, 1),
('pr-kit-al-p2', 'KIT-ALF-P20', 'Peróxido Alfaparf 20 Vol 90ml', 'cat-capilar', 40.00, 30.00, 1),
('pr-kit-al-p3', 'KIT-ALF-P30', 'Peróxido Alfaparf 30 Vol 90ml', 'cat-capilar', 40.00, 30.00, 1),
('pr-kit-al-p4', 'KIT-ALF-P40', 'Peróxido Alfaparf 40 Vol 90ml', 'cat-capilar', 40.00, 30.00, 1);

--- insert stock
INSERT INTO store_inventory (id, store_id, product_id, stock, minimum_stock)
SELECT 
  'inv-' || id, 
  'store-main', 
  id, 
  100,
  5
FROM products where id like 'pr-kit-%';


-- ============================================
-- KIT DEFINITIONS
-- ============================================

-- 1. KIT KUUL
INSERT INTO product_kit_options (id, name, description, is_required, max_selections, is_active)
VALUES ('kit-kuul', 'Promo Kuul: Tinte + Peróxido', 'Peróxido Kuul Gratis en la compra de Tinte', 1, 1, 1);

INSERT INTO product_kit_main (kit_option_id, main_product_id) VALUES 
('kit-kuul', 'pr-kit-k-t1'), ('kit-kuul', 'pr-kit-k-t2'), ('kit-kuul', 'pr-kit-k-t3');

INSERT INTO product_kit_items (id, kit_option_id, included_product_id, quantity) VALUES
('ki-k-1', 'kit-kuul', 'pr-kit-k-p1', 1),
('ki-k-2', 'kit-kuul', 'pr-kit-k-p2', 1),
('ki-k-3', 'kit-kuul', 'pr-kit-k-p3', 1),
('ki-k-4', 'kit-kuul', 'pr-kit-k-p4', 1);


-- 2. KIT HIDRA
INSERT INTO product_kit_options (id, name, description, is_required, max_selections, is_active)
VALUES ('kit-hidra', 'Promo Hidra: Tinte + Peróxido', 'Peróxido Hidra Gratis en la compra de Tinte', 1, 1, 1);

INSERT INTO product_kit_main (kit_option_id, main_product_id) VALUES 
('kit-hidra', 'pr-kit-h-t1'), ('kit-hidra', 'pr-kit-h-t2'), ('kit-hidra', 'pr-kit-h-t3');

INSERT INTO product_kit_items (id, kit_option_id, included_product_id, quantity) VALUES
('ki-h-1', 'kit-hidra', 'pr-kit-h-p1', 1),
('ki-h-2', 'kit-hidra', 'pr-kit-h-p2', 1),
('ki-h-3', 'kit-hidra', 'pr-kit-h-p3', 1),
('ki-h-4', 'kit-hidra', 'pr-kit-h-p4', 1);


-- 3. KIT ANVEN
INSERT INTO product_kit_options (id, name, description, is_required, max_selections, is_active)
VALUES ('kit-anven', 'Promo Anven: Tinte + Peróxido', 'Peróxido Anven Gratis en la compra de Tinte', 1, 1, 1);

INSERT INTO product_kit_main (kit_option_id, main_product_id) VALUES 
('kit-anven', 'pr-kit-a-t1'), ('kit-anven', 'pr-kit-a-t2'), ('kit-anven', 'pr-kit-a-t3');

INSERT INTO product_kit_items (id, kit_option_id, included_product_id, quantity) VALUES
('ki-a-1', 'kit-anven', 'pr-kit-a-p1', 1),
('ki-a-2', 'kit-anven', 'pr-kit-a-p2', 1),
('ki-a-3', 'kit-anven', 'pr-kit-a-p3', 1),
('ki-a-4', 'kit-anven', 'pr-kit-a-p4', 1);


-- 4. KIT ALFAPARF
INSERT INTO product_kit_options (id, name, description, is_required, max_selections, is_active)
VALUES ('kit-alfaparf', 'Promo Alfaparf: Tinte + Peróxido', 'Peróxido Alfaparf Gratis en la compra de Tinte', 1, 1, 1);

INSERT INTO product_kit_main (kit_option_id, main_product_id) VALUES 
('kit-alfaparf', 'pr-kit-al-t1'), ('kit-alfaparf', 'pr-kit-al-t2'), ('kit-alfaparf', 'pr-kit-al-t3');

INSERT INTO product_kit_items (id, kit_option_id, included_product_id, quantity) VALUES
('ki-al-1', 'kit-alfaparf', 'pr-kit-al-p1', 1),
('ki-al-2', 'kit-alfaparf', 'pr-kit-al-p2', 1),
('ki-al-3', 'kit-alfaparf', 'pr-kit-al-p3', 1),
('ki-al-4', 'kit-alfaparf', 'pr-kit-al-p4', 1);
