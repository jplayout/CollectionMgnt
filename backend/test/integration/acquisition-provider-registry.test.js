import assert from 'node:assert/strict';
import { test } from 'node:test';

import { AcquisitionProviderRegistry } from '../../src/acquisition/provider-registry.js';

for (const googleBooksApiKey of ['', '   ', null]) {

    test(`Registry excludes unconfigured Google Books ${JSON.stringify(googleBooksApiKey)} from active resolution`, () => {

        const registry = new AcquisitionProviderRegistry({
            googleBooksApiKey,
            fetchImpl: async () => { throw new Error('Registry must not fetch'); }
        });
        const googleBooks = registry.providers.find(provider => provider.describe().id === 'googlebooks');

        assert.equal(googleBooks.describe().enabled, false);
        assert.equal(googleBooks.describe().requiresConfiguration, true);
        assert.deepEqual(registry.getProvidersFor({plugin: 'books', capability: 'isbnLookup'})
            .map(provider => provider.describe().id), ['openlibrary']);
        assert.equal(registry.listProviders().some(provider => provider.id === 'googlebooks'), false);
        assert.throws(() => registry.getProvider('googlebooks'), {code: 'provider_unavailable', statusCode: 503});

    });

}

test('Registry activates configured Google Books after Open Library without exposing its key', () => {

    const registry = new AcquisitionProviderRegistry({
        googleBooksApiKey: 'test-google-books-api-key',
        fetchImpl: async () => { throw new Error('Registry must not fetch'); }
    });

    assert.deepEqual(registry.getProvidersFor({plugin: 'books', capability: 'isbnLookup'})
        .map(provider => provider.describe().id), ['openlibrary', 'googlebooks']);
    assert.equal(registry.getProvider('googlebooks').describe().requiresConfiguration, true);
    assert.equal(JSON.stringify(registry.listProviders()).includes('test-google-books-api-key'), false);

});
