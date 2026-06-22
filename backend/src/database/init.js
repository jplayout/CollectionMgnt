import fs from 'fs';
import path from 'path';
import {
    fileURLToPath
} from 'url';

import {
    DATA_DIR,
    DATABASE_PATH
} from '../config/paths.js';

import { getDatabase } from './database.js';

const CURRENT_DIR =
    path.dirname(
        fileURLToPath(
            import.meta.url
        )
    );

const SCHEMA_VERSION =
    2;

export async function initializeDatabase() {

    const databaseExists =
        fs.existsSync(
            DATABASE_PATH
        );

    fs.mkdirSync(
        DATA_DIR,
        {
            recursive: true
        }
    );

    const db = getDatabase();

    if (databaseExists) {
        console.log(
            'Database already exists'
        );

        migrateDatabase(
            db
        );

        return db;
    }

    console.log(
        'Creating database...'
    );

    const schemaPath = path.join(
        CURRENT_DIR,
        'schema.sql'
    );

    const schema =
        fs.readFileSync(
            schemaPath,
            'utf8'
        );

    db.exec(schema);

    console.log(
        'Database initialized'
    );

    return db;
}

function migrateDatabase(
    db
) {

    const userColumns =
        db
            .prepare(`
                PRAGMA table_info(users)
            `)
            .all();

    if (
        !userColumns.some(
            column => column.name === 'role'
        )
    ) {

        db.exec(`
            ALTER TABLE users
            ADD COLUMN role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'user'));
        `);

        preserveExistingAdminAccess(
            db
        );

    }

    const schemaInfoExists =
        db
            .prepare(`
                SELECT name
                FROM sqlite_master
                WHERE type = 'table'
                    AND name = 'schema_info'
            `)
            .get();

    if (
        schemaInfoExists
    ) {

        const row =
            db
                .prepare(`
                    SELECT version
                    FROM schema_info
                    LIMIT 1
                `)
                .get();

        if (
            row?.version < SCHEMA_VERSION
        ) {

            db
                .prepare(`
                    UPDATE schema_info
                    SET version = ?
                `)
                .run(
                    SCHEMA_VERSION
                );

        } else if (
            !row
        ) {

            db
                .prepare(`
                    INSERT INTO schema_info(version)
                    VALUES (?)
                `)
                .run(
                    SCHEMA_VERSION
                );

        }

    }

}

function preserveExistingAdminAccess(
    db
) {

    const adminUsername =
        process.env.ADMIN_USERNAME || 'admin';

    const updated =
        db
            .prepare(`
                UPDATE users
                SET role = 'admin'
                WHERE username = ?
            `)
            .run(
                adminUsername
            );

    if (
        updated.changes > 0
    ) {

        return;

    }

    db
        .prepare(`
            UPDATE users
            SET role = 'admin'
            WHERE id = (
                SELECT id
                FROM users
                ORDER BY id ASC
                LIMIT 1
            )
        `)
        .run();

}
