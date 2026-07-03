import assert from 'node:assert/strict';
import {
    test
} from 'node:test';

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

function createService(providers) {

    return new AcquisitionService({
        providerRegistry:
            new AcquisitionProviderRegistry({
                providers
            })
    });

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

