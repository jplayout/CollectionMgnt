import assert from 'node:assert/strict';
import {
    after,
    before,
    test
} from 'node:test';

import { createTestApp } from '../helpers/test-app.js';

let context;
let token;
let user;

before(async () => {

    context =
        await createTestApp();

    token =
        await context.login();

    user =
        await context.createUser({
            username:
                'regular-export-test-user'
        });

});

after(async () => {

    await context.close();

});

test(
    'GET /api/exports/application.json returns a native JSON export',
    async () => {

        const response =
            await context.app.inject({
                headers:
                    authHeaders(),
                method:
                    'GET',
                url:
                    '/api/exports/application.json'
            });

        assert.equal(
            response.statusCode,
            200
        );

        assert.match(
            response.headers['content-type'],
            /^application\/json/
        );

        const body =
            response.json();

        assert.equal(
            body.format,
            'collectionmgnt.native-export'
        );

        assert.equal(
            body.format_version,
            1
        );

        assert.equal(
            body.scope,
            'application'
        );

        assert.ok(
            Array.isArray(body.collections)
        );

    }
);

test(
    'GET /api/exports/application.json rejects non-admin users',
    async () => {

        const response =
            await context.app.inject({
                headers: {
                    authorization:
                        `Bearer ${user.token}`
                },
                method:
                    'GET',
                url:
                    '/api/exports/application.json'
            });

        assert.equal(
            response.statusCode,
            403
        );

    }
);

test(
    'GET /api/exports/collections/:pluginId.csv neutralizes spreadsheet formulas',
    async () => {

        const plugin =
            context.db
                .prepare(`
                    SELECT id
                    FROM plugins
                    WHERE code = ?
                `)
                .get(
                    'games'
                );

        context.db
            .prepare(`
                INSERT INTO items (
                    plugin_id,
                    title,
                    description,
                    metadata
                )
                VALUES (?, ?, ?, ?)
            `)
            .run(
                plugin.id,
                '=HYPERLINK("https://example.test", "open")',
                '+value,with,commas',
                JSON.stringify({
                    platform:
                        '-Switch',
                    genre:
                        '@RPG',
                    publisher:
                        'Text with "quotes"',
                    developer:
                        'Line one\nLine two'
                })
            );

        const response =
            await context.app.inject({
                headers: {
                    authorization:
                        `Bearer ${user.token}`
                },
                method:
                    'GET',
                url:
                    '/api/exports/collections/games.csv'
            });

        assert.equal(
            response.statusCode,
            200
        );

        assert.match(
            response.payload,
            /"'=HYPERLINK\(""https:\/\/example\.test"", ""open""\)"/
        );

        assert.match(
            response.payload,
            /"'\+value,with,commas"/
        );

        assert.match(
            response.payload,
            /'-Switch/
        );

        assert.match(
            response.payload,
            /'@RPG/
        );

        assert.match(
            response.payload,
            /"Text with ""quotes"""/
        );

        assert.match(
            response.payload,
            /"Line one\nLine two"/
        );

    }
);

function authHeaders() {

    return {
        authorization:
            `Bearer ${token}`
    };

}
