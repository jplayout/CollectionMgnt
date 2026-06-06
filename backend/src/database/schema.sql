PRAGMA foreign_keys = ON;

CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    preferred_language TEXT DEFAULT 'fr',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE plugins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    version TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    supports_images INTEGER NOT NULL DEFAULT 1,
    supports_loans INTEGER NOT NULL DEFAULT 0,
    installed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plugin_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    metadata TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(metadata)),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(plugin_id) REFERENCES plugins(id)
);

CREATE TABLE media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    is_primary INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE
);

CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE item_tags (
    item_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY(item_id, tag_id),
    FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE,
    FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    borrower TEXT NOT NULL,
    loan_date DATETIME NOT NULL,
    return_date DATETIME,
    FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE
);

CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER,
    payload TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE schema_info (
    version INTEGER NOT NULL
);

INSERT INTO schema_info(version)
VALUES (1);

CREATE INDEX idx_items_plugin_id ON items(plugin_id);
CREATE INDEX idx_item_tags_tag_id ON item_tags(tag_id);
CREATE INDEX idx_media_item_id ON media(item_id);
CREATE INDEX idx_loans_item_id ON loans(item_id);
CREATE INDEX idx_tags_name ON tags(name);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_items_title ON items(title);