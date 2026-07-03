import {
    AcquisitionError
} from './errors.js';

import {
    isValidIsbn,
    normalizeIdentifier
} from '../services/item-validator.js';

export class AcquisitionService {

    constructor({
        acquisitionCache = null,
        providerRegistry
    }) {

        this.acquisitionCache =
            acquisitionCache;

        this.providerRegistry =
            providerRegistry;

    }

    listProviders() {

        return this.providerRegistry.listProviders();

    }

    async lookupBookByIsbn({
        isbn,
        providerId = null
    }) {

        if (
            typeof isbn !== 'string' ||
            !isValidIsbn(
                isbn
            )
        ) {

            throw new AcquisitionError(
                400,
                'invalid_isbn',
                'ISBN must be a valid ISBN-10 or ISBN-13'
            );

        }

        const normalizedIsbn =
            normalizeIdentifier(
                isbn
            );

        const provider =
            providerId
                ? this.providerRegistry.getProvider(
                    providerId
                )
                : this.providerRegistry.getDefaultProviderFor({
                    capability:
                        'isbnLookup',
                    plugin:
                        'books'
                });

        const resolvedProviderId =
            provider.describe().id;

        const cacheContext = {
            capability:
                'isbnLookup',
            identifier:
                normalizedIsbn,
            plugin:
                'books',
            providerId:
                resolvedProviderId
        };

        const cachedResponse =
            this.acquisitionCache?.get(
                cacheContext
            );

        if (
            cachedResponse
        ) {

            return cachedResponse;

        }

        const results =
            await provider.lookupIsbn(
                normalizedIsbn
            );

        const response = {
            query: {
                plugin:
                    'books',
                type:
                    'isbn',
                value:
                    normalizedIsbn
            },
            results
        };

        this.acquisitionCache?.set({
            ...cacheContext,
            response
        });

        return response;

    }

}
