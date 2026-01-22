-- =================================================
-- MIGRATION 028: SEED SALES AND PAYMENTS HISTORY 
-- =================================================

-- 1. CASE: Luis Miguel (c_red_03) - Critical Debt
-- Target: Final Balance $4,900.00
-- Operation: Purchase $5,200 (Credit) - Payment $300 = Debt $4,900

-- Sale 1 (Debt Origin - High-End Equipment)
INSERT OR IGNORE INTO sales (id, folio, subtotal, total, status, customer_id, user_id, payment_method, notes, created_at)
VALUES (
  'sale_lm_01', 
  'XAL1-0001', 
  5200.00, 
  5200.00, 
  'completed', 
  'c_red_03', 
  (SELECT id FROM users LIMIT 1), 
  'credit', 
  'Purchase of professional Babyliss equipment on credit', 
  datetime('now', '-30 days')
);

-- Sale 1 Items 
INSERT OR IGNORE INTO sale_items (id, sale_id, product_id, product_name, product_code, quantity, unit_price, price_type, subtotal)
VALUES 
-- Babyliss Optima 3000 Flat Iron (p042) - $2,800
(
  'item_lm_01_a', 'sale_lm_01', 'p042', 
  'Plancha Alaciadora Babyliss Optima 3000 Acero Inoxidable Doble Función', 
  'PLA-BAB', 1, 2800.00, 'retail', 2800.00
),
-- Babyliss Portofino Dryer (p041) - $2,400
(
  'item_lm_01_b', 'sale_lm_01', 'p041', 
  'Secadora Babyliss Pro Portofino 6600 Nano Titanium 2000 Watts Azul', 
  'SEC-BAB', 1, 2400.00, 'retail', 2400.00
);

-- Payment 1 (Insufficient partial payment)
INSERT OR IGNORE INTO debt_payments (id, folio, customer_id, sale_id, amount, payment_date, payment_method, user_id, notes)
VALUES (
  'pay_lm_01',
  1001,
  'c_red_03',
  'sale_lm_01', -- Linked to previous sale
  300.00,       -- Payment of $300 to leave debt at exactly $4,900
  datetime('now', '-15 days'),
  'cash',
  (SELECT id FROM users LIMIT 1),
  'Partial payment on account for Babyliss equipment'
);

-- Sale 2 (Cash Purchase - Fast Consumables)
-- Does not affect debt, but populates history
INSERT OR IGNORE INTO sales (id, folio, subtotal, total, status, customer_id, user_id, payment_method, cash_amount, created_at)
VALUES (
  'sale_lm_02', 
  'XAL1-0002', 
  130.00, 
  130.00, 
  'completed', 
  'c_red_03', 
  (SELECT id FROM users LIMIT 1),
  'cash',
  130.00,
  datetime('now', '-5 days')
);

INSERT OR IGNORE INTO sale_items (id, sale_id, product_id, product_name, product_code, quantity, unit_price, price_type, subtotal)
VALUES 
-- 2x Gel Elegance (p035) at $65 each
(
  'item_lm_02_a', 'sale_lm_02', 'p035', 
  'Gel Elegance Extra Fuerte Transparente 500ml', 
  'GEL-ELEG', 2, 65.00, 'retail', 130.00
);

-- =================================================================================

-- 2. CASE: Alejandro Magno (c_green_01) - Compliant Customer
-- Target: Final Balance $0.00
-- Operation: Purchase $1,200 (Credit) - Payment $1,200 = Debt $0

-- Credit Sale (Wahl Clipper)
INSERT OR IGNORE INTO sales (id, folio, subtotal, total, status, customer_id, user_id, payment_method, notes, created_at)
VALUES (
  'sale_am_01', 
  'XAL1-0003', 
  1200.00, 
  1200.00, 
  'completed', 
  'c_green_01', 
  (SELECT id FROM users LIMIT 1), 
  'credit', 
  'Purchase of Wahl Clipper', 
  datetime('now', '-10 days')
);

INSERT OR IGNORE INTO sale_items (id, sale_id, product_id, product_name, product_code, quantity, unit_price, price_type, subtotal)
VALUES (
  'item_am_01', 'sale_am_01', 'p031', 
  'Máquina Wahl Super Taper Clásica (Alámbrica)', 
  'WAHL-SUP', 1, 1200.00, 'retail', 1200.00
);

-- Total Payment (Settlement)
INSERT OR IGNORE INTO debt_payments (id, folio, customer_id, sale_id, amount, payment_date, user_id, notes)
VALUES (
  'pay_am_01', 
  1002, 
  'c_green_01', 
  'sale_am_01', 
  1200.00, 
  datetime('now', '-2 days'), 
  (SELECT id FROM users LIMIT 1), 
  'Total settlement Wahl'
);
