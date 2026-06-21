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
    'GET /api/admin/system-summary returns the system summary',
    async () => {

        const response =
            await context.app.inject({
                headers:
                    authHeaders(),
                method:
                    'GET',
                url:
                    '/api/admin/system-summary'
            });

        assert.equal(
            response.statusCode,
            200
        );

        const body =
            response.json();

        assert.equal(
            typeof body.version,
            'string'
        );

        assert.equal(
            typeof body.counts.plugins,
            'number'
        );

        assert.equal(
            typeof body.counts.enabledPlugins,
            'number'
        );

        assert.equal(
            typeof body.counts.items,
            'number'
        );

        assert.equal(
            typeof body.counts.media,
            'number'
        );

    }
);

function authHeaders() {

    return {
        authorization:
            `Bearer ${token}`
    };

}
