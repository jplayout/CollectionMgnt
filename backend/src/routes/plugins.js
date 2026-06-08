import {
    PluginRepository
} from '../repositories/plugin-repository.js';

import {
    SettingsRepository
} from '../repositories/settings-repository.js';

import {
    DisplayPreferencesService,
    DisplayPreferencesValidationError
} from '../services/display-preferences-service.js';

export default async function (
    fastify
) {

    const repository =
        new PluginRepository(
            fastify.db
        );

    const displayPreferencesService =
        new DisplayPreferencesService(
            new SettingsRepository(
                fastify.db
            )
        );

    fastify.get(
        '/api/plugins',
        async () => {

            return repository.findAll();

        }
    );

    fastify.get(
        '/api/plugins/:id',
        async request => {

            const plugin =
                repository.findByCode(
                    request.params.id
                );

            if (!plugin) {

                return fastify
                    .notFound();

            }

            return plugin;

        }
    );

    fastify.patch(
        '/api/plugins/:id',
        async request => {

            const {
                display_name,
                enabled
            } = request.body;

            repository.update(
                request.params.id,
                {
                    display_name,
                    enabled
                }
            );

            return {
                success: true
            };

        }
    );

    fastify.get(
        '/api/plugins/:pluginId/display-preferences',
        async (
            request,
            reply
        ) => {

            const plugin =
                getPlugin(
                    fastify,
                    request.params.pluginId,
                    reply
                );

            if (!plugin) {
                return;
            }

            try {

                return displayPreferencesService.get(
                    plugin
                );

            } catch (error) {

                return handleDisplayPreferencesError(
                    error,
                    reply
                );

            }

        }
    );

    fastify.put(
        '/api/plugins/:pluginId/display-preferences',
        async (
            request,
            reply
        ) => {

            const plugin =
                getPlugin(
                    fastify,
                    request.params.pluginId,
                    reply
                );

            if (!plugin) {
                return;
            }

            try {

                return displayPreferencesService.save(
                    plugin,
                    request.body
                );

            } catch (error) {

                return handleDisplayPreferencesError(
                    error,
                    reply
                );

            }

        }
    );

    fastify.delete(
        '/api/plugins/:pluginId/display-preferences',
        async (
            request,
            reply
        ) => {

            const plugin =
                getPlugin(
                    fastify,
                    request.params.pluginId,
                    reply
                );

            if (!plugin) {
                return;
            }

            return displayPreferencesService.reset(
                plugin
            );

        }
    );

    fastify.get(
        '/api/plugins/:pluginId/fields',
        async (
            request,
            reply
        ) => {

            const plugin =
                fastify
                    .pluginService
                    .getById(
                        request.params.pluginId
                    );

            if (!plugin) {

                return reply
                    .code(404)
                    .send({
                        error:
                            'Plugin not found'
                    });

            }

            return {
                plugin:
                    plugin.id,
                fields:
                    plugin.fields
            };

        }
    );

    fastify.get(
        '/api/plugins/:pluginId/schema',
        async (
            request,
            reply
        ) => {

            const plugin =
                fastify
                    .pluginService
                    .getById(
                        request.params.pluginId
                    );

            if (!plugin) {

                return reply
                    .code(404)
                    .send({
                        error:
                            'Plugin not found'
                    });

            }

            return {
                plugin: {
                    id: plugin.id,
                    name: plugin.name,
                    version: plugin.version
                },
                fields: plugin.fields
            };

        }
    );    

}

function getPlugin(
    fastify,
    pluginId,
    reply
) {

    const plugin =
        fastify
            .pluginService
            .getById(
                pluginId
            );

    if (!plugin) {

        reply
            .code(404)
            .send({
                error:
                    'Plugin not found'
            });

        return null;

    }

    return plugin;

}

function handleDisplayPreferencesError(
    error,
    reply
) {

    if (
        error instanceof DisplayPreferencesValidationError
    ) {

        return reply
            .code(400)
            .send({
                error:
                    error.message
            });

    }

    throw error;

}
