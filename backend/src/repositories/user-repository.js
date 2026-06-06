export class UserRepository {

    constructor(db) {
        this.db = db;
    }

    count() {

        const row =
            this.db
                .prepare(`
                    SELECT COUNT(*) AS count
                    FROM users
                `)
                .get();

        return row.count;

    }

    create(user) {

        const result =
            this.db
                .prepare(`
                    INSERT INTO users (
                        username,
                        password_hash,
                        preferred_language
                    )
                    VALUES (?, ?, ?)
                `)
                .run(
                    user.username,
                    user.password_hash,
                    user.preferred_language ?? 'fr'
                );

        return result.lastInsertRowid;

    }

    findById(id) {

        return this.db
            .prepare(`
                SELECT
                    id,
                    username,
                    preferred_language,
                    created_at,
                    updated_at
                FROM users
                WHERE id = ?
            `)
            .get(id);

    }

    findByUsername(username) {

        return this.db
            .prepare(`
                SELECT *
                FROM users
                WHERE username = ?
            `)
            .get(username);

    }

}
