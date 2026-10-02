import {
    apiFetch
} from './api.js';

export function getAcquisitionProviders() {

    return apiFetch(
        '/api/acquisition/providers'
    );

}

export function lookupBookByIsbn({
    isbn
}) {

    return apiFetch(
        '/api/acquisition/books/isbn/lookup',
        {
            method:
                'POST',
            body: {
                isbn
            }
        }
    );

}

export function searchMovies({
    language = null,
    provider = null,
    query,
    region = null,
    year = null
}) {

    return apiFetch(
        '/api/acquisition/movies/search',
        {
            method:
                'POST',
            body: {
                language,
                provider,
                query,
                region,
                year
            }
        }
    );

}

export function searchGames({
    platform = null,
    provider = null,
    query,
    year = null
}) {

    return apiFetch(
        '/api/acquisition/games/search',
        {
            method:
                'POST',
            body: {
                platform,
                provider,
                query,
                year
            }
        }
    );

}

export function importAcquisitionImage({
    imageUrl,
    isPrimary = false,
    itemId,
    provider = null,
    source = null
}) {

    return apiFetch(
        '/api/acquisition/images/import',
        {
            method:
                'POST',
            body: {
                imageUrl,
                isPrimary,
                itemId,
                provider,
                source
            }
        }
    );

}

const pendingMediaSearches = new Map();

function canonicalQuery(value) {
    if (Array.isArray(value)) return value.map(canonicalQuery);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => [key, canonicalQuery(entry)]));
    return value;
}

export function searchAcquisitionMedia(query) {
    const key = JSON.stringify([sessionStorage.getItem('auth_token'), canonicalQuery(query)]);
    if (pendingMediaSearches.has(key)) return pendingMediaSearches.get(key);
    const pending = apiFetch('/api/acquisition/media/search', { method: 'POST', body: query })
        .finally(() => pendingMediaSearches.delete(key));
    pendingMediaSearches.set(key, pending);
    return pending;
}
