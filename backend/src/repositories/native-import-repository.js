export class NativeImportRepository {

    constructor(db) {
        this.db = db;
    }

    findPluginByCode(code) {

        return this.db
            .prepare(`
                SELECT
                    id,
                    code,
                    display_name,
                    version,
                    enabled
                FROM plugins
                WHERE code = ?
            `)
            .get(code);

    }

    createItem(item) {

        const result =
            this.db
                .prepare(`
                    INSERT INTO items (
                        plugin_id,
                        title,
                        description,
                        metadata,
                        created_at,
                        updated_at
                    )
                    VALUES (
                        ?,
                        ?,
                        ?,
                        ?,
                        COALESCE(?, CURRENT_TIMESTAMP),
                        COALESCE(?, CURRENT_TIMESTAMP)
                    )
                `)
                .run(
                    item.plugin_id,
                    item.title,
                    item.description ?? null,
                    JSON.stringify(
                        item.metadata ?? {}
                    ),
                    getOptionalDate(
                        item.created_at
                    ),
                    getOptionalDate(
                        item.updated_at
                    )
                );

        return result.lastInsertRowid;

    }

    transaction(callback) {

        return this.db
            .transaction(callback)();

    }

}

function getOptionalDate(value) {

    return typeof value === 'string' &&
        value.trim() !== ''
        ? value
        : null;

}
