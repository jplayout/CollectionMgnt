import {
    apiFetch
} from './api.js';

export function getItems(
    filters = {}
) {

    const query =
        new URLSearchParams();

    for (
        const [key, value]
        of Object.entries(
            filters
        )
    ) {

        if (
            value !== undefined &&
            value !== null &&
            value !== ''
        ) {

            query.set(
                key,
                String(value)
            );

        }

    }

    const queryString =
        query.toString();

    return apiFetch(
        `/api/items${queryString ? `?${queryString}` : ''}`
    );

}

export function getItem(
    id
) {

    return apiFetch(
        `/api/items/${id}`
    );

}

export function createItem(
    payload
) {

    return apiFetch(
        '/api/items',
        {
            method:
                'POST',
            body:
                payload
        }
    );

}

export function updateItem(
    id,
    payload
) {

    return apiFetch(
        `/api/items/${id}`,
        {
            method:
                'PATCH',
            body:
                payload
        }
    );

}

export function deleteItem(
    id
) {

    return apiFetch(
        `/api/items/${id}`,
        {
            method:
                'DELETE'
        }
    );

}
