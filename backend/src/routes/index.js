import authRoutes
from '../auth/routes.js';

import pluginsRoutes
from './plugins.js';

import itemsRoutes
from './items.js';

import mediaRoutes
from '../media/routes.js';

import exportsRoutes
from './exports.js';

import adminMediaAuditRoutes
from './admin-media-audit.js';

import adminMediaCleanupRoutes
from './admin-media-cleanup.js';

import adminSystemRoutes
from './admin-system.js';

import adminImportsRoutes
from './admin-imports.js';

export async function registerRoutes(
    app
) {

    await app.register(
        authRoutes
    );

    await app.register(
        async protectedRoutes => {

            protectedRoutes.addHook(
                'preHandler',
                protectedRoutes.authenticate
            );

            await protectedRoutes.register(
                pluginsRoutes
            );

            await protectedRoutes.register(
                itemsRoutes
            );

            await protectedRoutes.register(
                mediaRoutes
            );

            await protectedRoutes.register(
                exportsRoutes
            );

            await protectedRoutes.register(
                adminMediaAuditRoutes
            );

            await protectedRoutes.register(
                adminMediaCleanupRoutes
            );

            await protectedRoutes.register(
                adminSystemRoutes
            );

            await protectedRoutes.register(
                adminImportsRoutes
            );

        }
    );

}
