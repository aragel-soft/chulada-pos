-- ============================================
-- MIGRATION 012: ADD SEQUENCE TO PERMISSIONS
-- ============================================

ALTER TABLE permissions ADD COLUMN sequence INTEGER DEFAULT 0;

UPDATE permissions SET sequence = 1 WHERE name LIKE 'view_%';
UPDATE permissions SET sequence = 2 WHERE name LIKE 'create_%';
UPDATE permissions SET sequence = 3 WHERE name LIKE 'edit_%';
UPDATE permissions SET sequence = 4 WHERE name LIKE 'delete_%' OR name LIKE 'cancel_%';

-- Set default sequence for others (e.g. actions like open_cash_register) to 5
UPDATE permissions SET sequence = 5 WHERE sequence = 0;
