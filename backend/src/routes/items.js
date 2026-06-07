import {
    ItemRepository
} from '../repositories/item-repository.js';

import {
    PluginRepository
} from '../repositories/plugin-repository.js';

import {
    validateItem
} from '../services/item-validator.js';

import {
    MediaService
} from '../services/media-service.js';

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

    const mediaService =
        new MediaService(
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

    fastify.get(
        '/api/items/:id',
        async (
            request,
            reply
        ) => {

            const item =
                repository.findById(
                    request.params.id
                );

            if (
                !item
            ) {

                return reply
                    .code(404)
                    .send({
                        error:
                            'Item not found'
                    });

            }

            return item;

        }
    );

    fastify.patch(
        '/api/items/:id',
        async (
            request,
            reply
        ) => {

            const existingItem =
                repository.findById(
                    request.params.id
                );

            if (
                !existingItem
            ) {

                return reply
                    .code(404)
                    .send({
                        error:
                            'Item not found'
                    });

            }

            const payload =
                request.body ?? {};

            if (
                payload.plugin !== undefined &&
                payload.plugin !== existingItem.plugin
            ) {

                return reply
                    .code(400)
                    .send({
                        error:
                            'Item plugin cannot be changed'
                    });

            }

            if (
                payload.metadata === undefined
            ) {

                return reply
                    .code(400)
                    .send({
                        errors: [
                            'metadata must be an object'
                        ]
                    });

            }

            const pluginDefinition =
                fastify
                    .pluginService
                    .getById(
                        existingItem.plugin
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

            const validationPayload = {
                ...payload,
                plugin:
                    existingItem.plugin
            };

            const errors =
                validateItem(
                    pluginDefinition,
                    validationPayload
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

            const metadata =
                mergeMetadata(
                    existingItem.metadata,
                    payload.metadata,
                    pluginDefinition.fields
                );

            repository.update(
                existingItem.id,
                {
                    title:
                        payload.title,
                    description:
                        payload.description,
                    metadata
                }
            );

            return repository.findById(
                existingItem.id
            );

        }
    );

    fastify.delete(
        '/api/items/:id',
        async (
            request,
            reply
        ) => {

            const item =
                repository.findById(
                    request.params.id
                );

            if (
                !item
            ) {

                return reply
                    .code(404)
                    .send({
                        error:
                            'Item not found'
                    });

            }

            repository.delete(
                item.id
            );

            try {

                await mediaService.cleanupItemMediaFiles(
                    item.id
                );

            } catch (cleanupError) {

                request.log.error(
                    {
                        error:
                            cleanupError,
                        itemId:
                            item.id
                    },
                    'Failed to cleanup item media files'
                );

            }

            return {
                success: true
            };

        }
    );

}

function mergeMetadata(
    existingMetadata,
    payloadMetadata,
    fields
) {

    const fieldNames =
        new Set(
            fields.map(
                field => field.name
            )
        );

    const metadata = {};

    for (
        const [key, value]
        of Object.entries(
            existingMetadata ?? {}
        )
    ) {

        if (
            !fieldNames.has(key)
        ) {

            metadata[key] =
                value;

        }

    }

    return {
        ...metadata,
        ...payloadMetadata
    };

}
