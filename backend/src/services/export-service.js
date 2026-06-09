import {
    ExportRepository
} from '../repositories/export-repository.js';

const EXPORT_FORMAT =
    'collectionmgnt.native-export';

const EXPORT_FORMAT_VERSION =
    1;

export class ExportNotFoundError extends Error {

    constructor(message) {
        super(message);
        this.name = 'ExportNotFoundError';
    }

}

export class ExportService {

    constructor(
        db,
        pluginService
    ) {

        this.repository =
            new ExportRepository(
                db
            );

        this.pluginService =
            pluginService;

    }

    buildApplicationExport() {

        const plugins =
            this.repository.findPlugins();

        return this.buildExportDocument(
            'application',
            plugins
        );

    }

    buildCollectionExport(pluginId) {

        const plugin =
            this.getExportablePlugin(
                pluginId
            );

        return this.buildExportDocument(
            'collection',
            [
                plugin
            ]
        );

    }

    buildCollectionCsv(pluginId) {

        const plugin =
            this.getExportablePlugin(
                pluginId
            );

        const schema =
            this.pluginService.getById(
                plugin.code
            );

        const fields =
            schema?.fields ?? [];

        const items =
            this.repository.findItemsByPluginId(
                plugin.id
            );

        const headers = [
            'source_id',
            'title',
            'description',
            'created_at',
            'updated_at',
            ...fields.map(
                field => field.name
            )
        ];

        const rows =
            items.map(
                item => headers.map(
                    header => getCsvValue(
                        item,
                        header
                    )
                )
            );

        return [
            headers,
            ...rows
        ]
            .map(
                row => row
                    .map(escapeCsvCell)
                    .join(',')
            )
            .join('\r\n') + '\r\n';

    }

    buildJsonFilename(pluginId = null) {

        if (
            pluginId
        ) {

            return `collectionmgnt-${sanitizeFilenamePart(pluginId)}-${getExportDate()}.json`;

        }

        return `collectionmgnt-export-${getExportDate()}.json`;

    }

    buildCsvFilename(pluginId) {

        return `collectionmgnt-${sanitizeFilenamePart(pluginId)}-${getExportDate()}.csv`;

    }

    getExportablePlugin(pluginId) {

        const plugin =
            this.repository.findPluginByCode(
                pluginId
            );

        const schema =
            this.pluginService.getById(
                pluginId
            );

        if (
            !plugin ||
            !schema
        ) {

            throw new ExportNotFoundError(
                'Plugin not found'
            );

        }

        return plugin;

    }

    buildExportDocument(
        scope,
        plugins
    ) {

        return {
            format:
                EXPORT_FORMAT,
            format_version:
                EXPORT_FORMAT_VERSION,
            exported_at:
                new Date().toISOString(),
            scope,
            includes_media_files:
                false,
            plugins:
                plugins.map(
                    mapPlugin
                ),
            schemas:
                plugins.map(
                    plugin => mapSchema(
                        this.pluginService.getById(
                            plugin.code
                        )
                    )
                ).filter(Boolean),
            settings:
                scope === 'application'
                    ? this.repository.findSettings()
                        .filter(
                            setting => !isSensitiveSettingKey(
                                setting.key
                            )
                        )
                        .map(mapSetting)
                    : [],
            collections:
                plugins.map(
                    plugin => this.buildCollection(
                        plugin
                    )
                )
        };

    }

    buildCollection(plugin) {

        return {
            plugin:
                plugin.code,
            plugin_name:
                plugin.display_name,
            items:
                this.repository
                    .findItemsByPluginId(
                        plugin.id
                    )
                    .map(mapItem),
            media:
                this.repository
                    .findMediaByPluginId(
                        plugin.id
                    )
                    .map(mapMedia)
        };

    }

}

function mapPlugin(plugin) {

    return {
        source_id:
            plugin.id,
        code:
            plugin.code,
        display_name:
            plugin.display_name,
        version:
            plugin.version,
        enabled:
            Boolean(plugin.enabled),
        supports_images:
            Boolean(plugin.supports_images),
        supports_loans:
            Boolean(plugin.supports_loans),
        installed_at:
            plugin.installed_at
    };

}

function mapSchema(schema) {

    if (
        !schema
    ) {

        return null;

    }

    return {
        plugin:
            schema.id,
        plugin_name:
            schema.name,
        version:
            schema.version,
        fields:
            schema.fields
    };

}

function mapSetting(setting) {

    return {
        key:
            setting.key,
        value:
            parseJsonIfPossible(
                setting.value
            ),
        updated_at:
            setting.updated_at
    };

}

function mapItem(item) {

    return {
        source_id:
            item.id,
        title:
            item.title,
        description:
            item.description,
        metadata:
            item.metadata,
        created_at:
            item.created_at,
        updated_at:
            item.updated_at
    };

}

function mapMedia(media) {

    return {
        source_id:
            media.id,
        item_source_id:
            media.item_id,
        filename:
            media.filename,
        mime_type:
            media.mime_type,
        size:
            media.size,
        is_primary:
            Boolean(media.is_primary),
        created_at:
            media.created_at,
        original_url:
            `/api/media/${media.id}/file`,
        thumbnail_url:
            `/api/media/${media.id}/thumb`
    };

}

function getCsvValue(
    item,
    header
) {

    if (
        header === 'source_id'
    ) {

        return item.id;

    }

    if (
        [
            'title',
            'description',
            'created_at',
            'updated_at'
        ].includes(header)
    ) {

        return item[header];

    }

    return item.metadata?.[header];

}

function escapeCsvCell(value) {

    if (
        value === undefined ||
        value === null
    ) {

        return '';

    }

    if (
        typeof value === 'boolean'
    ) {

        return value
            ? 'true'
            : 'false';

    }

    const stringValue =
        typeof value === 'object'
            ? JSON.stringify(value)
            : String(value);

    if (
        /[",\r\n]/.test(
            stringValue
        )
    ) {

        return `"${stringValue.replaceAll('"', '""')}"`;

    }

    return stringValue;

}

function isSensitiveSettingKey(key) {

    return /password|secret|token|credential|private/i.test(
        key
    );

}

function parseJsonIfPossible(value) {

    try {

        return JSON.parse(
            value
        );

    } catch {

        return value;

    }

}

function getExportDate() {

    return new Date()
        .toISOString()
        .slice(
            0,
            10
        );

}

function sanitizeFilenamePart(value) {

    return String(value)
        .replaceAll(
            /[^a-z0-9_-]/gi,
            '-'
        )
        .replaceAll(
            /-+/g,
            '-'
        )
        .replace(
            /^-|-$/g,
            ''
        )
        .toLowerCase() || 'collection';

}
