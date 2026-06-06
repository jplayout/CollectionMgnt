export class MediaRepository {

    constructor(db) {
        this.db = db;
    }

    findItemWithPlugin(itemId) {

        return this.db
            .prepare(`
                SELECT
                    items.id,
                    items.plugin_id,
                    plugins.supports_images
                FROM items
                JOIN plugins
                    ON plugins.id = items.plugin_id
                WHERE items.id = ?
            `)
            .get(itemId);

    }

    createPending(media) {

        const result =
            this.db
                .prepare(`
                    INSERT INTO media (
                        item_id,
                        filename,
                        mime_type,
                        size,
                        is_primary
                    )
                    VALUES (?, ?, ?, ?, 0)
                `)
                .run(
                    media.item_id,
                    '',
                    media.mime_type,
                    media.size
                );

        return result.lastInsertRowid;

    }

    finalize(media) {

        const finalize =
            this.db.transaction(
                data => {

                    if (
                        data.is_primary
                    ) {

                        this.clearPrimary(
                            data.item_id
                        );

                    }

                    this.db
                        .prepare(`
                            UPDATE media
                            SET
                                filename = ?,
                                is_primary = ?
                            WHERE id = ?
                        `)
                        .run(
                            data.filename,
                            data.is_primary ? 1 : 0,
                            data.id
                        );

                }
            );

        finalize(media);

    }

    findById(id) {

        return this.db
            .prepare(`
                SELECT *
                FROM media
                WHERE id = ?
            `)
            .get(id);

    }

    findByItemId(itemId) {

        return this.db
            .prepare(`
                SELECT *
                FROM media
                WHERE item_id = ?
                ORDER BY is_primary DESC, created_at ASC, id ASC
            `)
            .all(itemId);

    }

    delete(id) {

        return this.db
            .prepare(`
                DELETE
                FROM media
                WHERE id = ?
            `)
            .run(id);

    }

    clearPrimary(itemId) {

        return this.db
            .prepare(`
                UPDATE media
                SET is_primary = 0
                WHERE item_id = ?
            `)
            .run(itemId);

    }

}
