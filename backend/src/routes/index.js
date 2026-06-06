import pluginsRoutes
from './plugins.js';

import itemsRoutes
from './items.js';

export async function registerRoutes(
    app
) {

    await app.register(
        pluginsRoutes
    );

    await app.register(
        itemsRoutes
    );

}