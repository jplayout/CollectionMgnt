import authRoutes
from '../auth/routes.js';

import pluginsRoutes
from './plugins.js';

import itemsRoutes
from './items.js';

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

        }
    );

}
