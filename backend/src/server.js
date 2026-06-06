import { buildApp } from './app.js';

import { initializeDatabase }
from './database/init.js';

import {
    bootstrapPlugins
} from './bootstrap/plugins.js';

import {
    syncPlugins
} from './bootstrap/plugin-sync.js';

import {
    registerRoutes
} from './routes/index.js';

try {

    const db =
        await initializeDatabase();

    const pluginService =
        await bootstrapPlugins();

    await syncPlugins(
        db,
        pluginService
    );

    console.log(
        `${pluginService.getAll().length} plugins loaded`
    );

    pluginService
        .getAll()
        .forEach(plugin => {

            console.log(
                ` - ${plugin.id}`
            );

        });

    const app = buildApp();

    app.decorate(
        'db',
        db
    );

    app.decorate(
        'pluginService',
        pluginService
    );

    await registerRoutes(
        app
    );

    await app.listen({
        host: '0.0.0.0',
        port: 3000
    });

} catch (error) {

    console.error(
        'Application startup failed:',
        error
    );

    process.exit(1);

}