-- ============================================
-- MIGRATION 005: AÑADIR AVATAR A USUARIOS
-- ============================================
-- Se añade la columna avatar_url a la tabla users
-- y se establece un avatar por defecto para los usuarios existentes

ALTER TABLE users
ADD COLUMN avatar_url TEXT;

UPDATE users 
SET avatar_url = 'https://avatars.githubusercontent.com/u/95703694?v=4' 
WHERE avatar_url IS NULL;

-- Tabla para llevar el control de las migraciones aplicadas
CREATE TABLE IF NOT EXISTS __migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  applied_at TEXT DEFAULT (datetime('now')) NOT NULL
);