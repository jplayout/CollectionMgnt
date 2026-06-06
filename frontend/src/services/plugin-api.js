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
