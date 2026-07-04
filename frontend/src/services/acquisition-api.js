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
