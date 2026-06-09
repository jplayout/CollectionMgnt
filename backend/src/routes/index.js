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

        }
    );

}
