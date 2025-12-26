-- ============================================
-- MIGRATION 023: CASH MOVEMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS cash_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cash_register_shift_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  amount REAL NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (cash_register_shift_id) REFERENCES cash_register_shifts(id)
);

CREATE INDEX IF NOT EXISTS idx_movements_shift ON cash_movements(cash_register_shift_id);
