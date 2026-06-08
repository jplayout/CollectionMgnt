const DISPLAY_PREFERENCES_PREFIX =
    'displayPreferences';

const ALLOWED_DENSITIES =
    new Set([
        'comfortable',
        'compact'
    ]);

export class DisplayPreferencesValidationError extends Error {

    constructor(message) {
        super(message);
        this.name =
            'DisplayPreferencesValidationError';
    }

}

export class DisplayPreferencesService {

    constructor(settingsRepository) {
        this.settingsRepository =
            settingsRepository;
    }

    get(plugin) {

        const defaults =
            buildDefaultPreferences(plugin);

        const savedPreferences =
            this.getSavedPreferences(
                plugin.id
            );

        if (!savedPreferences) {
            return defaults;
        }

        return normalizePreferences(
            savedPreferences,
            plugin,
            defaults
        );

    }

    save(plugin, preferences) {

        const normalizedPreferences =
            normalizePreferences(
                preferences,
                plugin,
                buildDefaultPreferences(plugin)
            );

        this.settingsRepository.setJson(
            getSettingsKey(plugin.id),
            normalizedPreferences
        );

        return normalizedPreferences;

    }

    reset(plugin) {

        this.settingsRepository.delete(
            getSettingsKey(plugin.id)
        );

        return buildDefaultPreferences(plugin);

    }

    getSavedPreferences(pluginId) {

        try {

            return this.settingsRepository.getJson(
                getSettingsKey(pluginId)
            );

        } catch {

            throw new DisplayPreferencesValidationError(
                'Saved display preferences are invalid JSON'
            );

        }

    }

}

function buildDefaultPreferences(plugin) {

    const fieldNames =
        getFieldNames(plugin);

    return {
        list: {
            highlightedFields:
                fieldNames.slice(
                    0,
                    3
                ),
            density:
                'comfortable'
        },
        details: {
            fieldOrder:
                fieldNames,
            hiddenFields:
                []
        }
    };

}

function normalizePreferences(
    preferences,
    plugin,
    defaults
) {

    if (
        !isPlainObject(preferences)
    ) {

        throw new DisplayPreferencesValidationError(
            'Display preferences must be an object'
        );

    }

    const knownFieldNames =
        new Set(
            getFieldNames(plugin)
        );

    return {
        list:
            normalizeListPreferences(
                preferences.list,
                defaults.list,
                knownFieldNames
            ),
        details:
            normalizeDetailsPreferences(
                preferences.details,
                defaults.details,
                knownFieldNames
            )
    };

}

function normalizeListPreferences(
    preferences,
    defaults,
    knownFieldNames
) {

    if (
        preferences === undefined
    ) {

        return {
            ...defaults
        };

    }

    if (
        !isPlainObject(preferences)
    ) {

        throw new DisplayPreferencesValidationError(
            'list preferences must be an object'
        );

    }

    const highlightedFields =
        preferences.highlightedFields === undefined
            ? defaults.highlightedFields
            : validateFieldNameArray(
                preferences.highlightedFields,
                knownFieldNames,
                'list.highlightedFields'
            );

    const density =
        preferences.density === undefined
            ? defaults.density
            : validateDensity(
                preferences.density
            );

    return {
        highlightedFields,
        density
    };

}

function normalizeDetailsPreferences(
    preferences,
    defaults,
    knownFieldNames
) {

    if (
        preferences === undefined
    ) {

        return {
            fieldOrder:
                [...defaults.fieldOrder],
            hiddenFields:
                [...defaults.hiddenFields]
        };

    }

    if (
        !isPlainObject(preferences)
    ) {

        throw new DisplayPreferencesValidationError(
            'details preferences must be an object'
        );

    }

    const fieldOrder =
        preferences.fieldOrder === undefined
            ? defaults.fieldOrder
            : validateFieldNameArray(
                preferences.fieldOrder,
                knownFieldNames,
                'details.fieldOrder'
            );

    const hiddenFields =
        preferences.hiddenFields === undefined
            ? defaults.hiddenFields
            : validateFieldNameArray(
                preferences.hiddenFields,
                knownFieldNames,
                'details.hiddenFields'
            );

    return {
        fieldOrder,
        hiddenFields
    };

}

function validateFieldNameArray(
    value,
    knownFieldNames,
    path
) {

    if (
        !Array.isArray(value)
    ) {

        throw new DisplayPreferencesValidationError(
            `${path} must be an array`
        );

    }

    const seenFieldNames =
        new Set();

    for (
        const fieldName
        of value
    ) {

        if (
            typeof fieldName !== 'string' ||
            fieldName.trim() === ''
        ) {

            throw new DisplayPreferencesValidationError(
                `${path} must contain field names`
            );

        }

        if (
            !knownFieldNames.has(fieldName)
        ) {

            throw new DisplayPreferencesValidationError(
                `Unknown field "${fieldName}" in ${path}`
            );

        }

        seenFieldNames.add(fieldName);

    }

    return Array.from(
        seenFieldNames
    );

}

function validateDensity(value) {

    if (
        !ALLOWED_DENSITIES.has(value)
    ) {

        throw new DisplayPreferencesValidationError(
            'list.density must be "comfortable" or "compact"'
        );

    }

    return value;

}

function getSettingsKey(pluginId) {

    return `${DISPLAY_PREFERENCES_PREFIX}.${pluginId}`;

}

function getFieldNames(plugin) {

    return plugin.fields.map(
        field => field.name
    );

}

function isPlainObject(value) {

    return value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value);

}
