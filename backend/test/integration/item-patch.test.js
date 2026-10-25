import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

import { createTestApp } from '../helpers/test-app.js';

let context;
let token;

before(async () => {
    context = await createTestApp();
    token = await context.login();
});

after(async () => {
    await context?.close();
});

for (const [name, initialDescription, description, expectedDescription] of [
    ['preserves an omitted description', 'Existing description', undefined, 'Existing description'],
    ['clears an explicitly null description', 'Existing description', null, null],
    ['stores an empty description', 'Existing description', '', ''],
    ['replaces a description', 'Existing description', 'New description', 'New description'],
    ['preserves SQL NULL when description is omitted', null, undefined, null]
]) {
    test(`PATCH /api/items ${name} in SQLite`, async () => {
        const id = await createItem({ description: initialDescription });
        assert.equal(persistedItem(id).description, initialDescription);

        const payload = { title: 'Edited title', metadata: {} };
        if (description !== undefined) {
            payload.description = description;
        }

        const response = await patchItem(id, payload);

        assert.equal(response.statusCode, 200);
        assert.deepEqual(persistedItem(id), {
            title: 'Edited title',
            description: expectedDescription,
            metadata: '{}'
        });
        assert.equal(response.json().description, expectedDescription);
    });
}

test('PATCH /api/items with empty metadata removes declared fields and preserves unknown keys in SQLite', async () => {
    const providerData = { source: 'legacy', identifiers: ['custom-identifier'] };
    const id = await createItem({
        metadata: {
            author: 'Existing author',
            isbn: '123456789X',
            providerData
        }
    });

    const response = await patchItem(id, {
        title: 'Edited title',
        description: 'Existing description',
        metadata: {}
    });

    assert.equal(response.statusCode, 200);
    const stored = persistedItem(id);
    assert.equal(stored.title, 'Edited title');
    assert.equal(stored.description, 'Existing description');
    assert.deepEqual(JSON.parse(stored.metadata), { providerData });
});

test('PATCH /api/items preserves metadata replacement, normalization and falsy values in SQLite', async () => {
    const providerData = { source: 'legacy' };
    const id = await createItem({
        metadata: {
            author: 'Existing author',
            isbn: '123456789X',
            providerData,
            customNote: 'Old note'
        }
    });

    const response = await patchItem(id, {
        title: 'Edited title',
        description: 'Existing description',
        metadata: {
            isbn: '979-1-000000-02-2',
            genre: '',
            publisher: null,
            read: false,
            rating: 0,
            customNote: 'New note'
        }
    });

    assert.equal(response.statusCode, 200);
    const stored = persistedItem(id);
    assert.equal(stored.description, 'Existing description');
    assert.deepEqual(JSON.parse(stored.metadata), {
        providerData,
        customNote: 'New note',
        isbn: '9791000000022',
        genre: '',
        publisher: null,
        read: false,
        rating: 0
    });
});

for (const [name, payload, errors] of [
    ['title', { metadata: {} }, ['title is required']],
    ['metadata', { title: 'Edited title' }, ['metadata must be an object']]
]) {
    test(`PATCH /api/items still requires ${name} without changing SQLite`, async () => {
        const id = await createItem({ metadata: { author: 'Existing author' } });
        const before = persistedItem(id);

        const response = await patchItem(id, payload);

        assert.equal(response.statusCode, 400);
        assert.deepEqual(response.json().errors, errors);
        assert.deepEqual(persistedItem(id), before);
    });
}

test('PATCH /api/items still validates required plugin metadata before writing to SQLite', async () => {
    const id = await createItem({
        plugin: 'games',
        metadata: { platform: 'PC', publisher: 'Existing publisher' }
    });
    const before = persistedItem(id);

    const response = await patchItem(id, { title: 'Edited title', metadata: {} });

    assert.equal(response.statusCode, 400);
    assert.deepEqual(response.json().errors, ['platform is required']);
    assert.deepEqual(persistedItem(id), before);
});

async function createItem(overrides = {}) {
    const response = await context.app.inject({
        method: 'POST',
        url: '/api/items',
        headers: { authorization: `Bearer ${token}` },
        payload: {
            plugin: 'books',
            title: 'Original title',
            description: 'Existing description',
            metadata: {},
            ...overrides
        }
    });

    assert.equal(response.statusCode, 200);
    return response.json().id;
}

function patchItem(id, payload) {
    return context.app.inject({
        method: 'PATCH',
        url: `/api/items/${id}`,
        headers: { authorization: `Bearer ${token}` },
        payload
    });
}

function persistedItem(id) {
    return context.db.prepare(`
        SELECT title, description, metadata
        FROM items
        WHERE id = ?
    `).get(id);
}
