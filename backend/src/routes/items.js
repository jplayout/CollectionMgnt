import {
    ItemRepository
} from '../repositories/item-repository.js';

import {
    PluginRepository
} from '../repositories/plugin-repository.js';

import {
    normalizeItemMetadata,
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

            const normalizedMetadata =
                normalizeItemMetadata(
                    pluginDefinition,
                    metadata ?? {}
                );

            const itemId =
                repository.create({
                    plugin_id:
                        pluginRow.id,
                    title,
                    description,
                    metadata:
                        normalizedMetadata
                });

            return {
                id: itemId
            };

        }
    );

    fastify.get(
        '/api/items',
        async (
            request,
            reply
        ) => {

            const query =
                request.query;

            const parsedPagination =
                parsePagination(
                    query
                );

            if (
                parsedPagination.error
            ) {

                return reply
                    .code(400)
                    .send({
                        error:
                            parsedPagination.error
                    });

            }

            const filters = {
                metadataFilters: []
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
                query.search
            ) {

                filters.search =
                    query.search;

            }

            if (
                pluginDefinition
            ) {

                filters.searchableFields =
                    pluginDefinition.fields
                        .filter(
                            field => field.searchable
                        )
                        .map(
                            field => field.name
                        );

                filters.searchValues =
                    buildSearchValues(
                        filters.search,
                        pluginDefinition.fields
                    );

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

                        const parsedFilter =
                            parseMetadataFilter(
                                field,
                                query[
                                    field.name
                                ]
                            );

                        if (
                            parsedFilter.error
                        ) {

                            return reply
                                .code(400)
                                .send({
                                    errors: [
                                        parsedFilter.error
                                    ]
                                });

                        }

                        filters
                            .metadataFilters
                            .push({
                                name:
                                    field.name,
                                type:
                                    field.type,
                                value:
                                    parsedFilter.value
                            });

                    }

                }

            }

            const parsedSorting =
                parseSorting(
                    query,
                    pluginDefinition
                );

            if (
                parsedSorting.error
            ) {

                return reply
                    .code(400)
                    .send({
                        error:
                            parsedSorting.error
                    });

            }

            const {
                items,
                total
            } =
                repository
                    .findAll(
                        filters,
                        parsedPagination.value,
                        parsedSorting.value
                    );

            return {
                items,
                total,
                page:
                    parsedPagination.value.page,
                pageSize:
                    parsedPagination.value.pageSize,
                totalPages:
                    Math.ceil(
                        total / parsedPagination.value.pageSize
                    )
            };

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
                    normalizeItemMetadata(
                        pluginDefinition,
                        payload.metadata
                    ),
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

function parseSorting(
    query,
    pluginDefinition
) {

    const sort =
        query.sort ?? 'title';

    const direction =
        query.direction ?? 'asc';

    if (
        typeof sort !== 'string' ||
        sort.trim() === ''
    ) {

        return {
            error:
                'sort must be a valid sortable field'
        };

    }

    if (
        direction !== 'asc' &&
        direction !== 'desc'
    ) {

        return {
            error:
                'direction must be asc or desc'
        };

    }

    const normalizedDirection =
        direction === 'asc'
            ? 'ASC'
            : 'DESC';

    const systemSort =
        parseSystemSort(
            sort,
            normalizedDirection
        );

    if (
        systemSort
    ) {

        return {
            value:
                systemSort
        };

    }

    if (
        !pluginDefinition
    ) {

        return {
            error:
                'metadata sort requires a known plugin'
        };

    }

    const metadataField =
        pluginDefinition.fields.find(
            field => field.name === sort
        );

    if (
        !metadataField ||
        !isSortableMetadataType(
            metadataField.type
        )
    ) {

        return {
            error:
                'sort must be a valid sortable field'
        };

    }

    return {
        value: {
            field:
                metadataField.name,
            kind:
                'metadata',
            type:
                metadataField.type,
            direction:
                normalizedDirection
        }
    };

}

function parseSystemSort(
    sort,
    direction
) {

    if (
        [
            'title',
            'created_at',
            'updated_at'
        ].includes(sort)
    ) {

        return {
            field:
                sort,
            kind:
                'system',
            direction
        };

    }

    return null;

}

function isSortableMetadataType(
    type
) {

    return [
        'text',
        'textarea',
        'select',
        'isbn',
        'barcode',
        'date',
        'number',
        'rating',
        'checkbox'
    ].includes(type);

}

function parsePagination(
    query
) {

    const page =
        parseIntegerQueryParam(
            query.page,
            1
        );

    if (
        !Number.isInteger(page) ||
        page < 1
    ) {

        return {
            error:
                'page must be an integer greater than or equal to 1'
        };

    }

    const pageSize =
        parseIntegerQueryParam(
            query.pageSize,
            24
        );

    if (
        !Number.isInteger(pageSize) ||
        pageSize < 1 ||
        pageSize > 100
    ) {

        return {
            error:
                'pageSize must be an integer between 1 and 100'
        };

    }

    return {
        value: {
            page,
            pageSize
        }
    };

}

function parseIntegerQueryParam(
    value,
    fallback
) {

    if (
        value === undefined
    ) {

        return fallback;

    }

    if (
        typeof value !== 'string' ||
        !/^\d+$/.test(
            value
        )
    ) {

        return NaN;

    }

    return Number(
        value
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

function parseMetadataFilter(
    field,
    value
) {

    switch (field.type) {

        case 'checkbox':
            return parseCheckboxFilter(
                field,
                value
            );

        case 'number':
            return parseNumberFilter(
                field,
                value
            );

        case 'rating':
            return parseRatingFilter(
                field,
                value
            );

        case 'date':
            return parseDateFilter(
                field,
                value
            );

        case 'select':
            return parseSelectFilter(
                field,
                value
            );

        case 'isbn':
            return parseIsbnFilter(
                field,
                value
            );

        case 'barcode':
            return parseBarcodeFilter(
                field,
                value
            );

        default:
            return {
                value
            };

    }

}

function parseIsbnFilter(
    field,
    value
) {

    const normalizedValue =
        normalizeIdentifierFilterValue(
            value
        );

    if (
        !isValidIsbnFilterValue(
            normalizedValue
        )
    ) {

        return {
            error:
                `${field.name} filter must be a valid ISBN-10 or ISBN-13`
        };

    }

    return {
        value:
            normalizedValue
    };

}

function parseBarcodeFilter(
    field,
    value
) {

    const normalizedValue =
        normalizeIdentifierFilterValue(
            value
        );

    if (
        !isValidBarcodeFilterValue(
            normalizedValue
        )
    ) {

        return {
            error:
                `${field.name} filter must be a valid EAN-13 or UPC-A barcode`
        };

    }

    return {
        value:
            normalizedValue
    };

}

function buildSearchValues(
    search,
    fields
) {

    if (
        !search
    ) {

        return undefined;

    }

    const hasIdentifierField =
        fields.some(
            field => field.searchable &&
                (
                    field.type === 'isbn' ||
                    field.type === 'barcode'
                )
        );

    if (
        !hasIdentifierField
    ) {

        return [
            search
        ];

    }

    return Array.from(
        new Set([
            search,
            normalizeIdentifierFilterValue(
                search
            )
        ].filter(Boolean))
    );

}

function normalizeIdentifierFilterValue(value) {

    if (
        typeof value !== 'string'
    ) {

        return '';

    }

    return value
        .replaceAll(
            /[\s-]/g,
            ''
        )
        .toUpperCase();

}

function isValidIsbnFilterValue(value) {

    if (
        /^[0-9]{9}[0-9X]$/.test(
            value
        )
    ) {

        return hasValidIsbn10Checksum(
            value
        );

    }

    if (
        /^[0-9]{13}$/.test(
            value
        )
    ) {

        return hasValidEan13Checksum(
            value
        );

    }

    return false;

}

function isValidBarcodeFilterValue(value) {

    if (
        /^[0-9]{12}$/.test(
            value
        )
    ) {

        return hasValidUpcAChecksum(
            value
        );

    }

    if (
        /^[0-9]{13}$/.test(
            value
        )
    ) {

        return hasValidEan13Checksum(
            value
        );

    }

    return false;

}

function hasValidIsbn10Checksum(value) {

    let sum =
        0;

    for (
        let index = 0;
        index < 10;
        index += 1
    ) {

        const digit =
            value[index] === 'X'
                ? 10
                : Number(value[index]);

        sum += digit * (10 - index);

    }

    return sum % 11 === 0;

}

function hasValidEan13Checksum(value) {

    let sum =
        0;

    for (
        let index = 0;
        index < 12;
        index += 1
    ) {

        const digit =
            Number(
                value[index]
            );

        sum += index % 2 === 0
            ? digit
            : digit * 3;

    }

    const checkDigit =
        (10 - (sum % 10)) % 10;

    return checkDigit === Number(value[12]);

}

function hasValidUpcAChecksum(value) {

    let sum =
        0;

    for (
        let index = 0;
        index < 11;
        index += 1
    ) {

        const digit =
            Number(
                value[index]
            );

        sum += index % 2 === 0
            ? digit * 3
            : digit;

    }

    const checkDigit =
        (10 - (sum % 10)) % 10;

    return checkDigit === Number(value[11]);

}

function parseCheckboxFilter(
    field,
    value
) {

    if (
        value === 'true'
    ) {

        return {
            value: 1
        };

    }

    if (
        value === 'false'
    ) {

        return {
            value: 0
        };

    }

    return {
        error:
            `${field.name} filter must be true or false`
    };

}

function parseNumberFilter(
    field,
    value
) {

    if (
        typeof value !== 'string' ||
        value.trim() === ''
    ) {

        return {
            error:
                `${field.name} filter must be a finite number`
        };

    }

    const numberValue =
        Number(
            value
        );

    if (
        !Number.isFinite(
            numberValue
        )
    ) {

        return {
            error:
                `${field.name} filter must be a finite number`
        };

    }

    return {
        value:
            numberValue
    };

}

function parseRatingFilter(
    field,
    value
) {

    const parsed =
        parseNumberFilter(
            field,
            value
        );

    if (
        parsed.error
    ) {

        return parsed;

    }

    const min =
        field.min ?? 0;

    const max =
        field.max ?? 20;

    if (
        parsed.value < min ||
        parsed.value > max
    ) {

        return {
            error:
                `${field.name} filter must be between ${min} and ${max}`
        };

    }

    return parsed;

}

function parseDateFilter(
    field,
    value
) {

    if (
        typeof value !== 'string' ||
        !isValidIsoDate(
            value
        )
    ) {

        return {
            error:
                `${field.name} filter must be a valid date in YYYY-MM-DD format`
        };

    }

    return {
        value
    };

}

function parseSelectFilter(
    field,
    value
) {

    if (
        !Array.isArray(field.options)
    ) {

        return {
            value
        };

    }

    const allowedValues =
        field.options.map(
            option => getOptionValue(
                option
            )
        );

    if (
        !allowedValues.some(
            allowedValue => String(allowedValue).toLocaleLowerCase() ===
                String(value).toLocaleLowerCase()
        )
    ) {

        return {
            error:
                `${field.name} filter must be one of allowed values`
        };

    }

    return {
        value
    };

}

function getOptionValue(
    option
) {

    if (
        option !== null &&
        typeof option === 'object' &&
        option.value !== undefined
    ) {

        return option.value;

    }

    return option;

}

function isValidIsoDate(
    value
) {

    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
            value
        )
    ) {

        return false;

    }

    const [
        year,
        month,
        day
    ] =
        value
            .split('-')
            .map(Number);

    const date =
        new Date(
            Date.UTC(
                year,
                month - 1,
                day
            )
        );

    return date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day;

}
