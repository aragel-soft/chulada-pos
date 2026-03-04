-- ============================================
-- MIGRATION 001: SCHEMA INICIAL + AUTH
-- ============================================

-- Tabla de roles
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  is_active INTEGER DEFAULT 1 NOT NULL CHECK (is_active IN (0, 1)),
  created_at TEXT DEFAULT (datetime('now')) NOT NULL
);

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role_id TEXT NOT NULL,
  is_active INTEGER DEFAULT 1 NOT NULL CHECK (is_active IN (0, 1)),
  created_at TEXT DEFAULT (datetime('now')) NOT NULL,
  updated_at TEXT DEFAULT (datetime('now')) NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
);

-- Tabla de permisos
CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  module TEXT NOT NULL,
  is_active INTEGER DEFAULT 1 NOT NULL CHECK (is_active IN (0, 1)),
  created_at TEXT DEFAULT (datetime('now')) NOT NULL
);

-- Tabla pivote: permisos por rol
CREATE TABLE IF NOT EXISTS role_permissions (
  id TEXT PRIMARY KEY NOT NULL,
  role_id TEXT NOT NULL,
  permission_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')) NOT NULL,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE(role_id, permission_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);
