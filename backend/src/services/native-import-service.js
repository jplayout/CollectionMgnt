import {
    NativeImportRepository
} from '../repositories/native-import-repository.js';

import {
    normalizeItemMetadata,
    validateItem
} from './item-validator.js';

const NATIVE_EXPORT_FORMAT =
    'collectionmgnt.native-export';

const SUPPORTED_FORMAT_VERSION =
    1;

const IMPORT_MODE =
    'add_only';

export class NativeImportValidationError extends Error {

    constructor(message) {
        super(message);
        this.name = 'NativeImportValidationError';
    }

}

export class NativeImportService {

    constructor(
        db,
        pluginService
    ) {

        this.repository =
            new NativeImportRepository(
                db
            );

        this.pluginService =
            pluginService;

    }

    importDocument(document) {

        validateDocument(
            document
        );

        const importStartedAt =
            new Date().toISOString();

        const report =
            createReport(
                importStartedAt
            );

        this.repository.transaction(
            () => {

                for (
                    const collection
                    of document.collections
                ) {

                    this.importCollection(
                        document,
                        collection,
                        report
                    );

                }

            }
        );

        report.import_finished_at =
            new Date().toISOString();

        report.summary.errorCount =
            report.errors.length;

        report.summary.warningCount =
            report.warnings.length;

        return report;

    }

    importCollection(
        document,
        collection,
        report
    ) {

        const plugin =
            this.repository.findPluginByCode(
                collection.plugin
            );

        if (
            !plugin
        ) {

            report.summary.collectionsSkipped +=
                1;

            addWarning(
                report,
                'PLUGIN_MISSING',
                `Plugin ${collection.plugin} is not installed. Collection skipped.`,
                {
                    plugin:
                        collection.plugin
                }
            );

            report.summary.mediaMetadataSkipped +=
                collection.media.length;

            return;

        }

        const localSchema =
            this.pluginService.getById(
                collection.plugin
            );

        if (
            !localSchema
        ) {

            report.summary.collectionsSkipped +=
                1;

            addWarning(
                report,
                'PLUGIN_SCHEMA_MISSING',
                `Plugin ${collection.plugin} has no local schema. Collection skipped.`,
                {
                    plugin:
                        collection.plugin
                }
            );

            report.summary.mediaMetadataSkipped +=
                collection.media.length;

            return;

        }

        report.summary.collectionsProcessed +=
            1;

        if (
            !plugin.enabled
        ) {

            addWarning(
                report,
                'PLUGIN_DISABLED',
                `Plugin ${collection.plugin} is disabled. Items were imported anyway.`,
                {
                    plugin:
                        collection.plugin
                }
            );

        }

        warnOnSchemaDifference(
            document,
            collection,
            localSchema,
            report
        );

        const itemIdMap =
            new Map();

        for (
            const item
            of collection.items
        ) {

            this.importItem(
                {
                    collection,
                    item,
                    itemIdMap,
                    localSchema,
                    plugin,
                    report
                }
            );

        }

        if (
            collection.media.length > 0
        ) {

            report.summary.mediaMetadataSkipped +=
                collection.media.length;

            addWarning(
                report,
                'MEDIA_METADATA_SKIPPED',
                `Media metadata for plugin ${collection.plugin} was not imported because media files are not included in native JSON exports.`,
                {
                    plugin:
                        collection.plugin,
                    count:
                        collection.media.length
                }
            );

        }

    }

    importItem({
        collection,
        item,
        itemIdMap,
        localSchema,
        plugin,
        report
    }) {

        const metadata =
            item.metadata ?? {};

        const validationErrors =
            validateItem(
                localSchema,
                {
                    title:
                        item.title,
                    description:
                        item.description,
                    metadata
                }
            );

        if (
            validationErrors.length > 0
        ) {

            report.summary.itemsSkipped +=
                1;

            const skippedItem =
                createSkippedItem({
                    plugin:
                        collection.plugin,
                    item,
                    reason:
                        validationErrors.join(
                            ', '
                        )
                });

            report.skippedItems.push(
                skippedItem
            );

            addError(
                report,
                'ITEM_VALIDATION_FAILED',
                `Item "${item.title}" was skipped: ${skippedItem.reason}.`,
                skippedItem
            );

            return;

        }

        warnOnUnknownMetadataFields(
            collection,
            item,
            localSchema,
            report
        );

        const normalizedMetadata =
            normalizeItemMetadata(
                localSchema,
                metadata
            );

        const newId =
            this.repository.createItem({
                plugin_id:
                    plugin.id,
                title:
                    item.title,
                description:
                    item.description,
                metadata:
                    normalizedMetadata,
                created_at:
                    item.created_at,
                updated_at:
                    item.updated_at
            });

        if (
            item.source_id !== undefined
        ) {

            itemIdMap.set(
                item.source_id,
                newId
            );

        }

        report.summary.itemsCreated +=
            1;

        report.createdItems.push({
            plugin:
                collection.plugin,
            source_id:
                item.source_id ?? null,
            new_id:
                newId,
            title:
                item.title
        });

    }

}

function validateDocument(document) {

    if (
        !isPlainObject(
            document
        )
    ) {

        throw new NativeImportValidationError(
            'Native import file root must be an object.'
        );

    }

    if (
        document.format !== NATIVE_EXPORT_FORMAT
    ) {

        throw new NativeImportValidationError(
            'Unsupported import format. Expected collectionmgnt.native-export.'
        );

    }

    if (
        document.format_version !== SUPPORTED_FORMAT_VERSION
    ) {

        const version =
            document.format_version === undefined
                ? 'missing'
                : document.format_version;

        throw new NativeImportValidationError(
            `Unsupported native export format_version ${version}. Supported version is 1.`
        );

    }

    if (
        document.scope !== 'application' &&
        document.scope !== 'collection'
    ) {

        throw new NativeImportValidationError(
            'Native import scope must be application or collection.'
        );

    }

    if (
        !Array.isArray(
            document.collections
        )
    ) {

        throw new NativeImportValidationError(
            'Native import collections must be an array.'
        );

    }

    for (
        const [index, collection]
        of document.collections.entries()
    ) {

        validateCollection(
            collection,
            index
        );

    }

}

function validateCollection(
    collection,
    index
) {

    if (
        !isPlainObject(
            collection
        )
    ) {

        throw new NativeImportValidationError(
            `Collection at index ${index} must be an object.`
        );

    }

    if (
        typeof collection.plugin !== 'string' ||
        collection.plugin.trim() === ''
    ) {

        throw new NativeImportValidationError(
            `Collection at index ${index} must have a plugin.`
        );

    }

    if (
        !Array.isArray(
            collection.items
        )
    ) {

        throw new NativeImportValidationError(
            `Collection ${collection.plugin} items must be an array.`
        );

    }

    if (
        collection.media === undefined
    ) {

        collection.media =
            [];

    }

    if (
        !Array.isArray(
            collection.media
        )
    ) {

        throw new NativeImportValidationError(
            `Collection ${collection.plugin} media must be an array.`
        );

    }

    for (
        const [itemIndex, item]
        of collection.items.entries()
    ) {

        validateImportItem(
            item,
            collection.plugin,
            itemIndex
        );

    }

}

function validateImportItem(
    item,
    plugin,
    index
) {

    if (
        !isPlainObject(
            item
        )
    ) {

        throw new NativeImportValidationError(
            `Item at index ${index} in collection ${plugin} must be an object.`
        );

    }

    if (
        typeof item.title !== 'string' ||
        item.title.trim() === ''
    ) {

        throw new NativeImportValidationError(
            `Item at index ${index} in collection ${plugin} must have a title.`
        );

    }

    if (
        item.metadata !== undefined &&
        !isPlainObject(
            item.metadata
        )
    ) {

        throw new NativeImportValidationError(
            `Item "${item.title}" in collection ${plugin} metadata must be an object.`
        );

    }

}

function warnOnSchemaDifference(
    document,
    collection,
    localSchema,
    report
) {

    const exportedSchema =
        Array.isArray(
            document.schemas
        )
            ? document.schemas.find(
                schema => schema?.plugin === collection.plugin
            )
            : null;

    if (
        !exportedSchema
    ) {

        return;

    }

    if (
        exportedSchema.version !== localSchema.version
    ) {

        addWarning(
            report,
            'SCHEMA_VERSION_DIFFERENT',
            `Exported schema version for ${collection.plugin} differs from the local schema version.`,
            {
                plugin:
                    collection.plugin,
                exported_version:
                    exportedSchema.version,
                local_version:
                    localSchema.version
            }
        );

    }

    const exportedSignature =
        getFieldSignature(
            exportedSchema.fields
        );

    const localSignature =
        getFieldSignature(
            localSchema.fields
        );

    if (
        exportedSignature !== localSignature
    ) {

        addWarning(
            report,
            'SCHEMA_FIELDS_DIFFERENT',
            `Exported schema fields for ${collection.plugin} differ from the local schema fields.`,
            {
                plugin:
                    collection.plugin
            }
        );

    }

}

function warnOnUnknownMetadataFields(
    collection,
    item,
    localSchema,
    report
) {

    const fieldNames =
        new Set(
            localSchema.fields.map(
                field => field.name
            )
        );

    const unknownFields =
        Object.keys(
            item.metadata ?? {}
        ).filter(
            key => !fieldNames.has(key)
        );

    if (
        unknownFields.length === 0
    ) {

        return;

    }

    addWarning(
        report,
        'UNKNOWN_METADATA_FIELDS',
        `Item "${item.title}" contains metadata fields that are not declared in the local schema. They were kept.`,
        {
            plugin:
                collection.plugin,
            source_id:
                item.source_id ?? null,
            title:
                item.title,
            fields:
                unknownFields
        }
    );

}

function createReport(importStartedAt) {

    return {
        import_started_at:
            importStartedAt,
        import_finished_at:
            null,
        mode:
            IMPORT_MODE,
        summary: {
            collectionsProcessed:
                0,
            collectionsSkipped:
                0,
            itemsCreated:
                0,
            itemsSkipped:
                0,
            mediaMetadataSkipped:
                0,
            errorCount:
                0,
            warningCount:
                0
        },
        createdItems: [],
        skippedItems: [],
        warnings: [],
        errors: []
    };

}

function createSkippedItem({
    plugin,
    item,
    reason
}) {

    return {
        plugin,
        source_id:
            item.source_id ?? null,
        title:
            item.title,
        reason
    };

}

function addWarning(
    report,
    code,
    message,
    details = {}
) {

    report.warnings.push({
        code,
        message,
        ...details
    });

}

function addError(
    report,
    code,
    message,
    details = {}
) {

    report.errors.push({
        code,
        message,
        ...details
    });

}

function getFieldSignature(fields) {

    if (
        !Array.isArray(
            fields
        )
    ) {

        return '';

    }

    return fields
        .map(
            field => `${field.name}:${field.type}`
        )
        .sort()
        .join('|');

}

function isPlainObject(value) {

    return value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value);

}
