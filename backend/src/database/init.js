import fs from 'fs';
import path from 'path';

import { getDatabase } from './database.js';

export async function initializeDatabase() {

    const databasePath = path.join(
        process.cwd(),
        'data',
        'collection-manager.db'
    );

    const databaseExists =
        fs.existsSync(databasePath);

    const db = getDatabase();

    if (databaseExists) {
        console.log(
            'Database already exists'
        );

        return db;
    }

    console.log(
        'Creating database...'
    );

    const schemaPath = path.join(
        process.cwd(),
        'src',
        'database',
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