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
