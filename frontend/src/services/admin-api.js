import {
    ApiError,
    apiFetch
} from './api.js';

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ?? '';

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

export async function downloadBackupZip() {

    const response =
        await fetch(
            `${API_BASE_URL}/api/admin/backup.zip`,
            {
                headers:
                    getAuthHeaders()
            }
        );

    if (
        !response.ok
    ) {

        throw await buildDownloadError(
            response
        );

    }

    const blob =
        await response.blob();

    const filename =
        getFilenameFromContentDisposition(
            response.headers.get(
                'Content-Disposition'
            )
        ) ?? 'collectionmgnt-backup.zip';

    triggerDownload(
        blob,
        filename
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

function getAuthHeaders() {

    const headers =
        new Headers();

    const token =
        sessionStorage.getItem(
            'auth_token'
        );

    if (
        token
    ) {

        headers.set(
            'Authorization',
            `Bearer ${token}`
        );

    }

    return headers;

}

async function buildDownloadError(response) {

    const text =
        await response.text();

    let payload =
        text;

    try {

        payload =
            JSON.parse(
                text
            );

    } catch {

        payload =
            text;

    }

    return new ApiError(
        getErrorMessage(
            payload,
            response.statusText
        ),
        response.status,
        payload
    );

}

function getErrorMessage(
    payload,
    fallback
) {

    if (
        payload?.error
    ) {

        return payload.error;

    }

    if (
        Array.isArray(payload?.errors)
    ) {

        return payload.errors.join(
            ', '
        );

    }

    return fallback || 'Téléchargement impossible';

}

function getFilenameFromContentDisposition(header) {

    if (
        !header
    ) {

        return null;

    }

    const filenameStarMatch =
        header.match(
            /filename\*=UTF-8''([^;]+)/i
        );

    if (
        filenameStarMatch
    ) {

        return decodeURIComponent(
            filenameStarMatch[1]
        );

    }

    const filenameMatch =
        header.match(
            /filename="?([^";]+)"?/i
        );

    return filenameMatch?.[1] ?? null;

}

function triggerDownload(
    blob,
    filename
) {

    const url =
        URL.createObjectURL(
            blob
        );

    const link =
        document.createElement(
            'a'
        );

    link.href =
        url;

    link.download =
        filename;

    document.body.append(
        link
    );

    link.click();

    link.remove();

    URL.revokeObjectURL(
        url
    );

}
