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

        const resolution =
            this.resolveProviders({
                capability:
                    'isbnLookup',
                plugin:
                    'books',
                providerId
            });

        const emptyResponse =
            createLookupResponse(
                normalizedIsbn,
                []
            );

        let lastTechnicalError =
            null;

        let hasEmptyResponse =
            false;

        for (
            const provider
            of resolution.providers
        ) {

            try {

                const response =
                    await this.lookupBookByIsbnWithProvider({
                        isbn:
                            normalizedIsbn,
                        provider
                    });

                if (
                    resolution.explicit ||
                    response.results.length > 0
                ) {

                    return response;

                }

                hasEmptyResponse =
                    true;

            } catch (error) {

                if (
                    resolution.explicit ||
                    !isTechnicalProviderError(
                        error
                    )
                ) {

                    throw error;

                }

                lastTechnicalError =
                    error;

            }

        }

        if (
            hasEmptyResponse
        ) {

            return emptyResponse;

        }

        if (
            lastTechnicalError
        ) {

            throw lastTechnicalError;

        }

        return emptyResponse;

    }

    resolveProviders({
        capability,
        plugin,
        providerId = null
    }) {

        if (
            providerId
        ) {

            return {
                explicit:
                    true,
                providers: [
                    this.providerRegistry.getProvider(
                        providerId
                    )
                ]
            };

        }

        const providers =
            this.providerRegistry.getProvidersFor({
                capability,
                plugin
            });

        if (
            providers.length === 0
        ) {

            this.providerRegistry.getDefaultProviderFor({
                capability,
                plugin
            });

        }

        return {
            explicit:
                false,
            providers
        };

    }

    async lookupBookByIsbnWithProvider({
        isbn,
        provider
    }) {

        const resolvedProviderId =
            provider.describe().id;

        const cacheContext = {
            capability:
                'isbnLookup',
            identifier:
                isbn,
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
                isbn
            );

        const response =
            createLookupResponse(
                isbn,
                results
            );

        this.acquisitionCache?.set({
            ...cacheContext,
            response
        });

        return response;

    }

}

function createLookupResponse(
    isbn,
    results
) {

    return {
        query: {
            plugin:
                'books',
            type:
                'isbn',
            value:
                isbn
        },
        results
    };

}

function isTechnicalProviderError(error) {

    return error instanceof AcquisitionError &&
        [
            'provider_error',
            'provider_timeout'
        ].includes(
            error.code
        );

}
