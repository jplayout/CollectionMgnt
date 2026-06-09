export class ExportRepository {

    constructor(db) {
        this.db = db;
    }

    findPlugins() {

        return this.db
            .prepare(`
                SELECT
                    id,
                    code,
                    display_name,
                    version,
                    enabled,
                    supports_images,
                    supports_loans,
                    installed_at
                FROM plugins
                ORDER BY display_name, code
            `)
            .all();

    }

    findPluginByCode(code) {

        return this.db
            .prepare(`
                SELECT
                    id,
                    code,
                    display_name,
                    version,
                    enabled,
                    supports_images,
                    supports_loans,
                    installed_at
                FROM plugins
                WHERE code = ?
            `)
            .get(code);

    }

    findItemsByPluginId(pluginId) {

        return this.db
            .prepare(`
                SELECT
                    id,
                    title,
                    description,
                    metadata,
                    created_at,
                    updated_at
                FROM items
                WHERE plugin_id = ?
                ORDER BY LOWER(title) ASC, id ASC
            `)
            .all(pluginId)
            .map(parseItem);

    }

    findMediaByPluginId(pluginId) {

        return this.db
            .prepare(`
                SELECT
                    media.id,
                    media.item_id,
                    media.filename,
                    media.mime_type,
                    media.size,
                    media.is_primary,
                    media.created_at
                FROM media
                JOIN items
                    ON items.id = media.item_id
                WHERE items.plugin_id = ?
                ORDER BY media.item_id ASC, media.is_primary DESC, media.created_at ASC, media.id ASC
            `)
            .all(pluginId);

    }

    findSettings() {

        return this.db
            .prepare(`
                SELECT
                    key,
                    value,
                    updated_at
                FROM settings
                ORDER BY key
            `)
            .all();

    }

}

function parseItem(row) {

    return {
        ...row,
        metadata:
            JSON.parse(
                row.metadata
            )
    };

}
