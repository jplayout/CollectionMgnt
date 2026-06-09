import {
    ApiError
} from './api.js';

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ?? '';

export async function downloadApplicationExport() {

    await downloadExport(
        '/api/exports/application.json',
        'collectionmgnt-export.json'
    );

}

export async function downloadCollectionJsonExport(pluginId) {

    await downloadExport(
        `/api/exports/collections/${encodeURIComponent(pluginId)}.json`,
        `collectionmgnt-${pluginId}.json`
    );

}

export async function downloadCollectionCsvExport(pluginId) {

    await downloadExport(
        `/api/exports/collections/${encodeURIComponent(pluginId)}.csv`,
        `collectionmgnt-${pluginId}.csv`
    );

}

async function downloadExport(
    path,
    fallbackFilename
) {

    const response =
        await fetch(
            `${API_BASE_URL}${path}`,
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
        ) ?? fallbackFilename;

    triggerDownload(
        blob,
        filename
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

    return fallback || 'Export impossible';

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
