export class MediaAuditRepository {

    constructor(db) {
        this.db = db;
    }

    findItemIds() {

        return this.db
            .prepare(`
                SELECT id
                FROM items
                ORDER BY id
            `)
            .all()
            .map(
                row => row.id
            );

    }

    findMediaRows() {

        return this.db
            .prepare(`
                SELECT
                    media.id,
                    media.item_id,
                    media.filename,
                    media.mime_type,
                    media.size,
                    media.is_primary,
                    media.created_at,
                    items.id AS existing_item_id
                FROM media
                LEFT JOIN items
                    ON items.id = media.item_id
                ORDER BY media.item_id ASC, media.id ASC
            `)
            .all();

    }

}
