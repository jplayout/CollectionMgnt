import Database from 'better-sqlite3';

import {
    DATABASE_PATH
} from '../config/paths.js';

let db = null;

export function getDatabase() {

    if (db) {
        return db;
    }

    db = new Database(
        DATABASE_PATH
    );

    db.pragma('foreign_keys = ON');

    return db;
}
