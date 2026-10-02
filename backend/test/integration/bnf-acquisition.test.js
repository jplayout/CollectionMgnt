import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';

import { createTestApp } from '../helpers/test-app.js';
import { bnfFixture, xmlResponse } from '../helpers/bnf-fixtures.js';

const originalFetch = globalThis.fetch;
const originalKey = process.env.GOOGLE_BOOKS_API_KEY;
const isbn = '9782952221702';
let context;
let token;
let fetchHandler;

before(async () => {
    process.env.GOOGLE_BOOKS_API_KEY = 'test-bnf-fallback-key';
    globalThis.fetch = async (...args) => fetchHandler(...args);
    context = await createTestApp();
    token = await context.login();
});

beforeEach(() => {
    context.db.prepare('DELETE FROM acquisition_cache').run();
});

after(async () => {
    await context?.close();
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GOOGLE_BOOKS_API_KEY;
    else process.env.GOOGLE_BOOKS_API_KEY = originalKey;
});

for (const [name, ol, bnf, google, status, winner, hosts] of [
    ['OL empty -> BnF success', 'empty', 'success', 'success', 200, 'bnf', ['openlibrary.org', 'catalogue.bnf.fr']],
    ['OL empty -> BnF empty -> Google success', 'empty', 'empty', 'success', 200, 'googlebooks', ['openlibrary.org', 'catalogue.bnf.fr', 'www.googleapis.com']],
    ['all providers empty', 'empty', 'empty', 'empty', 200, null, ['openlibrary.org', 'catalogue.bnf.fr', 'www.googleapis.com']],
    ['OL error -> BnF success', 'error', 'success', 'success', 200, 'bnf', ['openlibrary.org', 'catalogue.bnf.fr']],
    ['BnF error -> Google success', 'empty', 'error', 'success', 200, 'googlebooks', ['openlibrary.org', 'catalogue.bnf.fr', 'www.googleapis.com']],
    ['BnF error + Google empty remains a technical error', 'empty', 'error', 'empty', 503, null, ['openlibrary.org', 'catalogue.bnf.fr', 'www.googleapis.com']]
]) {
    test(`ISBN route: ${name}`, async () => {
        const calls = [];
        fetchHandler = handler({ ol, bnf, google, calls });
        const response = await lookup();
        assert.equal(response.statusCode, status);
        if (status === 200) {
            assert.equal(response.json().query.value, isbn);
            if (winner) assert.equal(response.json().results[0].provider, winner);
            else assert.deepEqual(response.json().results, []);
        } else {
            assert.deepEqual(response.json(), {
                code: 'provider_error', error: 'provider_error', message: 'Provider lookup failed'
            });
        }
        assert.deepEqual(calls, hosts);
    });
}

test('Cached empty OL still reaches BnF; BnF success is cached in its own provider scope', async () => {
    const calls = [];
    fetchHandler = handler({ ol: 'empty', bnf: 'empty', google: 'empty', calls });
    assert.deepEqual((await lookup('openlibrary')).json().results, []);
    calls.length = 0;
    fetchHandler = handler({ ol: 'error', bnf: 'success', google: 'error', calls });
    assert.equal((await lookup()).json().results[0].provider, 'bnf');
    assert.deepEqual(calls, ['catalogue.bnf.fr']);
    calls.length = 0;
    assert.equal((await lookup()).json().results[0].provider, 'bnf');
    assert.deepEqual(calls, []);
    const rows = context.db.prepare('SELECT provider_id, status FROM acquisition_cache ORDER BY provider_id').all();
    assert.deepEqual(rows, [{ provider_id: 'bnf', status: 'success' }, { provider_id: 'openlibrary', status: 'empty' }]);
});

test('ISBN 9782952221702: expired SQLite empty OL cache is refreshed without BnF fallback', async (t) => {
    const start = Date.now();
    t.mock.timers.enable({ apis: ['Date'], now: start });
    const calls = [];
    fetchHandler = handler({ ol: 'empty', bnf: 'error', google: 'empty', calls });
    assert.deepEqual((await lookup('openlibrary')).json().results, []);
    const empty = context.db.prepare('SELECT * FROM acquisition_cache WHERE provider_id = ?').get('openlibrary');
    assert.equal(empty.status, 'empty');
    assert.equal(Date.parse(empty.expires_at) - Date.parse(empty.created_at), 60 * 60 * 1000);
    fetchHandler = handler({ ol: 'success', bnf: 'error', google: 'error', calls });
    calls.length = 0;
    t.mock.timers.tick(60 * 60 * 1000 - 1);
    assert.deepEqual((await lookup('openlibrary')).json().results, []);
    assert.deepEqual(calls, []);
    t.mock.timers.tick(2);
    const response = await lookup();
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().results.length, 1);
    assert.equal(response.json().results[0].provider, 'openlibrary');
    assert.deepEqual(calls, ['openlibrary.org']);
    const success = context.db.prepare('SELECT * FROM acquisition_cache WHERE provider_id = ?').get('openlibrary');
    assert.equal(success.status, 'success');
    assert.equal(Date.parse(success.expires_at) - Date.parse(success.created_at), 7 * 24 * 60 * 60 * 1000);
});

test('Cached empty BnF continues to Google and cannot hide its success', async () => {
    const calls = [];
    fetchHandler = handler({ ol: 'empty', bnf: 'empty', google: 'empty', calls });
    assert.deepEqual((await lookup('bnf')).json().results, []);
    calls.length = 0;
    fetchHandler = handler({ ol: 'empty', bnf: 'error', google: 'success', calls });
    assert.equal((await lookup()).json().results[0].provider, 'googlebooks');
    assert.deepEqual(calls, ['openlibrary.org', 'www.googleapis.com']);
});

for (const outcome of ['success', 'empty', 'error']) {
    test(`Explicit BnF ${outcome} never falls back`, async () => {
        const calls = [];
        fetchHandler = handler({ ol: 'success', bnf: outcome, google: 'success', calls });
        const response = await lookup('bnf');
        assert.equal(response.statusCode, outcome === 'error' ? 503 : 200);
        if (outcome === 'empty') assert.deepEqual(response.json().results, []);
        if (outcome === 'success') assert.equal(response.json().results[0].provider, 'bnf');
        assert.deepEqual(calls, ['catalogue.bnf.fr']);
    });
}

test('BnF stays available and supplies suggestions without Google Books configuration', async () => {
    let unconfigured;
    const configuredKey = process.env.GOOGLE_BOOKS_API_KEY;
    try {
        delete process.env.GOOGLE_BOOKS_API_KEY;
        unconfigured = await createTestApp();
        const auth = { authorization: `Bearer ${await unconfigured.login()}` };
        const providers = await unconfigured.app.inject({ method: 'GET', url: '/api/acquisition/providers', headers: auth });
        assert.deepEqual(providers.json().providers.filter(p => p.plugin === 'books').map(p => p.id), ['openlibrary', 'bnf']);
        const calls = [];
        fetchHandler = handler({ ol: 'empty', bnf: 'success', google: 'error', calls });
        const response = await unconfigured.app.inject({
            method: 'POST', url: '/api/acquisition/books/isbn/lookup', headers: auth, payload: { isbn }
        });
        assert.equal(response.statusCode, 200);
        assert.equal(response.json().results[0].provider, 'bnf');
        assert.deepEqual(calls, ['openlibrary.org', 'catalogue.bnf.fr']);
    } finally {
        await unconfigured?.close();
        process.env.GOOGLE_BOOKS_API_KEY = configuredKey;
    }
});

function lookup(provider) {
    return context.app.inject({
        method: 'POST', url: '/api/acquisition/books/isbn/lookup',
        headers: { authorization: `Bearer ${token}` }, payload: { isbn, ...(provider ? { provider } : {}) }
    });
}

function handler({ ol, bnf, google, calls }) {
    return async url => {
        const parsed = new URL(url);
        calls.push(parsed.hostname);
        const outcome = { 'openlibrary.org': ol, 'catalogue.bnf.fr': bnf, 'www.googleapis.com': google }[parsed.hostname];
        assert.ok(outcome, `Unexpected provider request: ${parsed.hostname}`);
        if (outcome === 'error') return new Response('Private error', { status: 503 });
        if (parsed.hostname === 'catalogue.bnf.fr') return xmlResponse(outcome === 'success' ? bnfFixture() : undefined);
        if (parsed.hostname === 'openlibrary.org') return Response.json(outcome === 'success' ? {
            [`ISBN:${isbn}`]: { title: 'La Horde du contrevent' }
        } : {});
        assert.equal(parsed.searchParams.get('q'), `isbn:${isbn}`);
        assert.equal(parsed.searchParams.has('projection'), false);
        return Response.json(outcome === 'success' ? {
            totalItems: 1, items: [{ volumeInfo: { title: 'La Horde du contrevent', industryIdentifiers: [{ type: 'ISBN_13', identifier: isbn }] } }]
        } : { totalItems: 0 });
    };
}
