import { buildApp } from './app.js';

import { initializeDatabase }
from './database/init.js';

import {
    createInitialAdmin
} from './bootstrap/admin-user.js';

import {
    bootstrapPlugins
} from './bootstrap/plugins.js';

import {
    syncPlugins
} from './bootstrap/plugin-sync.js';

import {
    registerRoutes
} from './routes/index.js';

import {
    registerJwt
} from './auth/jwt.js';

try {

    const port =
        Number(
            process.env.PORT ?? 3000
        );

    const db =
        await initializeDatabase();

    const app = buildApp();

    await registerJwt(
        app
    );

    await createInitialAdmin(
        db
    );

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
        port
    });

} catch (error) {

    console.error(
        'Application startup failed:',
        error
    );

    process.exit(1);

}
