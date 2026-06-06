import Database from 'better-sqlite3';
import path from 'path';

let db = null;

export function getDatabase() {

    if (db) {
        return db;
    }

    const databasePath = path.join(
        process.cwd(),
        'data',
        'collection-manager.db'
    );

    db = new Database(databasePath);

    db.pragma('foreign_keys = ON');

    return db;
}