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
