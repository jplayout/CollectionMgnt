import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MediaSearchService, validateMediaSearchQuery } from '../../src/acquisition/media-search-service.js';
import { AcquisitionProviderRegistry } from '../../src/acquisition/provider-registry.js';

const query = { plugin: 'books', kind: 'cover', identifiers: { isbn: '9782952221702' } };
const image = (name, extra = {}) => ({ url: `https://example.test/${name}.jpg`, ...extra });
function provider(id, outcome, enabled = true) {
    return { timeoutMs: 30, describe: () => ({ id, plugin: 'books', enabled, capabilities: ['mediaSearch'] }), mediaSearch: async () => {
        if (outcome instanceof Error) throw outcome;
        return outcome;
    } };
}
function service(providers) { return new MediaSearchService({ providerRegistry: new AcquisitionProviderRegistry({ providers }) }); }
const error = code => Object.assign(new Error('Private upstream key/body'), { code });

for (const [name, a, b, count, warnings, incomplete] of [
    ['merges successes', [image('a')], [image('b')], 2, [], false],
    ['empty and success', [], [image('b')], 1, [], false],
    ['error and success', error('provider_unavailable'), [image('b')], 1, [{ provider: 'a', code: 'provider_unavailable' }], true],
    ['all empty', [], [], 0, [], false],
    ['error plus empty is explicitly incomplete', error('provider_error'), [], 0, [{ provider: 'a', code: 'provider_error' }], true]
]) {
    test(`MediaSearchService ${name}`, async () => {
        const result = await service([provider('a', a), provider('b', b)]).search(query);
        assert.equal(result.results.length, count);
        assert.deepEqual(result.warnings, warnings);
        assert.equal(result.incomplete, incomplete);
        assert.ok(!JSON.stringify(result).includes('Private'));
    });
}

test('MediaSearchService all errors returns stable error with sanitized warnings', async () => {
    await assert.rejects(() => service([provider('a', error('provider_timeout')), provider('b', error('other'))]).search(query), e => {
        assert.equal(e.code, 'provider_timeout');
        assert.deepEqual(e.warnings, [{ provider: 'a', code: 'provider_timeout' }, { provider: 'b', code: 'provider_error' }]);
        assert.ok(!e.message.includes('Private'));
        return true;
    });
});

test('MediaSearchService starts providers concurrently and bounds a hung provider individually', async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const calls = [];
    let signal;
    const slow = provider('slow', []);
    slow.mediaSearch = async (_query, options) => { calls.push('slow'); signal = options.signal; return new Promise(() => {}); };
    const fast = provider('fast', []);
    fast.mediaSearch = async () => { calls.push('fast'); return [image('fast')]; };
    const pending = service([slow, fast]).search(query);
    assert.deepEqual(calls, ['slow', 'fast']);
    t.mock.timers.tick(30);
    const result = await pending;
    assert.equal(signal.aborted, true);
    assert.equal(result.results.length, 1);
    assert.deepEqual(result.warnings, [{ provider: 'slow', code: 'provider_timeout' }]);
});

test('MediaSearchService caps each provider at 10 and global results at 20', async () => {
    const providers = ['a', 'b', 'c'].map(id => provider(id, Array.from({ length: 30 }, (_, i) => image(`${id}${i}`))));
    const result = await service(providers).search(query);
    assert.equal(result.results.length, 20);
    assert.equal(result.results.filter(candidate => candidate.provider === 'a').length, 10);
});

test('MediaSearchService deduplicates normalized URL across providers and provider image ID within a provider', async () => {
    const result = await service([
        provider('a', [image('same'), image('small', { providerImageId: '123' }), image('large', { providerImageId: '123' })]),
        provider('b', [{ url: 'https://EXAMPLE.test/same.jpg#ignored' }, image('another', { providerImageId: '123' })])
    ]).search(query);
    assert.equal(result.results.length, 3);
});

test('MediaSearchService excludes inactive providers and has no cache or DB side effects', async () => {
    let calls = 0;
    const active = provider('active', []);
    active.mediaSearch = async () => { calls += 1; return []; };
    const inactive = provider('inactive', [] , false);
    inactive.mediaSearch = () => assert.fail('Unconfigured provider called');
    const search = service([inactive, active]);
    await search.search(query);
    await search.search(query);
    assert.equal(calls, 2);
    await assert.rejects(() => service([inactive]).search(query), { code: 'provider_unavailable' });
});

for (const input of [null, {}, { ...query, imageUrl: 'https://private.test' }, { ...query, identifiers: { url: 'https://private.test' } },
    { ...query, identifiers: { isbn: 'bad' } }, { ...query, kind: 'poster' }, { ...query, title: 'x'.repeat(301) },
    { ...query, metadata: { arbitrary: true } }, { plugin: 'movies', kind: 'poster', identifiers: { tmdbId: '1; injection' } },
    { plugin: 'games', kind: 'cover', identifiers: {} }]) {
    test(`Media search rejects unbounded/arbitrary input ${JSON.stringify(input)?.slice(0, 60)}`, () => {
        assert.throws(() => validateMediaSearchQuery(input), { code: 'invalid_media_search', statusCode: 400 });
    });
}

test('Media query normalizes ISBN and accepts minimal movie/game and known Open Library IDs', () => {
    assert.equal(validateMediaSearchQuery({ ...query, identifiers: { isbn: '978-2-9522217-0-2', openLibraryCoverId: 123, openLibraryId: 'OL123M' } }).identifiers.isbn, '9782952221702');
    for (const [plugin, kind, key] of [['movies', 'poster', 'tmdbId'], ['games', 'cover', 'igdbId']]) {
        assert.deepEqual(validateMediaSearchQuery({ plugin, kind, identifiers: { [key]: 123 } }).identifiers, { [key]: 123 });
    }
});


test('Same provider image at different sizes keeps the largest and supplies the small preview', async () => {
    const result = await service([provider('a', [
        image('small', { providerImageId: 'same', width: 100, height: 150 }),
        image('large', { providerImageId: 'same', width: 1000, height: 1500 })
    ])]).search(query);
    assert.equal(result.results.length, 1);
    assert.equal(result.results[0].url, 'https://example.test/large.jpg');
    assert.equal(result.results[0].thumbnailUrl, 'https://example.test/small.jpg');
});
