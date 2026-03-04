-- ==========================================================================
-- MIGRATION 016: CREAR ESQUEMA DE ETIQUETAS (TAGS) Y RELACIÓN CON PRODUCTOS
-- ==========================================================================

-- Tabla de Etiquetas (Tags)
CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#64748b', 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Relación (Product <-> Tags)
CREATE TABLE IF NOT EXISTS product_tags (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Índice único para evitar duplicados (un producto no puede tener la misma etiqueta más de una vez)
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_tags_unique ON product_tags(product_id, tag_id);

-- Índices individuales para búsquedas rápidas (ej. "todos los productos con la etiqueta X")
CREATE INDEX IF NOT EXISTS idx_product_tags_tag_id ON product_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_product_tags_product_id ON product_tags(product_id);
