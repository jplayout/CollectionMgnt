import assert from 'node:assert/strict';
import { test } from 'node:test';
import { OpenLibraryProvider } from '../../src/acquisition/providers/open-library-provider.js';
import { GoogleBooksProvider } from '../../src/acquisition/providers/google-books-provider.js';
import { TmdbProvider } from '../../src/acquisition/providers/tmdb-provider.js';
import { IgdbProvider } from '../../src/acquisition/providers/igdb-provider.js';

const books = { plugin: 'books', kind: 'cover', identifiers: { isbn: '9782952221702' }, metadata: {} };
const movie = { plugin: 'movies', kind: 'poster', identifiers: { tmdbId: 78 }, metadata: { language: 'fr-FR', originalLanguage: 'en' } };
const game = { plugin: 'games', kind: 'cover', identifiers: { igdbId: 123 }, metadata: {} };

for (const [ids, path] of [[{ isbn: '9782952221702' }, 'isbn/9782952221702'], [{ isbn: '9782952221702', openLibraryCoverId: 123 }, 'id/123'], [{ openLibraryId: 'OL123M' }, 'olid/OL123M']]) {
    test(`Open Library media uses one HEAD and correct L/M sizes: ${path}`, async () => {
        const calls = [];
        const provider = new OpenLibraryProvider({ fetchImpl: async (url, options) => {
            calls.push(url);
            assert.equal(options.method, 'HEAD');
            assert.equal(options.redirect, 'error');
            assert.equal(url, `https://covers.openlibrary.org/b/${path}-L.jpg?default=false`);
            return new Response(null);
        } });
        const result = await provider.mediaSearch({ ...books, identifiers: ids });
        assert.equal(calls.length, 1);
        assert.equal(result[0].thumbnailUrl, `https://covers.openlibrary.org/b/${path}-M.jpg?default=false`);
    });
}

test('Open Library missing cover returns [] with no alternative probes', async () => {
    let calls = 0;
    assert.deepEqual(await new OpenLibraryProvider({ fetchImpl: async () => { calls += 1; return new Response(null, { status: 404 }); } }).mediaSearch(books), []);
    assert.equal(calls, 1);
});

test('Google Books media keeps exact ISBN volumes, best size, multiple images and deduplication without lite projection', async () => {
    const volumes = [
        { id: 'a', volumeInfo: { industryIdentifiers: [{ type: 'ISBN_13', identifier: books.identifiers.isbn }], imageLinks: { extraLarge: 'http://books.google.com/a-large.jpg', thumbnail: 'https://books.google.com/a-thumb.jpg' } } },
        { id: 'b', volumeInfo: { industryIdentifiers: [{ type: 'ISBN_13', identifier: books.identifiers.isbn }], imageLinks: { smallThumbnail: 'https://books.google.com/b.jpg' } } },
        { id: 'c', volumeInfo: { industryIdentifiers: [{ type: 'ISBN_13', identifier: '9780140328721' }], imageLinks: { large: 'https://books.google.com/wrong.jpg' } } }
    ];
    const provider = new GoogleBooksProvider({ apiKey: 'private-key', fetchImpl: async url => {
        const params = new URL(url).searchParams;
        assert.equal(params.get('q'), `isbn:${books.identifiers.isbn}`);
        assert.equal(params.get('key'), 'private-key');
        assert.equal(params.has('projection'), false);
        return Response.json({ items: [...volumes, volumes[0]] });
    } });
    const results = await provider.mediaSearch(books);
    assert.deepEqual(results.map(result => result.url), ['https://books.google.com/a-large.jpg', 'https://books.google.com/b.jpg']);
    assert.equal(results[0].thumbnailUrl, 'https://books.google.com/a-thumb.jpg');
    assert.equal(results[0].license, null);
});

test('Google Books media never calls anonymously when API key is absent', async () => {
    const provider = new GoogleBooksProvider({ apiKey: '', fetchImpl: () => assert.fail('Anonymous call') });
    assert.equal(provider.describe().enabled, false);
    await assert.rejects(() => provider.mediaSearch(books), { code: 'provider_unavailable' });
});
for (const [status, code] of [[429, 'provider_unavailable'], [503, 'provider_error']]) {
    test(`Google Books media HTTP ${status} sanitizes technical failure`, async () => {
        const provider = new GoogleBooksProvider({ apiKey: 'key', fetchImpl: async () => new Response('Private body', { status }) });
        await assert.rejects(() => provider.mediaSearch(books), { code, statusCode: 503 });
    });
}

test('TMDb uses images endpoint, ranks posters by language then score, keeps dimensions and excludes backdrops', async () => {
    const provider = new TmdbProvider({ readAccessToken: 'token', fetchImpl: async (url, options) => {
        assert.equal(url, 'https://api.themoviedb.org/3/movie/78/images');
        assert.equal(options.headers.Authorization, 'Bearer token');
        return Response.json({ backdrops: [{ file_path: '/backdrop.jpg' }], posters: [
            { file_path: '/de.jpg', iso_639_1: 'de', vote_average: 10 },
            { file_path: '/en.jpg', iso_639_1: 'en', width: 1000, height: 1500 },
            { file_path: '/none.jpg', iso_639_1: null },
            { file_path: '/fr.jpg', iso_639_1: 'fr', width: 500, height: 750 }
        ] });
    } });
    const results = await provider.mediaSearch(movie);
    assert.deepEqual(results.map(result => result.language), ['fr', 'en', null, 'de']);
    assert.equal(results[0].width, 500);
    assert.equal(results[0].height, 750);
    assert.equal(results[0].url, 'https://image.tmdb.org/t/p/original/fr.jpg');
    assert.equal(results[0].thumbnailUrl, 'https://image.tmdb.org/t/p/w185/fr.jpg');
});

test('IGDB covers reuse the existing shared OAuth request/cache and retain available dimensions', async () => {
    const calls = [];
    const provider = new IgdbProvider({ clientId: 'client', clientSecret: 'secret', fetchImpl: async (url, options) => {
        calls.push(url);
        if (url.includes('oauth2/token')) return Response.json({ access_token: 'token', expires_in: 3600 });
        assert.equal(url, 'https://api.igdb.com/v4/covers');
        assert.equal(options.headers.Authorization, 'Bearer token');
        assert.equal(options.body, 'fields image_id,url,width,height,game_localization; where game = 123 | game_localization.game = 123; limit 10;');
        return Response.json([{ image_id: 'cover123', width: 600, height: 900 }, { image_id: 'cover123', width: 600, height: 900 }, { image_id: 'localized', width: 500, height: 750, game_localization: 456 }]);
    } });
    const results = await Promise.all([provider.mediaSearch(game), provider.mediaSearch(game)]);
    assert.equal(calls.filter(url => url.includes('oauth2/token')).length, 1);
    assert.equal(results[0].length, 2);
    assert.equal(results[0][0].width, 600);
    assert.equal(results[0][0].language, null);
    assert.equal(results[0][1].providerLocalizationId, 456);
    await provider.mediaSearch(game);
    assert.equal(calls.filter(url => url.includes('oauth2/token')).length, 1);
});

for (const [name, factory, query] of [
    ['Open Library', options => new OpenLibraryProvider(options), books],
    ['Google Books', options => new GoogleBooksProvider({ ...options, apiKey: 'key' }), books],
    ['TMDb', options => new TmdbProvider({ ...options, readAccessToken: 'token' }), movie],
    ['IGDB', options => new IgdbProvider({ ...options, clientId: 'id', clientSecret: 'secret' }), game]
]) {
    test(`${name} media maps actual aborts to provider_timeout`, async () => {
        const provider = factory({ timeoutMs: 5, fetchImpl: async (_url, { signal }) => new Promise((_resolve, reject) => {
            signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
        }) });
        await assert.rejects(() => provider.mediaSearch(query), { code: 'provider_timeout' });
    });
    test(`${name} media sanitizes provider errors`, async () => {
        const provider = factory({ fetchImpl: async () => { throw new Error('Private network'); } });
        await assert.rejects(() => provider.mediaSearch(query), e => e.code === 'provider_error' && !e.message.includes('Private'));
    });
}

test('IGDB covers timeout after successful OAuth is translated without a second OAuth implementation', async () => {
    const provider = new IgdbProvider({ clientId: 'client', clientSecret: 'secret', timeoutMs: 5, fetchImpl: async (url, { signal }) => {
        if (url.includes('oauth2/token')) return Response.json({ access_token: 'token', expires_in: 3600 });
        return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true }));
    } });
    await assert.rejects(() => provider.mediaSearch(game), { code: 'provider_timeout' });
});

test('IGDB unauthorized covers clear the existing token; only a subsequent explicit search obtains a new token', async () => {
    let tokens = 0;
    let covers = 0;
    const provider = new IgdbProvider({ clientId: 'client', clientSecret: 'secret', fetchImpl: async url => {
        if (url.includes('oauth2/token')) { tokens += 1; return Response.json({ access_token: `token${tokens}`, expires_in: 3600 }); }
        covers += 1;
        return covers === 1 ? new Response('Private 401', { status: 401 }) : Response.json([]);
    } });
    await assert.rejects(() => provider.mediaSearch(game), { code: 'provider_error' });
    assert.equal(tokens, 1);
    assert.equal(covers, 1);
    assert.equal(provider.accessToken, null);
    assert.deepEqual(await provider.mediaSearch(game), []);
    assert.equal(tokens, 2);
});
