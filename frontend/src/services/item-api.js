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
