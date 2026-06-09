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
