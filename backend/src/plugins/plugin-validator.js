import { PluginValidationError } from './plugin-errors.js';

const SUPPORTED_FIELD_TYPES = [
    'text',
    'textarea',
    'number',
    'date',
    'checkbox',
    'select',
    'multiselect',
    'url',
    'email',
    'rating',
    'barcode',
    'isbn',
    'image'
];

export function validateManifest(manifest) {

    if (!manifest.id) {
        throw new PluginValidationError(
            'unknown',
            'Missing plugin id'
        );
    }

    if (!manifest.name) {
        throw new PluginValidationError(
            manifest.id,
            'Missing plugin name'
        );
    }

    if (!manifest.version) {
        throw new PluginValidationError(
            manifest.id,
            'Missing plugin version'
        );
    }

    return true;
}

export function validateFields(pluginId, fields) {

    if (!Array.isArray(fields)) {
        throw new PluginValidationError(
            pluginId,
            'fields.json must be an array'
        );
    }

    for (const field of fields) {

        if (!field.name) {
            throw new PluginValidationError(
                pluginId,
                'Field name is required'
            );
        }

        if (!field.type) {
            throw new PluginValidationError(
                pluginId,
                `Field ${field.name} has no type`
            );
        }

        if (!SUPPORTED_FIELD_TYPES.includes(field.type)) {
            throw new PluginValidationError(
                pluginId,
                `Unsupported field type ${field.type}`
            );
        }
    }

    return true;
}