import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { createTestApp } from '../helpers/test-app.js';

const originalFetch = globalThis.fetch;
const originalKey = process.env.GOOGLE_BOOKS_API_KEY;
let context;
let token;
let handler;
before(async () => {
    process.env.GOOGLE_BOOKS_API_KEY = 'private-google-key';
    globalThis.fetch = (...args) => handler(...args);
    context = await createTestApp();
    token = await context.login();
});
after(async () => {
    await context?.close();
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GOOGLE_BOOKS_API_KEY;
    else process.env.GOOGLE_BOOKS_API_KEY = originalKey;
});
const query = { plugin: 'books', kind: 'cover', identifiers: { isbn: '9782952221702' }, title: 'La Horde du contrevent' };
function search(payload = query, authenticated = true) {
    return context.app.inject({ method: 'POST', url: '/api/acquisition/media/search', payload,
        headers: authenticated ? { authorization: `Bearer ${token}` } : {} });
}

test('Media discovery requires authentication and rejects arbitrary URLs before any upstream request', async () => {
    handler = () => assert.fail('Unexpected network call');
    assert.equal((await search(query, false)).statusCode, 401);
    assert.equal((await search({ ...query, imageUrl: 'https://example.test/private' })).statusCode, 400);
    assert.equal((await search({ ...query, identifiers: { isbn: 'bad' } })).statusCode, 400);
    assert.equal((await search({ ...query, title: 'x'.repeat(5000) })).statusCode, 413);
});

for (const [name, olStatus, googleStatus, count, incomplete, status] of [
    ['both success', 200, 200, 2, false, 200],
    ['partial success', 404, 200, 1, false, 200],
    ['success with warning', 503, 200, 1, true, 200],
    ['empty incomplete', 404, 503, 0, true, 200],
    ['all errors', 503, 503, 0, true, 503]
]) {
    test(`POST media/search ${name} does not write cache, media or items`, async () => {
        const counts = () => ['items', 'media', 'acquisition_cache'].map(table => context.db.prepare(`SELECT count(*) AS n FROM ${table}`).get().n);
        const before = counts();
        const calls = [];
        handler = async (url, options) => {
            const host = new URL(url).hostname;
            calls.push(host);
            if (host === 'covers.openlibrary.org') {
                assert.equal(options.method, 'HEAD');
                return new Response(null, { status: olStatus });
            }
            assert.equal(host, 'www.googleapis.com');
            return googleStatus === 200 ? Response.json({ items: [{ id: 'volume123', volumeInfo: {
                industryIdentifiers: [{ type: 'ISBN_13', identifier: query.identifiers.isbn }],
                imageLinks: { large: 'https://books.google.com/cover.jpg' }
            } }] }) : new Response('Private Google quota body', { status: googleStatus });
        };
        const response = await search();
        assert.equal(response.statusCode, status);
        const body = response.json();
        if (status === 200) { assert.equal(body.results.length, count); assert.equal(body.incomplete, incomplete); }
        assert.equal(JSON.stringify(body).includes('Private'), false);
        assert.equal(JSON.stringify(body).includes('private-google-key'), false);
        assert.deepEqual(calls.sort(), ['covers.openlibrary.org', 'www.googleapis.com']);
        assert.deepEqual(counts(), before);
    });
}
