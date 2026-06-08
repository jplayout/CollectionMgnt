export class SettingsRepository {

    constructor(db) {
        this.db = db;
    }

    get(key) {

        const row =
            this.db
                .prepare(`
                    SELECT value
                    FROM settings
                    WHERE key = ?
                `)
                .get(key);

        return row?.value ?? null;

    }

    set(key, value) {

        this.db
            .prepare(`
                INSERT INTO settings (
                    key,
                    value,
                    updated_at
                )
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(key) DO UPDATE SET
                    value = excluded.value,
                    updated_at = CURRENT_TIMESTAMP
            `)
            .run(
                key,
                value
            );

    }

    delete(key) {

        this.db
            .prepare(`
                DELETE FROM settings
                WHERE key = ?
            `)
            .run(key);

    }

    getJson(key) {

        const value =
            this.get(key);

        if (value === null) {
            return null;
        }

        return JSON.parse(value);

    }

    setJson(key, value) {

        this.set(
            key,
            JSON.stringify(value)
        );

    }

}
