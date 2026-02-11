-- Migration 043: Add total column to sale_items and refactor meaning of subtotal
-- Goal: 
--  subtotal = quantity * unit_price (GROSS)
--  total = subtotal - discount_amount (NET)

-- 1. Add total column
ALTER TABLE sale_items ADD COLUMN total DECIMAL(10,2);

-- 2. Populate total with current subtotal (which currently holds NET amount)
UPDATE sale_items SET total = subtotal;

-- 3. Recalculate subtotal to be GROSS amount (quantity * unit_price)
UPDATE sale_items 
SET subtotal = quantity * unit_price;

-- 4. Ensure total is not null (defaults to subtotal if something went wrong, though step 2 should cover it)
UPDATE sale_items SET total = subtotal WHERE total IS NULL;
