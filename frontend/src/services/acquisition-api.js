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

