import assert from 'node:assert/strict';
import {
    after,
    before,
    test
} from 'node:test';

import { createTestApp } from '../helpers/test-app.js';
import { NativeImportService } from '../../src/services/native-import-service.js';

let context;
let token;

before(async () => {

    context =
        await createTestApp();

    token =
        await context.login();

});

after(async () => {

    await context.close();

});

test(
    'POST /api/items accepts valid ISBN-10 and normalizes it',
    async () => {

        const response =
            await createItem({
                metadata: {
                    isbn:
                        '1-234-56789-X'
                },
                plugin:
                    'books',
                title:
                    'ISBN-10 demo'
            });

        assert.equal(
            response.statusCode,
            200
        );

        const item =
            await getItem(
                response.json().id
            );

        assert.equal(
            item.metadata.isbn,
            '123456789X'
        );

    }
);

test(
    'POST /api/items accepts valid ISBN-13 and normalizes it',
    async () => {

        const response =
            await createItem({
                metadata: {
                    isbn:
                        '979-1-000000-01-5'
                },
                plugin:
                    'books',
                title:
                    'ISBN-13 demo'
            });

        assert.equal(
            response.statusCode,
            200
        );

        const item =
            await getItem(
                response.json().id
            );

        assert.equal(
            item.metadata.isbn,
            '9791000000015'
        );

    }
);

test(
    'POST /api/items rejects invalid ISBN checksums',
    async () => {

        const response =
            await createItem({
                metadata: {
                    isbn:
                        '9791000000016'
                },
                plugin:
                    'books',
                title:
                    'Invalid ISBN demo'
            });

        assert.equal(
            response.statusCode,
            400
        );

        assert.deepEqual(
            response.json().errors,
            [
                'isbn must be a valid ISBN-10 or ISBN-13'
            ]
        );

    }
);

test(
    'POST /api/items accepts valid EAN-13 and UPC-A barcodes',
    async () => {

        const eanResponse =
            await createItem({
                metadata: {
                    barcode:
                        '200-000000001-5',
                    platform:
                        'PC'
                },
                plugin:
                    'games',
                title:
                    'EAN demo'
            });

        assert.equal(
            eanResponse.statusCode,
            200
        );

        const eanItem =
            await getItem(
                eanResponse.json().id
            );

        assert.equal(
            eanItem.metadata.barcode,
            '2000000000015'
        );

        const upcResponse =
            await createItem({
                metadata: {
                    barcode:
                        '020000000008',
                    platform:
                        'PC'
                },
                plugin:
                    'games',
                title:
                    'UPC demo'
            });

        assert.equal(
            upcResponse.statusCode,
            200
        );

    }
);

test(
    'POST /api/items rejects invalid barcode checksums',
    async () => {

        const response =
            await createItem({
                metadata: {
                    barcode:
                        '2000000000016',
                    platform:
                        'PC'
                },
                plugin:
                    'games',
                title:
                    'Invalid barcode demo'
            });

        assert.equal(
            response.statusCode,
            400
        );

        assert.deepEqual(
            response.json().errors,
            [
                'barcode must be a valid EAN-13 or UPC-A barcode'
            ]
        );

    }
);

test(
    'PATCH /api/items edits identifiers and keeps normalized storage',
    async () => {

        const created =
            await createItem({
                metadata: {
                    isbn:
                        '123456789X'
                },
                plugin:
                    'books',
                title:
                    'Editable ISBN demo'
            });

        const response =
            await context.app.inject({
                headers:
                    authHeaders(),
                method:
                    'PATCH',
                payload: {
                    metadata: {
                        isbn:
                            '979-1-000000-02-2'
                    },
                    title:
                        'Edited ISBN demo'
                },
                url:
                    `/api/items/${created.json().id}`
            });

        assert.equal(
            response.statusCode,
            200
        );

        assert.equal(
            response.json().metadata.isbn,
            '9791000000022'
        );

    }
);

test(
    'GET /api/items searches and filters by normalized identifiers',
    async () => {

        await createItem({
            metadata: {
                barcode:
                    '200-000000002-2',
                platform:
                    'Switch'
            },
            plugin:
                'games',
            title:
                'Searchable barcode demo'
        });

        const searchResponse =
            await context.app.inject({
                headers:
                    authHeaders(),
                method:
                    'GET',
                url:
                    '/api/items?plugin=games&search=200-000000002-2'
            });

        assert.equal(
            searchResponse.statusCode,
            200
        );

        assert.ok(
            searchResponse.json().items.some(
                item => item.title === 'Searchable barcode demo'
            )
        );

        const filterResponse =
            await context.app.inject({
                headers:
                    authHeaders(),
                method:
                    'GET',
                url:
                    '/api/items?plugin=games&barcode=200-000000002-2'
            });

        assert.equal(
            filterResponse.statusCode,
            200
        );

        assert.equal(
            filterResponse.json().items.length,
            1
        );

        assert.equal(
            filterResponse.json().items[0].metadata.barcode,
            '2000000000022'
        );

    }
);

test(
    'exports include identifier fields in JSON and CSV',
    async () => {

        await createItem({
            metadata: {
                barcode:
                    '2000000000039',
                platform:
                    'PC'
            },
            plugin:
                'games',
            title:
                'Export barcode demo'
        });

        const jsonResponse =
            await context.app.inject({
                headers:
                    authHeaders(),
                method:
                    'GET',
                url:
                    '/api/exports/collections/games.json'
            });

        assert.equal(
            jsonResponse.statusCode,
            200
        );

        const jsonBody =
            jsonResponse.json();

        assert.ok(
            jsonBody.schemas[0].fields.some(
                field => field.name === 'barcode' &&
                    field.type === 'barcode'
            )
        );

        assert.ok(
            jsonBody.collections[0].items.some(
                item => item.metadata.barcode === '2000000000039'
            )
        );

        const csvResponse =
            await context.app.inject({
                headers:
                    authHeaders(),
                method:
                    'GET',
                url:
                    '/api/exports/collections/games.csv'
            });

        assert.equal(
            csvResponse.statusCode,
            200
        );

        assert.match(
            csvResponse.payload.split('\r\n')[0],
            /(^|,)barcode(,|$)/
        );

        assert.match(
            csvResponse.payload,
            /2000000000039/
        );

    }
);

test(
    'NativeImportService imports and normalizes identifiers',
    () => {

        const service =
            new NativeImportService(
                context.db,
                context.app.pluginService
            );

        const report =
            service.importDocument({
                collections: [
                    {
                        items: [
                            {
                                metadata: {
                                    isbn:
                                        '979-1-000000-03-9'
                                },
                                title:
                                    'Imported ISBN demo'
                            }
                        ],
                        media: [],
                        plugin:
                            'books'
                    }
                ],
                format:
                    'collectionmgnt.native-export',
                format_version:
                    1,
                scope:
                    'collection'
            });

        assert.equal(
            report.summary.itemsCreated,
            1
        );

        const imported =
            context.db
                .prepare(`
                    SELECT metadata
                    FROM items
                    WHERE title = ?
                `)
                .get(
                    'Imported ISBN demo'
                );

        assert.equal(
            JSON.parse(imported.metadata).isbn,
            '9791000000039'
        );

    }
);

async function createItem(payload) {

    return context.app.inject({
        headers:
            authHeaders(),
        method:
            'POST',
        payload,
        url:
            '/api/items'
    });

}

async function getItem(id) {

    const response =
        await context.app.inject({
            headers:
                authHeaders(),
            method:
                'GET',
            url:
                `/api/items/${id}`
        });

    assert.equal(
        response.statusCode,
        200
    );

    return response.json();

}

function authHeaders() {

    return {
        authorization:
            `Bearer ${token}`
    };

}
