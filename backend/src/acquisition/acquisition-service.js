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

    async searchMovies({
        language = null,
        providerId = null,
        query,
        region = null,
        year = null
    }) {

        const searchQuery =
            normalizeTextSearchQuery({
                language,
                query,
                region,
                year
            });

        const resolution =
            this.resolveProviders({
                capability:
                    'movies/search',
                plugin:
                    'movies',
                providerId
            });

        const emptyResponse =
            createSearchResponse(
                searchQuery,
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
                    await this.searchMoviesWithProvider({
                        provider,
                        searchQuery
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

    async searchMoviesWithProvider({
        provider,
        searchQuery
    }) {

        const resolvedProviderId =
            provider.describe().id;

        const cacheContext = {
            capability:
                'movies/search',
            identifier:
                buildSearchCacheIdentifier(
                    searchQuery
                ),
            plugin:
                'movies',
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
            await provider.searchMovies(
                searchQuery
            );

        const response =
            createSearchResponse(
                searchQuery,
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

function createSearchResponse(
    searchQuery,
    results
) {

    return {
        query: {
            language:
                searchQuery.language,
            plugin:
                'movies',
            region:
                searchQuery.region,
            type:
                'text',
            value:
                searchQuery.query,
            year:
                searchQuery.year
        },
        results
    };

}

function normalizeTextSearchQuery({
    language,
    query,
    region,
    year
}) {

    const normalizedQuery =
        typeof query === 'string'
            ? query.trim().replace(
                /\s+/g,
                ' '
            )
            : '';

    if (
        !normalizedQuery
    ) {

        throw new AcquisitionError(
            400,
            'invalid_search_query',
            'Search query must not be empty'
        );

    }

    return {
        language:
            normalizeOptionalText(
                language
            ),
        query:
            normalizedQuery,
        region:
            normalizeOptionalText(
                region
            ),
        year:
            normalizeOptionalText(
                year
            )
    };

}

function normalizeOptionalText(value) {

    if (
        typeof value !== 'string'
    ) {

        return null;

    }

    const normalized =
        value.trim();

    return normalized ||
        null;

}

function buildSearchCacheIdentifier(searchQuery) {

    return new URLSearchParams({
        language:
            searchQuery.language ?? '',
        query:
            searchQuery.query,
        region:
            searchQuery.region ?? '',
        year:
            searchQuery.year ?? ''
    }).toString();

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
