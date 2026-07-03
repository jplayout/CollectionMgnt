import assert from 'node:assert/strict';
import {
    test
} from 'node:test';

import { AcquisitionCache } from '../../src/acquisition/acquisition-cache.js';
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
    'AcquisitionService keeps provider selection deterministic without fallback',
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
            []
        );

        assert.deepEqual(
            result.results,
            []
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
    'AcquisitionService separates default and explicit provider cache keys',
    async () => {

        const defaultProvider =
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
                'explicit-provider'
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
                'books:isbnLookup:default-provider:mapping_v1:9780140328721',
                'books:isbnLookup:explicit-provider:mapping_v1:9780140328721'
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
