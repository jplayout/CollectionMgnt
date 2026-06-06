import {
    ItemRepository
} from '../repositories/item-repository.js';

import {
    PluginRepository
} from '../repositories/plugin-repository.js';

import {
    validateItem
} from '../services/item-validator.js';

export default async function (
    fastify
) {

    const repository =
        new ItemRepository(
            fastify.db
        );

    const pluginRepository =
        new PluginRepository(
            fastify.db
        );

    fastify.post(
        '/api/items',
        async (
            request,
            reply
        ) => {

            const {
                plugin,
                title,
                description,
                metadata
            } = request.body;

            const pluginDefinition =
                fastify
                    .pluginService
                    .getById(
                        plugin
                    );

            if (
                !pluginDefinition
            ) {

                return reply
                    .code(400)
                    .send({
                        error:
                            'Unknown plugin'
                    });

            }

            const errors =
                validateItem(
                    pluginDefinition,
                    request.body
                );

            if (
                errors.length > 0
            ) {

                return reply
                    .code(400)
                    .send({
                        errors
                    });

            }

            const pluginRow =
                fastify.db
                    .prepare(`
                        SELECT id
                        FROM plugins
                        WHERE code = ?
                    `)
                    .get(plugin);

            const itemId =
                repository.create({
                    plugin_id:
                        pluginRow.id,
                    title,
                    description,
                    metadata
                });

            return {
                id: itemId
            };

        }
    );

    fastify.get(
        '/api/items',
        async request => {

            const query =
                request.query;

            const filters = {
                metadataFilters: {}
            };

            let pluginDefinition =
                null;

            if (
                query.plugin
            ) {

                const plugin =
                    pluginRepository
                        .findByCode(
                            query.plugin
                        );

                if (
                    plugin
                ) {

                    filters.pluginId =
                        plugin.id;

                    pluginDefinition =
                        fastify
                            .pluginService
                            .getById(
                                query.plugin
                            );

                }

            }

            if (
                query.title
            ) {

                filters.title =
                    query.title;

            }

            if (
                pluginDefinition
            ) {

                for (
                    const field
                    of pluginDefinition.fields
                ) {

                    if (
                        field.filterable &&
                        query[
                            field.name
                        ] !== undefined
                    ) {

                        filters
                            .metadataFilters[
                                field.name
                            ] =
                            query[
                                field.name
                            ];

                    }

                }

            }

            return repository
                .findAll(
                    filters
                );

        }
    );

    fastify.delete(
        '/api/items/:id',
        async request => {

            repository.delete(
                request.params.id
            );

            return {
                success: true
            };

        }
    );

}
