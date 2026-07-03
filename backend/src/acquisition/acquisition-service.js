import {
    AcquisitionError
} from './errors.js';

import {
    isValidIsbn,
    normalizeIdentifier
} from '../services/item-validator.js';

export class AcquisitionService {

    constructor({
        providerRegistry
    }) {

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

        const results =
            await provider.lookupIsbn(
                normalizedIsbn
            );

        return {
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

    }

}

