-- ============================================
-- MIGRATION 032: REFACTOR SALES KITS STRUCTURE
-- ============================================

-- SQLite does not support multiple DROP COLUMN in one statement nor changing constraints easily without recreating the table.
-- However, since SQLite 3.35+ supports DROP COLUMN, we can try that if the version allows, but safer is typical alter table or recreate.
-- Given Rust `rusqlite` usually bundles recent SQLite, we might assume `ALTER TABLE DROP COLUMN` works.
-- If not, we would need the full recreate dance, but let's try the direct ALTERs for simplicity if supported, or just ADD/DROP.

-- NOTE: To be safe and compliant with standard SQLite migration practices (and since we can't easily ensure 3.35+ or if constraints break):
-- The `sale_items` table has Foreign Keys. Dropping `parent_sale_item_id` is tricky if it is part of an FK.
-- Actually, `parent_sale_item_id` IS a foreign key. SQLite doesn't let you DROP a column that is part of a Foreign Key or Index without recreating the table usually, unless constraints are disabled.

-- Let's do the standard Recreate Table approach for safety and data integrity.

PRAGMA foreign_keys = OFF;

CREATE TABLE sale_items_new (
    id TEXT PRIMARY KEY NOT NULL,
    sale_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    product_code TEXT NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    price_type TEXT NOT NULL, -- 'retail', 'wholesale', 'kit_item'
    promotion_id TEXT,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    subtotal DECIMAL(10,2) NOT NULL,
    
    -- REMOVED: is_kit_item
    -- REMOVED: parent_sale_item_id
    
    -- NEW:
    kit_option_id TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE SET NULL,
    FOREIGN KEY (kit_option_id) REFERENCES product_kit_options(id) -- Validates it is a valid kit option
);

-- Copy data
-- We need to map old data if we want to keep history working perfectly.
-- Old `is_kit_item` -> if 1, it was a kit item.
-- Old `parent_sale_item_id` -> we are deleting this info. 
-- NEW `kit_option_id`: We don't have this data for historical items easily unless we infer it or leave it null.
-- If we leave it NULL, old history items won't look grouped, but that might be acceptable for "Refactoring".
-- OR we can try to leave it NULL for old items.
INSERT INTO sale_items_new (
    id, sale_id, product_id, product_name, product_code, quantity, 
    unit_price, price_type, promotion_id, discount_percentage, 
    discount_amount, subtotal, created_at, kit_option_id
)
SELECT 
    id, sale_id, product_id, product_name, product_code, quantity, 
    unit_price, price_type, promotion_id, discount_percentage, 
    discount_amount, subtotal, created_at, NULL
FROM sale_items;

DROP TABLE sale_items;

ALTER TABLE sale_items_new RENAME TO sale_items;

CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);

PRAGMA foreign_keys = ON;
