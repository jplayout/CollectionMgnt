import {
    apiFetch
} from './api.js';

export function getSystemSummary() {

    return apiFetch(
        '/api/admin/system-summary'
    );

}

export function runMediaAudit() {

    return apiFetch(
        '/api/admin/media-audit'
    );

}

export function previewMediaCleanup() {

    return apiFetch(
        '/api/admin/media-cleanup/preview',
        {
            method:
                'POST'
        }
    );

}

export function executeMediaCleanup(candidateIds) {

    return apiFetch(
        '/api/admin/media-cleanup/execute',
        {
            method:
                'POST',
            body: {
                candidateIds
            }
        }
    );

}

export function importNativeJson(file) {

    const formData =
        new FormData();

    formData.append(
        'file',
        file
    );

    return apiFetch(
        '/api/admin/imports/native-json',
        {
            method:
                'POST',
            body:
                formData
        }
    );

}
