import fs from 'fs/promises';
import {
    readFileSync
} from 'fs';
import os from 'os';
import path from 'path';
import {
    fileURLToPath
} from 'url';

import Database from 'better-sqlite3';

import { buildApp } from '../../src/app.js';
import { registerJwt } from '../../src/auth/jwt.js';
import { createInitialAdmin } from '../../src/bootstrap/admin-user.js';
import { syncPlugins } from '../../src/bootstrap/plugin-sync.js';
import { loadPlugins } from '../../src/plugins/plugin-loader.js';
import { PluginService } from '../../src/plugins/plugin-service.js';

const CURRENT_DIR =
    path.dirname(
        fileURLToPath(
            import.meta.url
        )
    );

const BACKEND_ROOT =
    path.resolve(
        CURRENT_DIR,
        '../..'
    );

const DEFAULT_TEST_ADMIN = {
    password:
        'test-password',
    username:
        'admin'
};

export async function createTestApp() {

    const testRoot =
        await fs.mkdtemp(
            path.join(
                os.tmpdir(),
                'collectionmgnt-test-'
            )
        );

    const dataDir =
        path.join(
            testRoot,
            'data'
        );

    await fs.mkdir(
        dataDir,
        {
            recursive:
                true
        }
    );

    process.env.JWT_SECRET =
        'test-secret';

    process.env.ADMIN_USERNAME =
        DEFAULT_TEST_ADMIN.username;

    process.env.ADMIN_PASSWORD =
        DEFAULT_TEST_ADMIN.password;

    process.env.DATA_DIR =
        dataDir;

    process.env.PLUGINS_DIR =
        path.join(
            BACKEND_ROOT,
            'plugins'
        );

    const db =
        createTemporaryDatabase(
            dataDir
        );

    const app =
        buildApp();

    await registerJwt(
        app
    );

    await createInitialAdmin(
        db
    );

    const pluginService =
        await createPluginService(
            process.env.PLUGINS_DIR
        );

    await syncPlugins(
        db,
        pluginService
    );

    app.decorate(
        'db',
        db
    );

    app.decorate(
        'pluginService',
        pluginService
    );

    const {
        registerRoutes
    } =
        await import(
            '../../src/routes/index.js'
        );

    await registerRoutes(
        app
    );

    await app.ready();

    return {
        admin:
            DEFAULT_TEST_ADMIN,
        app,
        dataDir,
        db,
        async close() {

            await app.close();

            db.close();

            await fs.rm(
                testRoot,
                {
                    force:
                        true,
                    recursive:
                        true
                }
            );

        },
        async login() {

            const response =
                await app.inject({
                    method:
                        'POST',
                    payload: {
                        password:
                            DEFAULT_TEST_ADMIN.password,
                        username:
                            DEFAULT_TEST_ADMIN.username
                    },
                    url:
                        '/api/auth/login'
                });

            return response.json().token;

        }
    };

}

function createTemporaryDatabase(
    dataDir
) {

    const db =
        new Database(
            path.join(
                dataDir,
                'collection-manager.db'
            )
        );

    db.pragma(
        'foreign_keys = ON'
    );

    db.exec(
        readSchema()
    );

    return db;

}

function readSchema() {

    return readFileSync(
        path.join(
            BACKEND_ROOT,
            'src',
            'database',
            'schema.sql'
        ),
        'utf8'
    );

}

async function createPluginService(
    pluginsDir
) {

    const service =
        new PluginService();

    const plugins =
        await loadPlugins(
            pluginsDir
        );

    for (
        const plugin
        of plugins
    ) {

        service.register(
            plugin
        );

    }

    return service;

}
