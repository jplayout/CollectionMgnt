import {
    apiFetch
} from './api.js';

export function getPlugins() {

    return apiFetch(
        '/api/plugins'
    );

}

export function getPluginSchema(
    pluginId
) {

    return apiFetch(
        `/api/plugins/${pluginId}/schema`
    );

}

export function getDisplayPreferences(
    pluginId
) {

    return apiFetch(
        `/api/plugins/${pluginId}/display-preferences`
    );

}

export function updateDisplayPreferences(
    pluginId,
    payload
) {

    return apiFetch(
        `/api/plugins/${pluginId}/display-preferences`,
        {
            method:
                'PUT',
            body:
                payload
        }
    );

}

export function resetDisplayPreferences(
    pluginId
) {

    return apiFetch(
        `/api/plugins/${pluginId}/display-preferences`,
        {
            method:
                'DELETE'
        }
    );

}
