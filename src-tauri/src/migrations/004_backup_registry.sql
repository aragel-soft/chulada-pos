CREATE TABLE IF NOT EXISTS backup_registry (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    filename    TEXT NOT NULL UNIQUE,
    filepath    TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    synced_at   TEXT,
    status      TEXT NOT NULL DEFAULT 'pending'
    -- status: 'pending' | 'synced' | 'failed'
);
