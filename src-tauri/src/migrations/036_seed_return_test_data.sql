-- ============================================
-- MIGRATION 036: SEED RETURN TEST DATA
-- ============================================

-- ==================================================================================
-- TEST CASE: COMPLEX RETURN (KIT + COMBO + GLOBAL DISCOUNT)
-- Sale Date: Today
-- Global Discount: 10%
-- Items:
-- 1. Kit: Tinte Anven + 2 Peróxidos (Gift)
-- 2. Promo: geles gift 
-- 3. Normal: Rimel
-- ==================================================================================

INSERT INTO sales (id, folio, sale_date, subtotal, discount_percentage, discount_amount, total, status, payment_method, cash_amount, has_discount, user_id)
SELECT 
  'sale-test-return-001', 
  '00000012', 
  datetime('now', 'localtime'), 
  440.00, -- Subtotal 
  10.00,  -- 10% Discount
  14.00,  -- Discount Amount
  426.00, -- Total
  'completed', 
  'cash', 
  426.00, 
  1, 
  '450e8400-e29b-41d4-a716-446655440001'
;


-- ITEM 1: KIT MAIN (Tinte Anven)
INSERT INTO sale_items (id, sale_id, product_id, product_name, product_code, quantity, unit_price, price_type, subtotal, discount_percentage, discount_amount, kit_option_id) VALUES
('si-test-01', 'sale-test-return-001', 'pr-kit-a-t1', 'Tinte Anven Castaño Claro Caoba', 'KIT-ANV-55', 2, 55.00, 'retail', 99.00, 10.00, 11.00, 'kit-anven');


-- ITEM 2 & 3: KIT ITEMS (Peróxidos) - Linked to Main
INSERT INTO sale_items (id, sale_id, product_id, product_name, product_code, quantity, unit_price, price_type, subtotal, kit_option_id) VALUES
('si-test-02', 'sale-test-return-001', 'pr-kit-a-p1', 'Peróxido Anven 10 Vol 90ml', 'KIT-ANV-P10', 1, 0.00, 'kit_item', 0.00, 'kit-anven'),
('si-test-03', 'sale-test-return-001', 'pr-kit-a-p2', 'Peróxido Anven 20 Vol 90ml', 'KIT-ANV-P20', 1, 0.00, 'kit_item', 0.00, 'kit-anven');

-- ITEM 4 & 5: Promo geles gift
INSERT INTO sale_items (id, sale_id, product_id, product_name, product_code, promotion_id, quantity, unit_price, price_type, subtotal) VALUES
('si-test-04', 'sale-test-return-001', 'pr-gel-k-1', 'Gel Kuul Fijación Extra Fuerte 500ml', 'GEL-KUL-FIJ', 'promo_gel_01', 2, 75.00, 'promo', 150.00),
('si-test-05', 'sale-test-return-001', 'pr-gel-k-2', 'Gel Kuul Brillo Extremo 500ml', 'GEL-KUL-BRI', 'promo_gel_01', 2, 75.00, 'promo', 150.00);

-- ITEM 6: NORMAL (Rimel)
INSERT INTO sale_items (id, sale_id, product_id, product_name, product_code, quantity, unit_price, price_type, subtotal, discount_percentage, discount_amount) VALUES
('si-test-06', 'sale-test-return-001', 'p099', 'Pintalabios Mágico Marroquí (Verde a Rosa)', 'PINTA-LAB', 2, 15.00, 'retail', 27.00, 10.00, 3.00);

-- ==================================================================================
-- TEST CASE: WHOLESALE RETURN
-- Sale Date: YESTERDAY
-- Items:
-- 1. Esmaltes Bissú (Wholesale)
-- ==================================================================================

INSERT INTO sales (id, folio, sale_date, subtotal, total, status, payment_method, card_transfer_amount, has_discount, user_id)
SELECT 
  'sale-test-return-002', 
  '00000013', 
  datetime('now', 'localtime', '-1 day'), 
  476.00, -- Subtotal 
  476.00, -- Total
  'completed', 
  'credit', 
  476.00, 
  0, 
  '450e8400-e29b-41d4-a716-446655440001'
;


INSERT INTO sale_items (id, sale_id, product_id, product_name, product_code, quantity, unit_price, price_type, subtotal) VALUES
('si-test-07', 'sale-test-return-002', 'p056', 'Esmalte Bissú Tono 01 Blanco Francés', 'ESM-01', 5, 14.00, 'wholesale', 70.00),
('si-test-08', 'sale-test-return-002', 'p057', 'Esmalte Bissú Tono 05 Negro', 'ESM-05', 7, 14.00, 'wholesale', 98.00),
('si-test-09', 'sale-test-return-002', 'p058', 'Esmalte Bissú Tono 18 Rosa Pastel', 'ESM-18', 10, 14.00, 'wholesale', 140.00),
('si-test-10', 'sale-test-return-002', 'p059', 'Esmalte Bissú Tono 20 Rojo Quemado', 'ESM-20', 12, 14.00, 'wholesale', 168.00);


-- ==================================================================================
-- TEST CASE: RETURN OUTTIME
-- Sale Date: 31 DAYS AGO
-- Discount: 5%
-- Items:
-- 1. Shampoo Sin Sulfatos
-- 2. Acondicionador Sin Sulfatos
-- 3. Termoprotector Capilar
-- 4. Gotas de Seda
-- ==================================================================================

INSERT INTO sales (id, folio, sale_date, subtotal, discount_percentage, discount_amount,total, status, payment_method, cash_amount, has_discount, user_id)
SELECT 
  'sale-test-return-003', 
  '00000014', 
  datetime('now', 'localtime', '-31 day'), 
  510.00, -- Subtotal 
  5.00, -- Discount Percentage
  25.50, -- Discount Amount
  484.50, -- Total
  'completed', 
  'cash', 
  484.50, 
  1, 
  '450e8400-e29b-41d4-a716-446655440001'
;

INSERT INTO sale_items (id, sale_id, product_id, product_name, product_code, quantity, unit_price, price_type, subtotal, discount_percentage, discount_amount) VALUES
('si-test-11', 'sale-test-return-003', 'p091', 'Shampoo Sin Sulfatos Cabello Teñido 1L', 'SHAMP-SUL', 1, 180.00, 'retail', 171.00, 5.00, 9.00),
('si-test-12', 'sale-test-return-003', 'p092', 'Acondicionador Sin Sulfatos Cabello Teñido 1L', 'ACOND-SUL', 1, 180.00, 'retail', 171.00, 5.00, 9.00),
('si-test-13', 'sale-test-return-003', 'p093', 'Termoprotector Capilar Spray 250ml', 'TERM-PROT', 1, 95.00, 'retail', 90.25, 5.00, 4.75),
('si-test-14', 'sale-test-return-003', 'p094', 'Gotas de Seda Bio Elixir 60ml', 'GOTA-SEDA', 1, 55.00, 'retail', 52.25, 5.00, 2.75);

-- ==================================================================================
-- TEST CASE: RETURN Combo complicate pack 3 geles
-- Sale Date: 15 DAYS AGO
-- Items:
-- 1. Gel Kuul Fijación Extra Fuerte 500ml
-- 2. Gel Kuul Brillo Extremo 500ml
-- 3. Gel Kuul Wet Look 500ml
-- ==================================================================================

INSERT INTO sales (id, folio, sale_date, subtotal, total, status, payment_method, cash_amount, has_discount, user_id)
SELECT 
  'sale-test-return-004', 
  '00000015', 
  datetime('now', 'localtime', '-15 day'), 
  590.00, -- Subtotal 
  590.00, -- Total
  'completed', 
  'cash', 
  590.00, 
  0, 
  '450e8400-e29b-41d4-a716-446655440001'
;

INSERT INTO sale_items (id, sale_id, product_id, product_name, product_code, quantity, unit_price, price_type, subtotal, promotion_id) VALUES
('si-test-15', 'sale-test-return-004', 'pr-gel-k-1', 'Gel Kuul Fijación Extra Fuerte 500ml', 'GEL-KUL-FIJ', 4, 36.67, 'promo', 146.68, 'promo_gel_02'),
('si-test-16', 'sale-test-return-004', 'pr-gel-k-2', 'Gel Kuul Brillo Extremo 500ml', 'GEL-KUL-BRI', 6, 36.67, 'promo', 220.02, 'promo_gel_02'),
('si-test-17', 'sale-test-return-004', 'pr-gel-k-3', 'Gel Kuul Wet Look 500ml', 'GEL-KUL-WET', 2, 36.67, 'promo', 73.34, 'promo_gel_02'),
('si-test-18', 'sale-test-return-004', 'pr-gel-k-1', 'Gel Kuul Fijación Extra Fuerte 500ml', 'GEL-KUL-FIJ', 2, 75.00, 'retail', 150.00, null);

-- ==================================================================================
-- TEST CASE: COMPLEX RETURN (KIT + COMBO + GLOBAL DISCOUNT)
-- Sale Date: Today
-- Global Discount: 10%
-- Items:
-- 1. Kit: Tinte Anven + 2 Peróxidos (Gift)
-- 2. Promo: geles gift 
-- 3. Normal: Rimel
-- ==================================================================================

INSERT INTO sales (id, folio, sale_date, subtotal, discount_percentage, discount_amount, total, status, payment_method, cash_amount, has_discount, user_id)
SELECT 
  'sale-test-return-005', 
  '00000016', 
  datetime('now', 'localtime'), 
  440.00, -- Subtotal 
  10.00,  -- 10% Discount
  14.00,  -- Discount Amount
  426.00, -- Total
  'completed', 
  'cash', 
  426.00, 
  1, 
  '450e8400-e29b-41d4-a716-446655440001'
;


-- ITEM 1: KIT MAIN (Tinte Anven)
INSERT INTO sale_items (id, sale_id, product_id, product_name, product_code, quantity, unit_price, price_type, subtotal, discount_percentage, discount_amount, kit_option_id) VALUES
('si-test-19', 'sale-test-return-005', 'pr-kit-a-t1', 'Tinte Anven Castaño Claro Caoba', 'KIT-ANV-55', 2, 55.00, 'retail', 99.00, 10.00, 11.00, 'kit-anven');


-- ITEM 2 & 3: KIT ITEMS (Peróxidos) - Linked to Main
INSERT INTO sale_items (id, sale_id, product_id, product_name, product_code, quantity, unit_price, price_type, subtotal, kit_option_id) VALUES
('si-test-20', 'sale-test-return-005', 'pr-kit-a-p1', 'Peróxido Anven 10 Vol 90ml', 'KIT-ANV-P10', 1, 0.00, 'kit_item', 0.00, 'kit-anven'),
('si-test-21', 'sale-test-return-005', 'pr-kit-a-p2', 'Peróxido Anven 20 Vol 90ml', 'KIT-ANV-P20', 1, 0.00, 'kit_item', 0.00, 'kit-anven');

-- ITEM 4 & 5: Promo geles gift
INSERT INTO sale_items (id, sale_id, product_id, product_name, product_code, promotion_id, quantity, unit_price, price_type, subtotal) VALUES
('si-test-22', 'sale-test-return-005', 'pr-gel-k-1', 'Gel Kuul Fijación Extra Fuerte 500ml', 'GEL-KUL-FIJ', 'promo_gel_01', 2, 75.00, 'promo', 150.00),
('si-test-23', 'sale-test-return-005', 'pr-gel-k-2', 'Gel Kuul Brillo Extremo 500ml', 'GEL-KUL-BRI', 'promo_gel_01', 2, 75.00, 'promo', 150.00);

-- ITEM 6: NORMAL (Rimel)
INSERT INTO sale_items (id, sale_id, product_id, product_name, product_code, quantity, unit_price, price_type, subtotal, discount_percentage, discount_amount) VALUES
('si-test-24', 'sale-test-return-005', 'p099', 'Pintalabios Mágico Marroquí (Verde a Rosa)', 'PINTA-LAB', 2, 15.00, 'retail', 27.00, 10.00, 3.00);

-- ==================================================================================
-- TEST CASE: WHOLESALE RETURN
-- Sale Date: YESTERDAY
-- Items:
-- 1. Esmaltes Bissú (Wholesale)
-- ==================================================================================

INSERT INTO sales (id, folio, sale_date, subtotal, total, status, payment_method, card_transfer_amount, has_discount, user_id)
SELECT 
  'sale-test-return-006', 
  '00000017', 
  datetime('now', 'localtime', '-1 day'), 
  476.00, -- Subtotal 
  476.00, -- Total
  'completed', 
  'credit', 
  476.00, 
  0, 
  '450e8400-e29b-41d4-a716-446655440001'
;


INSERT INTO sale_items (id, sale_id, product_id, product_name, product_code, quantity, unit_price, price_type, subtotal) VALUES
('si-test-25', 'sale-test-return-006', 'p056', 'Esmalte Bissú Tono 01 Blanco Francés', 'ESM-01', 5, 14.00, 'wholesale', 70.00),
('si-test-26', 'sale-test-return-006', 'p057', 'Esmalte Bissú Tono 05 Negro', 'ESM-05', 7, 14.00, 'wholesale', 98.00),
('si-test-27', 'sale-test-return-006', 'p058', 'Esmalte Bissú Tono 18 Rosa Pastel', 'ESM-18', 10, 14.00, 'wholesale', 140.00),
('si-test-28', 'sale-test-return-006', 'p059', 'Esmalte Bissú Tono 20 Rojo Quemado', 'ESM-20', 12, 14.00, 'wholesale', 168.00);


-- ==================================================================================
-- TEST CASE: RETURN OUTTIME
-- Sale Date: 2 DAYS AGO
-- Discount: 5%
-- Items:
-- 1. Shampoo Sin Sulfatos
-- 2. Acondicionador Sin Sulfatos
-- 3. Termoprotector Capilar
-- 4. Gotas de Seda
-- ==================================================================================

INSERT INTO sales (id, folio, sale_date, subtotal, discount_percentage, discount_amount,total, status, payment_method, cash_amount, has_discount, user_id)
SELECT 
  'sale-test-return-007', 
  '00000018', 
  datetime('now', 'localtime', '-2 day'), 
  510.00, -- Subtotal 
  5.00, -- Discount Percentage
  25.50, -- Discount Amount
  484.50, -- Total
  'completed', 
  'cash', 
  484.50, 
  1, 
  '450e8400-e29b-41d4-a716-446655440001'
;

INSERT INTO sale_items (id, sale_id, product_id, product_name, product_code, quantity, unit_price, price_type, subtotal, discount_percentage, discount_amount) VALUES
('si-test-29', 'sale-test-return-007', 'p091', 'Shampoo Sin Sulfatos Cabello Teñido 1L', 'SHAMP-SUL', 1, 180.00, 'retail', 171.00, 5.00, 9.00),
('si-test-30', 'sale-test-return-007', 'p092', 'Acondicionador Sin Sulfatos Cabello Teñido 1L', 'ACOND-SUL', 1, 180.00, 'retail', 171.00, 5.00, 9.00),
('si-test-31', 'sale-test-return-007', 'p093', 'Termoprotector Capilar Spray 250ml', 'TERM-PROT', 1, 95.00, 'retail', 90.25, 5.00, 4.75),
('si-test-32', 'sale-test-return-007', 'p094', 'Gotas de Seda Bio Elixir 60ml', 'GOTA-SEDA', 1, 55.00, 'retail', 52.25, 5.00, 2.75);

-- ==================================================================================
-- TEST CASE: RETURN Combo complicate pack 3 geles
-- Sale Date: 15 DAYS AGO
-- Items:
-- 1. Gel Kuul Fijación Extra Fuerte 500ml
-- 2. Gel Kuul Brillo Extremo 500ml
-- 3. Gel Kuul Wet Look 500ml
-- ==================================================================================

INSERT INTO sales (id, folio, sale_date, subtotal, total, status, payment_method, cash_amount, has_discount, user_id)
SELECT 
  'sale-test-return-008', 
  '00000019', 
  datetime('now', 'localtime', '-15 day'), 
  590.00, -- Subtotal 
  590.00, -- Total
  'completed', 
  'cash', 
  590.00, 
  0, 
  '450e8400-e29b-41d4-a716-446655440001'
;

INSERT INTO sale_items (id, sale_id, product_id, product_name, product_code, quantity, unit_price, price_type, subtotal, promotion_id) VALUES
('si-test-33', 'sale-test-return-008', 'pr-gel-k-1', 'Gel Kuul Fijación Extra Fuerte 500ml', 'GEL-KUL-FIJ', 4, 36.67, 'promo', 146.68, 'promo_gel_02'),
('si-test-34', 'sale-test-return-008', 'pr-gel-k-2', 'Gel Kuul Brillo Extremo 500ml', 'GEL-KUL-BRI', 6, 36.67, 'promo', 220.02, 'promo_gel_02'),
('si-test-35', 'sale-test-return-008', 'pr-gel-k-3', 'Gel Kuul Wet Look 500ml', 'GEL-KUL-WET', 2, 36.67, 'promo', 73.34, 'promo_gel_02'),
('si-test-36', 'sale-test-return-008', 'pr-gel-k-1', 'Gel Kuul Fijación Extra Fuerte 500ml', 'GEL-KUL-FIJ', 2, 75.00, 'retail', 150.00, null);