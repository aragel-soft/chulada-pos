-- ============================================
-- MIGRATION 018: CASH REGISTER SHIFTS 
-- ============================================

DROP TABLE IF EXISTS cash_register_shifts;

CREATE TABLE IF NOT EXISTS cash_register_shifts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  initial_cash REAL NOT NULL DEFAULT 0,
  final_cash REAL,
  opening_date TEXT NOT NULL,
  closing_date TEXT,
  opening_user_id TEXT NOT NULL,
  closing_user_id TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  notes TEXT,
  code TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (opening_user_id) REFERENCES users(id),
  FOREIGN KEY (closing_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_shifts_status ON cash_register_shifts(status);
CREATE INDEX IF NOT EXISTS idx_shifts_opening_user ON cash_register_shifts(opening_user_id);
CREATE INDEX IF NOT EXISTS idx_shifts_code ON cash_register_shifts(code);

