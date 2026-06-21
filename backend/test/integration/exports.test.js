import assert from 'node:assert/strict';
import {
    after,
    before,
    test
} from 'node:test';

import { createTestApp } from '../helpers/test-app.js';

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

function authHeaders() {

    return {
        authorization:
            `Bearer ${token}`
    };

}
