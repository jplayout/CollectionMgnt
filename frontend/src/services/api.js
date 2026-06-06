const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ?? '';

export class ApiError extends Error {

    constructor(
        message,
        status,
        payload
    ) {

        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.payload = payload;

    }

}

export async function apiFetch(
    path,
    options = {}
) {

    const headers =
        new Headers(
            options.headers ?? {}
        );

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

    if (
        options.body !== undefined &&
        !headers.has('Content-Type') &&
        !(options.body instanceof FormData)
    ) {

        headers.set(
            'Content-Type',
            'application/json'
        );

    }

    const response =
        await fetch(
            `${API_BASE_URL}${path}`,
            {
                ...getFetchOptions(
                    options
                ),
                headers,
                body:
                    stringifyBody(
                        options.body
                    )
            }
        );

    const payload =
        await parseResponse(
            response,
            options.responseType
        );

    if (
        !response.ok
    ) {

        throw new ApiError(
            getErrorMessage(
                payload,
                response.statusText
            ),
            response.status,
            payload
        );

    }

    return payload;

}

function getFetchOptions(
    options
) {

    const {
        responseType,
        ...fetchOptions
    } = options;

    return fetchOptions;

}

function stringifyBody(
    body
) {

    if (
        body === undefined ||
        typeof body === 'string' ||
        body instanceof FormData
    ) {

        return body;

    }

    return JSON.stringify(
        body
    );

}

async function parseResponse(
    response,
    responseType
) {

    if (
        response.status === 204
    ) {

        return null;

    }

    const text =
        response.ok &&
        responseType === 'blob'
            ? null
            : await response.text();

    if (
        response.ok &&
        responseType === 'blob'
    ) {

        return response.blob();

    }

    if (
        !text
    ) {

        return null;

    }

    try {

        return JSON.parse(
            text
        );

    } catch {

        return text;

    }

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

    return fallback || 'Request failed';

}
