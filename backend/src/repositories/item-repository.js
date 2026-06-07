export class ItemRepository {

    constructor(db) {
        this.db = db;
    }

    create(item) {

        const result = this.db
            .prepare(`
                INSERT INTO items (
                    plugin_id,
                    title,
                    description,
                    metadata
                )
                VALUES (?, ?, ?, ?)
            `)
            .run(
                item.plugin_id,
                item.title,
                item.description ?? null,
                JSON.stringify(
                    item.metadata ?? {}
                )
            );

        return result.lastInsertRowid;
    }

    findById(id) {

        const item =
            this.db
                .prepare(`
                    SELECT
                        items.*,
                        plugins.code AS plugin,
                        plugins.display_name AS plugin_display_name
                    FROM items
                    JOIN plugins
                        ON plugins.id = items.plugin_id
                    WHERE items.id = ?
                `)
                .get(id);

        if (!item) {
            return null;
        }

        item.metadata =
            JSON.parse(
                item.metadata
            );

        return item;
    }

    update(id, data) {

        return this.db
            .prepare(`
                UPDATE items
                SET
                    title = ?,
                    description = ?,
                    metadata = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `)
            .run(
                data.title,
                data.description ?? null,
                JSON.stringify(
                    data.metadata ?? {}
                ),
                id
            );

    }

    findAll(filters = {}) {

        let sql = `
            SELECT *
            FROM items
            WHERE 1 = 1
        `;

        const params = [];

        if (filters.pluginId) {

            sql += `
                AND plugin_id = ?
            `;

            params.push(
                filters.pluginId
            );

        }

        if (filters.title) {

            sql += `
                AND title LIKE ?
            `;

            params.push(
                `%${filters.title}%`
            );

        }

        if (
            filters.metadataFilters
        ) {

            for (
                const [key, value]
                of Object.entries(
                    filters.metadataFilters
                )
            ) {

                sql += `
                    AND json_extract(
                        metadata,
                        '$.${key}'
                    ) = ?
                `;

                params.push(
                    value
                );

            }

        }

        sql += `
            ORDER BY created_at DESC
        `;

        const rows =
            this.db
                .prepare(sql)
                .all(...params);

        return rows.map(
            row => ({
                ...row,
                metadata: JSON.parse(
                    row.metadata
                )
            })
        );

    }

    delete(id) {

        return this.db
            .prepare(`
                DELETE
                FROM items
                WHERE id = ?
            `)
            .run(id);

    }

}
