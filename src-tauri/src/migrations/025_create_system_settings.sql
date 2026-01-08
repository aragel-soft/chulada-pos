CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now')) NOT NULL
);

-- Seed Data (Defaults)
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('store_name', 'Mi Tienda');
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('store_address', '');
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('ticket_header', '');
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('ticket_footer', 'Gracias por su compra');
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('ticket_footer_lines', '0');
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('default_cash_fund', '500');
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('max_cash_limit', '2000');
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('tax_rate', '0');
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('apply_tax', 'false');
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('logo_path', '');
