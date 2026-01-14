-- ==================================================
-- MIGRATION 025: CREAR TABLAS DE CLIENTES Y ABONOS
-- ==================================================

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY, 
  code TEXT UNIQUE,    
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  credit_limit DECIMAL(10,2) DEFAULT 500.00,
  current_balance DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP 
);

CREATE TABLE IF NOT EXISTS debt_payments (
  id TEXT PRIMARY KEY,
  folio INTEGER NOT NULL UNIQUE, -- Folio interno consecutivo
  customer_id TEXT NOT NULL,
  sale_id TEXT, -- NULL si es un abono general, ID si es pago de una venta específica
  amount DECIMAL(10,2) NOT NULL,
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  payment_method TEXT DEFAULT 'cash', -- 'cash', 'card', 'transfer'
  user_id TEXT NOT NULL, -- Quién recibió el pago
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_synced BOOLEAN DEFAULT 0,
  synced_at TIMESTAMP,
  FOREIGN KEY(customer_id) REFERENCES customers(id),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

-- Índices para optimizar búsqueda y ordenamiento
CREATE INDEX IF NOT EXISTS idx_customers_search ON customers(name, phone, code);
CREATE INDEX IF NOT EXISTS idx_customers_balance ON customers(current_balance);
CREATE INDEX IF NOT EXISTS idx_customers_deleted ON customers(deleted_at);