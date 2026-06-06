import {
    PluginRepository
} from '../repositories/plugin-repository.js';

export default async function (
    fastify
) {

    const repository =
        new PluginRepository(
            fastify.db
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