export class PluginRepository {

    constructor(db) {
        this.db = db;
    }

    findAll() {

        return this.db
            .prepare(`
                SELECT *
                FROM plugins
                ORDER BY display_name
            `)
            .all();

    }

    findByCode(code) {

        return this.db
            .prepare(`
                SELECT *
                FROM plugins
                WHERE code = ?
            `)
            .get(code);

    }

    update(code, data) {

        return this.db
            .prepare(`
                UPDATE plugins
                SET
                    display_name = ?,
                    enabled = ?
                WHERE code = ?
            `)
            .run(
                data.display_name,
                data.enabled,
                code
            );

    }

}