import assert from 'node:assert/strict';
import {
    test
} from 'node:test';

import { AcquisitionCache } from '../../src/acquisition/acquisition-cache.js';
import { AcquisitionError } from '../../src/acquisition/errors.js';
import { AcquisitionService } from '../../src/acquisition/acquisition-service.js';
import { AcquisitionProviderRegistry } from '../../src/acquisition/provider-registry.js';

test(
    'AcquisitionService uses the default provider for ISBN lookup',
    async () => {

        const provider =
            createProvider({
                id:
                    'default-provider',
                results: [
                    {
                        provider:
                            'default-provider',
                        title:
                            'Default result'
                    }
                ]
            });

        const service =
            createService([
                provider
            ]);

        const result =
            await service.lookupBookByIsbn({
                isbn:
                    '978-0-140-32872-1'
            });

        assert.deepEqual(
            provider.calls,
            [
                '9780140328721'
            ]
        );

        assert.deepEqual(
            result,
            {
                query: {
                    plugin:
                        'books',
                    type:
                        'isbn',
                    value:
                        '9780140328721'
                },
                results: [
                    {
                        provider:
                            'default-provider',
                        title:
                            'Default result'
                    }
                ]
            }
        );

    }
);

test(
    'AcquisitionService uses the first implicit provider with results and does not call the next provider',
    async () => {

        const firstProvider =
            createProvider({
                id:
                    'first-provider',
                results: [
                    {
                        provider:
                            'first-provider',
                        title:
                            'First result'
                    }
                ]
            });

        const secondProvider =
            createProvider({
                id:
                    'second-provider',
                results: [
                    {
                        provider:
                            'second-provider',
                        title:
                            'Second result'
                    }
                ]
            });

        const service =
            createService([
                firstProvider,
                secondProvider
            ]);

        const result =
            await service.lookupBookByIsbn({
                isbn:
                    '9780140328721'
            });

        assert.deepEqual(
            firstProvider.calls,
            [
                '9780140328721'
            ]
        );

        assert.deepEqual(
            secondProvider.calls,
            []
        );

        assert.equal(
            result.results[0].provider,
            'first-provider'
        );

    }
);

test(
    'AcquisitionService uses an explicit provider when requested',
    async () => {

        const firstProvider =
            createProvider({
                id:
                    'first-provider'
            });

        const explicitProvider =
            createProvider({
                id:
                    'explicit-provider',
                results: [
                    {
                        provider:
                            'explicit-provider',
                        title:
                            'Explicit result'
                    }
                ]
            });

        const service =
            createService([
                firstProvider,
                explicitProvider
            ]);

        const result =
            await service.lookupBookByIsbn({
                isbn:
                    '9780140328721',
                providerId:
                    'explicit-provider'
            });

        assert.deepEqual(
            firstProvider.calls,
            []
        );

        assert.deepEqual(
            explicitProvider.calls,
            [
                '9780140328721'
            ]
        );

        assert.equal(
            result.results[0].provider,
            'explicit-provider'
        );

    }
);

test(
    'AcquisitionService rejects unknown explicit providers',
    async () => {

        const service =
            createService([
                createProvider({
                    id:
                        'default-provider'
                })
            ]);

        await assert.rejects(
            () => service.lookupBookByIsbn({
                isbn:
                    '9780140328721',
                providerId:
                    'missing-provider'
            }),
            {
                code:
                    'provider_not_found',
                statusCode:
                    404
            }
        );

    }
);

test(
    'AcquisitionService rejects disabled explicit providers',
    async () => {

        const service =
            createService([
                createProvider({
                    enabled:
                        false,
                    id:
                        'disabled-provider'
                })
            ]);

        await assert.rejects(
            () => service.lookupBookByIsbn({
                isbn:
                    '9780140328721',
                providerId:
                    'disabled-provider'
            }),
            {
                code:
                    'provider_unavailable',
                statusCode:
                    503
            }
        );

    }
);

test(
    'AcquisitionService rejects invalid ISBN values before provider lookup',
    async () => {

        const provider =
            createProvider({
                id:
                    'default-provider'
            });

        const service =
            createService([
                provider
            ]);

        await assert.rejects(
            () => service.lookupBookByIsbn({
                isbn:
                    '9780140328722'
            }),
            {
                code:
                    'invalid_isbn',
                statusCode:
                    400
            }
        );

        assert.deepEqual(
            provider.calls,
            []
        );

    }
);

test(
    'AcquisitionService returns empty results from the selected provider',
    async () => {

        const service =
            createService([
                createProvider({
                    id:
                        'default-provider',
                    results:
                        []
                })
            ]);

        const result =
            await service.lookupBookByIsbn({
                isbn:
                    '9780140328721'
            });

        assert.deepEqual(
            result.results,
            []
        );

    }
);

test(
    'AcquisitionService propagates provider timeout errors',
    async () => {

        const service =
            createService([
                createProvider({
                    error: Object.assign(
                        new Error(
                            'Provider timeout'
                        ),
                        {
                            code:
                                'provider_timeout',
                            statusCode:
                                504
                        }
                    ),
                    id:
                        'default-provider'
                })
            ]);

        await assert.rejects(
            () => service.lookupBookByIsbn({
                isbn:
                    '9780140328721'
            }),
            {
                code:
                    'provider_timeout',
                statusCode:
                    504
            }
        );

    }
);

test(
    'AcquisitionService falls back to the next implicit provider when the first returns no results',
    async () => {

        const firstProvider =
            createProvider({
                id:
                    'first-provider',
                results:
                    []
            });

        const secondProvider =
            createProvider({
                id:
                    'second-provider',
                results: [
                    {
                        provider:
                            'second-provider',
                        title:
                            'Fallback result'
                    }
                ]
            });

        const service =
            createService([
                firstProvider,
                secondProvider
            ]);

        const result =
            await service.lookupBookByIsbn({
                isbn:
                    '9780140328721'
            });

        assert.deepEqual(
            firstProvider.calls,
            [
                '9780140328721'
            ]
        );

        assert.deepEqual(
            secondProvider.calls,
            [
                '9780140328721'
            ]
        );

        assert.equal(
            result.results[0].provider,
            'second-provider'
        );

    }
);

test(
    'AcquisitionService ignores empty cache from one implicit provider and calls the next provider',
    async () => {

        const firstProvider =
            createProvider({
                id:
                    'first-provider',
                results: [
                    {
                        provider:
                            'first-provider',
                        title:
                            'Should not be called'
                    }
                ]
            });

        const secondProvider =
            createProvider({
                id:
                    'second-provider',
                results: [
                    {
                        provider:
                            'second-provider',
                        title:
                            'Fallback result'
                    }
                ]
            });

        const {
            cache
        } =
            createCache();

        cache.set({
            capability:
                'isbnLookup',
            identifier:
                '9780140328721',
            plugin:
                'books',
            providerId:
                'first-provider',
            response:
                createLookupResponse(
                    '9780140328721',
                    []
                )
        });

        const service =
            createService(
                [
                    firstProvider,
                    secondProvider
                ],
                {
                    acquisitionCache:
                        cache
                }
            );

        const result =
            await service.lookupBookByIsbn({
                isbn:
                    '9780140328721'
            });

        assert.deepEqual(
            firstProvider.calls,
            []
        );

        assert.deepEqual(
            secondProvider.calls,
            [
                '9780140328721'
            ]
        );

        assert.equal(
            result.results[0].provider,
            'second-provider'
        );

    }
);

test(
    'AcquisitionService ignores disabled implicit providers',
    async () => {

        const disabledProvider =
            createProvider({
                enabled:
                    false,
                id:
                    'disabled-provider',
                results: [
                    {
                        provider:
                            'disabled-provider',
                        title:
                            'Disabled result'
                    }
                ]
            });

        const enabledProvider =
            createProvider({
                id:
                    'enabled-provider',
                results: [
                    {
                        provider:
                            'enabled-provider',
                        title:
                            'Enabled result'
                    }
                ]
            });

        const service =
            createService([
                disabledProvider,
                enabledProvider
            ]);

        const result =
            await service.lookupBookByIsbn({
                isbn:
                    '9780140328721'
            });

        assert.deepEqual(
            disabledProvider.calls,
            []
        );

        assert.deepEqual(
            enabledProvider.calls,
            [
                '9780140328721'
            ]
        );

        assert.equal(
            result.results[0].provider,
            'enabled-provider'
        );

    }
);

test(
    'AcquisitionService tries the next implicit provider after provider timeout or error',
    async () => {

        const failingProvider =
            createProvider({
                error:
                    new AcquisitionError(
                        504,
                        'provider_timeout',
                        'Provider timeout'
                    ),
                id:
                    'timeout-provider'
            });

        const nextProvider =
            createProvider({
                id:
                    'next-provider',
                results: [
                    {
                        provider:
                            'next-provider',
                        title:
                            'Recovered result'
                    }
                ]
            });

        const service =
            createService([
                failingProvider,
                nextProvider
            ]);

        const result =
            await service.lookupBookByIsbn({
                isbn:
                    '9780140328721'
            });

        assert.deepEqual(
            failingProvider.calls,
            [
                '9780140328721'
            ]
        );

        assert.deepEqual(
            nextProvider.calls,
            [
                '9780140328721'
            ]
        );

        assert.equal(
            result.results[0].provider,
            'next-provider'
        );

    }
);

test(
    'AcquisitionService returns empty results when all implicit providers are empty',
    async () => {

        const firstProvider =
            createProvider({
                id:
                    'first-provider',
                results:
                    []
            });

        const secondProvider =
            createProvider({
                id:
                    'second-provider',
                results:
                    []
            });

        const service =
            createService([
                firstProvider,
                secondProvider
            ]);

        const result =
            await service.lookupBookByIsbn({
                isbn:
                    '9780140328721'
            });

        assert.deepEqual(
            firstProvider.calls,
            [
                '9780140328721'
            ]
        );

        assert.deepEqual(
            secondProvider.calls,
            [
                '9780140328721'
            ]
        );

        assert.deepEqual(
            result,
            createLookupResponse(
                '9780140328721',
                []
            )
        );

    }
);

test(
    'AcquisitionService returns a stable error when all implicit providers fail technically',
    async () => {

        const firstProvider =
            createProvider({
                error:
                    new AcquisitionError(
                        504,
                        'provider_timeout',
                        'Provider timeout'
                    ),
                id:
                    'timeout-provider'
            });

        const secondProvider =
            createProvider({
                error:
                    new AcquisitionError(
                        503,
                        'provider_error',
                        'Provider lookup failed'
                    ),
                id:
                    'error-provider'
            });

        const service =
            createService([
                firstProvider,
                secondProvider
            ]);

        await assert.rejects(
            () => service.lookupBookByIsbn({
                isbn:
                    '9780140328721'
            }),
            {
                code:
                    'provider_error',
                statusCode:
                    503
            }
        );

        assert.deepEqual(
            firstProvider.calls,
            [
                '9780140328721'
            ]
        );

        assert.deepEqual(
            secondProvider.calls,
            [
                '9780140328721'
            ]
        );

    }
);

test(
    'AcquisitionService returns empty results when one implicit provider fails and another is empty',
    async () => {

        const failingProvider =
            createProvider({
                error:
                    new AcquisitionError(
                        504,
                        'provider_timeout',
                        'Provider timeout'
                    ),
                id:
                    'timeout-provider'
            });

        const emptyProvider =
            createProvider({
                id:
                    'empty-provider',
                results:
                    []
            });

        const service =
            createService([
                failingProvider,
                emptyProvider
            ]);

        const result =
            await service.lookupBookByIsbn({
                isbn:
                    '9780140328721'
            });

        assert.deepEqual(
            result,
            createLookupResponse(
                '9780140328721',
                []
            )
        );

        assert.deepEqual(
            failingProvider.calls,
            [
                '9780140328721'
            ]
        );

        assert.deepEqual(
            emptyProvider.calls,
            [
                '9780140328721'
            ]
        );

    }
);

test(
    'AcquisitionService calls provider and writes cache on cache miss',
    async () => {

        const provider =
            createProvider({
                id:
                    'default-provider',
                results: [
                    {
                        provider:
                            'default-provider',
                        title:
                            'Cached result'
                    }
                ]
            });

        const {
            cache,
            repository
        } =
            createCache();

        const service =
            createService(
                [
                    provider
                ],
                {
                    acquisitionCache:
                        cache
                }
            );

        const result =
            await service.lookupBookByIsbn({
                isbn:
                    '9780140328721'
            });

        assert.deepEqual(
            provider.calls,
            [
                '9780140328721'
            ]
        );

        assert.equal(
            repository.rows.size,
            1
        );

        assert.equal(
            result.results[0].title,
            'Cached result'
        );

    }
);

test(
    'AcquisitionService returns cache hits without calling the provider',
    async () => {

        const provider =
            createProvider({
                id:
                    'default-provider',
                results: [
                    {
                        provider:
                            'default-provider',
                        title:
                            'Provider result'
                    }
                ]
            });

        const {
            cache
        } =
            createCache();

        cache.set({
            capability:
                'isbnLookup',
            identifier:
                '9780140328721',
            plugin:
                'books',
            providerId:
                'default-provider',
            response:
                createLookupResponse(
                    '9780140328721',
                    [
                        {
                            provider:
                                'default-provider',
                            title:
                                'Cache result'
                        }
                    ]
                )
        });

        const service =
            createService(
                [
                    provider
                ],
                {
                    acquisitionCache:
                        cache
                }
            );

        const result =
            await service.lookupBookByIsbn({
                isbn:
                    '9780140328721'
            });

        assert.deepEqual(
            provider.calls,
            []
        );

        assert.equal(
            result.results[0].title,
            'Cache result'
        );

    }
);

test(
    'AcquisitionService ignores expired cache entries and replaces them',
    async () => {

        const provider =
            createProvider({
                id:
                    'default-provider',
                results: [
                    {
                        provider:
                            'default-provider',
                        title:
                            'Fresh result'
                    }
                ]
            });

        const {
            cache,
            repository
        } =
            createCache();

        const cacheKey =
            cache.buildKey({
                capability:
                    'isbnLookup',
                identifier:
                    '9780140328721',
                plugin:
                    'books',
                providerId:
                    'default-provider'
            });

        repository.rows.set(
            cacheKey,
            createCacheRow({
                cacheKey,
                expiresAt:
                    '2024-01-01T00:00:00.000Z',
                response:
                    createLookupResponse(
                        '9780140328721',
                        [
                            {
                                title:
                                    'Expired result'
                            }
                        ]
                    )
            })
        );

        const service =
            createService(
                [
                    provider
                ],
                {
                    acquisitionCache:
                        cache
                }
            );

        const result =
            await service.lookupBookByIsbn({
                isbn:
                    '9780140328721'
            });

        assert.deepEqual(
            provider.calls,
            [
                '9780140328721'
            ]
        );

        assert.equal(
            result.results[0].title,
            'Fresh result'
        );

        assert.equal(
            JSON.parse(
                repository.rows.get(
                    cacheKey
                ).response_json
            ).results[0].title,
            'Fresh result'
        );

    }
);

test(
    'AcquisitionService caches empty lookup results',
    async () => {

        const provider =
            createProvider({
                id:
                    'default-provider',
                results:
                    []
            });

        const {
            cache
        } =
            createCache();

        const service =
            createService(
                [
                    provider
                ],
                {
                    acquisitionCache:
                        cache
                }
            );

        await service.lookupBookByIsbn({
            isbn:
                '9780140328721'
        });

        const secondResult =
            await service.lookupBookByIsbn({
                isbn:
                    '9780140328721'
            });

        assert.deepEqual(
            provider.calls,
            [
                '9780140328721'
            ]
        );

        assert.deepEqual(
            secondResult.results,
            []
        );

    }
);

test(
    'AcquisitionService does not cache provider errors',
    async () => {

        const {
            cache,
            repository
        } =
            createCache();

        const service =
            createService(
                [
                    createProvider({
                        error: Object.assign(
                            new Error(
                                'Provider timeout'
                            ),
                            {
                                code:
                                    'provider_timeout',
                                statusCode:
                                    504
                            }
                        ),
                        id:
                            'default-provider'
                    })
                ],
                {
                    acquisitionCache:
                        cache
                }
            );

        await assert.rejects(
            () => service.lookupBookByIsbn({
                isbn:
                    '9780140328721'
            }),
            {
                code:
                    'provider_timeout',
                statusCode:
                    504
            }
        );

        assert.equal(
            repository.rows.size,
            0
        );

    }
);

test(
    'AcquisitionService separates Open Library and Google Books cache keys',
    async () => {

        const defaultProvider =
            createProvider({
                id:
                    'openlibrary',
                results: [
                    {
                        provider:
                            'openlibrary',
                        title:
                            'Open Library result'
                    }
                ]
            });

        const explicitProvider =
            createProvider({
                id:
                    'googlebooks',
                results: [
                    {
                        provider:
                            'googlebooks',
                        title:
                            'Google Books result'
                    }
                ]
            });

        const {
            cache,
            repository
        } =
            createCache();

        const service =
            createService(
                [
                    defaultProvider,
                    explicitProvider
                ],
                {
                    acquisitionCache:
                        cache
                }
            );

        await service.lookupBookByIsbn({
            isbn:
                '9780140328721'
        });

        await service.lookupBookByIsbn({
            isbn:
                '9780140328721',
            providerId:
                'googlebooks'
        });

        assert.deepEqual(
            defaultProvider.calls,
            [
                '9780140328721'
            ]
        );

        assert.deepEqual(
            explicitProvider.calls,
            [
                '9780140328721'
            ]
        );

        assert.deepEqual(
            Array.from(
                repository.rows.keys()
            ).sort(),
            [
                'books:isbnLookup:googlebooks:mapping_v1:9780140328721',
                'books:isbnLookup:openlibrary:mapping_v1:9780140328721'
            ]
        );

    }
);

test(
    'AcquisitionService deletes corrupt cache entries and calls provider',
    async () => {

        const provider =
            createProvider({
                id:
                    'default-provider',
                results: [
                    {
                        provider:
                            'default-provider',
                        title:
                            'Recovered result'
                    }
                ]
            });

        const {
            cache,
            repository
        } =
            createCache();

        const cacheKey =
            cache.buildKey({
                capability:
                    'isbnLookup',
                identifier:
                    '9780140328721',
                plugin:
                    'books',
                providerId:
                    'default-provider'
            });

        repository.rows.set(
            cacheKey,
            {
                cache_key:
                    cacheKey,
                expires_at:
                    '2026-01-08T00:00:00.000Z',
                response_json:
                    '{invalid-json'
            }
        );

        const service =
            createService(
                [
                    provider
                ],
                {
                    acquisitionCache:
                        cache
                }
            );

        const result =
            await service.lookupBookByIsbn({
                isbn:
                    '9780140328721'
            });

        assert.deepEqual(
            repository.deletedKeys,
            [
                cacheKey
            ]
        );

        assert.deepEqual(
            provider.calls,
            [
                '9780140328721'
            ]
        );

        assert.equal(
            result.results[0].title,
            'Recovered result'
        );

    }
);

test(
    'AcquisitionService skips cache writes when response JSON is too large',
    async () => {

        const provider =
            createProvider({
                id:
                    'default-provider',
                results: [
                    {
                        provider:
                            'default-provider',
                        title:
                            'A very long title'
                    }
                ]
            });

        const {
            cache,
            repository
        } =
            createCache({
                maxResponseJsonBytes:
                    10
            });

        const service =
            createService(
                [
                    provider
                ],
                {
                    acquisitionCache:
                        cache
                }
            );

        const result =
            await service.lookupBookByIsbn({
                isbn:
                    '9780140328721'
            });

        assert.equal(
            result.results[0].title,
            'A very long title'
        );

        assert.equal(
            repository.rows.size,
            0
        );

    }
);

test(
    'AcquisitionService searches movies with normalized text query options',
    async () => {

        const provider =
            createMovieSearchProvider({
                id:
                    'movie-provider',
                results: [
                    {
                        provider:
                            'movie-provider',
                        title:
                            'Blade Runner'
                    }
                ]
            });

        const service =
            createService([
                provider
            ]);

        const result =
            await service.searchMovies({
                language:
                    ' fr-FR ',
                query:
                    '  Blade   Runner  ',
                region:
                    ' FR ',
                year:
                    ' 1982 '
            });

        assert.deepEqual(
            provider.calls,
            [
                {
                    language:
                        'fr-FR',
                    query:
                        'Blade Runner',
                    region:
                        'FR',
                    year:
                        '1982'
                }
            ]
        );

        assert.deepEqual(
            result,
            {
                query: {
                    language:
                        'fr-FR',
                    plugin:
                        'movies',
                    region:
                        'FR',
                    type:
                        'text',
                    value:
                        'Blade Runner',
                    year:
                        '1982'
                },
                results: [
                    {
                        provider:
                            'movie-provider',
                        title:
                            'Blade Runner'
                    }
                ]
            }
        );

    }
);

test(
    'AcquisitionService rejects empty movie search queries before provider lookup',
    async () => {

        const provider =
            createMovieSearchProvider({
                id:
                    'movie-provider'
            });

        const service =
            createService([
                provider
            ]);

        await assert.rejects(
            () => service.searchMovies({
                query:
                    '   '
            }),
            {
                code:
                    'invalid_search_query',
                statusCode:
                    400
            }
        );

        assert.deepEqual(
            provider.calls,
            []
        );

    }
);

test(
    'AcquisitionService falls back between implicit movie search providers',
    async () => {

        const emptyProvider =
            createMovieSearchProvider({
                id:
                    'empty-provider',
                results:
                    []
            });

        const resultProvider =
            createMovieSearchProvider({
                id:
                    'result-provider',
                results: [
                    {
                        provider:
                            'result-provider',
                        title:
                            'Alien'
                    }
                ]
            });

        const service =
            createService([
                emptyProvider,
                resultProvider
            ]);

        const result =
            await service.searchMovies({
                query:
                    'Alien'
            });

        assert.equal(
            result.results[0].provider,
            'result-provider'
        );

        assert.equal(
            emptyProvider.calls.length,
            1
        );

        assert.equal(
            resultProvider.calls.length,
            1
        );

    }
);

test(
    'AcquisitionService tries the next implicit movie search provider after technical errors',
    async () => {

        const failingProvider =
            createMovieSearchProvider({
                error:
                    new AcquisitionError(
                        503,
                        'provider_error',
                        'Provider lookup failed'
                    ),
                id:
                    'failing-provider'
            });

        const nextProvider =
            createMovieSearchProvider({
                id:
                    'next-provider',
                results: [
                    {
                        provider:
                            'next-provider',
                        title:
                            'Heat'
                    }
                ]
            });

        const service =
            createService([
                failingProvider,
                nextProvider
            ]);

        const result =
            await service.searchMovies({
                query:
                    'Heat'
            });

        assert.equal(
            result.results[0].provider,
            'next-provider'
        );

        assert.equal(
            failingProvider.calls.length,
            1
        );

        assert.equal(
            nextProvider.calls.length,
            1
        );

    }
);

test(
    'AcquisitionService uses explicit movie search providers without fallback',
    async () => {

        const defaultProvider =
            createMovieSearchProvider({
                id:
                    'default-provider',
                results: [
                    {
                        provider:
                            'default-provider',
                        title:
                            'Default result'
                    }
                ]
            });

        const explicitProvider =
            createMovieSearchProvider({
                id:
                    'explicit-provider',
                results:
                    []
            });

        const service =
            createService([
                defaultProvider,
                explicitProvider
            ]);

        const result =
            await service.searchMovies({
                providerId:
                    'explicit-provider',
                query:
                    'Dune'
            });

        assert.deepEqual(
            result.results,
            []
        );

        assert.deepEqual(
            defaultProvider.calls,
            []
        );

        assert.equal(
            explicitProvider.calls.length,
            1
        );

    }
);

test(
    'AcquisitionService keeps movie search cache keys distinct by language region and year',
    async () => {

        const provider =
            createMovieSearchProvider({
                id:
                    'movie-provider',
                results: [
                    {
                        provider:
                            'movie-provider',
                        title:
                            'The Thing'
                    }
                ]
            });

        const {
            cache,
            repository
        } =
            createCache();

        const service =
            createService(
                [
                    provider
                ],
                {
                    acquisitionCache:
                        cache
                }
            );

        await service.searchMovies({
            language:
                'en-US',
            query:
                'The Thing',
            region:
                'US',
            year:
                '1982'
        });

        await service.searchMovies({
            language:
                'fr-FR',
            query:
                'The Thing',
            region:
                'FR',
            year:
                '1982'
        });

        assert.equal(
            provider.calls.length,
            2
        );

        assert.deepEqual(
            [
                ...repository.rows.keys()
            ].sort(),
            [
                'movies:movies/search:movie-provider:mapping_v1:language=en-US&query=The+Thing&region=US&year=1982',
                'movies:movies/search:movie-provider:mapping_v1:language=fr-FR&query=The+Thing&region=FR&year=1982'
            ]
        );

    }
);

test(
    'AcquisitionService does not expose a movie barcode lookup contract',
    async () => {

        const service =
            createService([
                createMovieSearchProvider({
                    id:
                        'movie-provider'
                })
            ]);

        assert.equal(
            typeof service.lookupMovieByBarcode,
            'undefined'
        );

    }
);

test(
    'AcquisitionService can use TMDb as an explicit movie search provider',
    async () => {

        const service =
            createConfiguredTmdbService({
                fetchImpl:
                    async () => createJsonResponse({
                        results: [
                            {
                                id:
                                    78,
                                original_language:
                                    'en',
                                original_title:
                                    'Blade Runner',
                                overview:
                                    'Deckard hunts replicants.',
                                release_date:
                                    '1982-06-25',
                                title:
                                    'Blade Runner'
                            }
                        ]
                    })
            });

        const result =
            await service.searchMovies({
                providerId:
                    'tmdb',
                query:
                    'Blade Runner'
            });

        assert.equal(
            result.results[0].provider,
            'tmdb'
        );

        assert.equal(
            result.results[0].metadata.tmdbId,
            78
        );

    }
);

test(
    'AcquisitionService rejects explicit TMDb searches when TMDb is not configured',
    async () => {

        const service =
            new AcquisitionService({
                providerRegistry:
                    new AcquisitionProviderRegistry({
                        fetchImpl:
                            async () => {

                                throw new Error(
                                    'Unexpected network call'
                                );

                            },
                        tmdbApiReadAccessToken:
                            ''
                    })
            });

        await assert.rejects(
            () => service.searchMovies({
                providerId:
                    'tmdb',
                query:
                    'Blade Runner'
            }),
            {
                code:
                    'provider_unavailable',
                statusCode:
                    503
            }
        );

    }
);

test(
    'AcquisitionService can use TMDb as the implicit movie search provider',
    async () => {

        let calls =
            0;

        const service =
            createConfiguredTmdbService({
                fetchImpl:
                    async () => {

                        calls +=
                            1;

                        return createJsonResponse({
                            results: [
                                {
                                    id:
                                        603,
                                    original_title:
                                        'The Matrix',
                                    title:
                                        'The Matrix'
                                }
                            ]
                        });

                    }
            });

        const result =
            await service.searchMovies({
                query:
                    'The Matrix'
            });

        assert.equal(
            result.results[0].provider,
            'tmdb'
        );

        assert.equal(
            calls,
            1
        );

    }
);

test(
    'AcquisitionService caches TMDb movie search responses without another fetch',
    async () => {

        let calls =
            0;

        const {
            cache,
            repository
        } =
            createCache();

        const service =
            createConfiguredTmdbService({
                acquisitionCache:
                    cache,
                fetchImpl:
                    async () => {

                        calls +=
                            1;

                        return createJsonResponse({
                            results: [
                                {
                                    id:
                                        78,
                                    original_title:
                                        'Blade Runner',
                                    title:
                                        'Blade Runner'
                                }
                            ]
                        });

                    }
            });

        await service.searchMovies({
            language:
                'en-US',
            query:
                'Blade Runner',
            region:
                'US',
            year:
                '1982'
        });

        await service.searchMovies({
            language:
                'en-US',
            query:
                'Blade Runner',
            region:
                'US',
            year:
                '1982'
        });

        assert.equal(
            calls,
            1
        );

        assert.deepEqual(
            [
                ...repository.rows.keys()
            ],
            [
                'movies:movies/search:tmdb:mapping_v1:language=en-US&query=Blade+Runner&region=US&year=1982'
            ]
        );

    }
);

function createService(
    providers,
    {
        acquisitionCache = null
    } = {}
) {

    return new AcquisitionService({
        acquisitionCache,
        providerRegistry:
            new AcquisitionProviderRegistry({
                providers
            })
    });

}

function createConfiguredTmdbService({
    acquisitionCache = null,
    fetchImpl
}) {

    return new AcquisitionService({
        acquisitionCache,
        providerRegistry:
            new AcquisitionProviderRegistry({
                fetchImpl,
                tmdbApiReadAccessToken:
                    'test-token'
            })
    });

}

function createCache({
    maxResponseJsonBytes = 100 * 1024
} = {}) {

    const repository =
        new MemoryAcquisitionCacheRepository();

    return {
        cache:
            new AcquisitionCache({
                maxResponseJsonBytes,
                now:
                    () => new Date(
                        '2026-01-01T00:00:00.000Z'
                    ),
                repository
            }),
        repository
    };

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

function createCacheRow({
    cacheKey,
    expiresAt,
    response
}) {

    return {
        cache_key:
            cacheKey,
        expires_at:
            expiresAt,
        response_json:
            JSON.stringify(
                response
            )
    };

}

function createJsonResponse(payload) {

    return {
        ok:
            true,
        status:
            200,
        async json() {

            return payload;

        }
    };

}

class MemoryAcquisitionCacheRepository {

    constructor() {

        this.deletedKeys =
            [];

        this.rows =
            new Map();

    }

    getByKey(cacheKey) {

        return this.rows.get(
            cacheKey
        ) ?? null;

    }

    upsert(entry) {

        this.rows.set(
            entry.cacheKey,
            {
                cache_key:
                    entry.cacheKey,
                expires_at:
                    entry.expiresAt,
                response_json:
                    entry.responseJson,
                status:
                    entry.status
            }
        );

    }

    deleteByKey(cacheKey) {

        this.deletedKeys.push(
            cacheKey
        );

        this.rows.delete(
            cacheKey
        );

    }

    deleteExpired(nowIso) {

        for (
            const [
                cacheKey,
                row
            ]
            of this.rows
        ) {

            if (
                row.expires_at <= nowIso
            ) {

                this.deleteByKey(
                    cacheKey
                );

            }

        }

    }

}

function createProvider({
    enabled = true,
    error = null,
    id,
    results = []
}) {

    return {
        calls: [],
        describe() {

            return {
                capabilities: [
                    'isbnLookup'
                ],
                enabled,
                id,
                name:
                    id,
                plugin:
                    'books',
                requiresConfiguration:
                    false
            };

        },
        async lookupIsbn(isbn) {

            this.calls.push(
                isbn
            );

            if (
                error
            ) {

                throw error;

            }

            return results;

        }
    };

}

function createMovieSearchProvider({
    enabled = true,
    error = null,
    id,
    results = []
}) {

    return {
        calls: [],
        describe() {

            return {
                capabilities: [
                    'movies/search'
                ],
                enabled,
                id,
                name:
                    id,
                plugin:
                    'movies',
                requiresConfiguration:
                    false
            };

        },
        async searchMovies(searchQuery) {

            this.calls.push(
                searchQuery
            );

            if (
                error
            ) {

                throw error;

            }

            return results;

        }
    };

}
