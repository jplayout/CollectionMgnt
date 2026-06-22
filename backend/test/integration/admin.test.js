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
                'regular-admin-test-user'
        });

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

test(
    'GET /api/admin/system-summary rejects non-admin users',
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
                    '/api/admin/system-summary'
            });

        assert.equal(
            response.statusCode,
            403
        );

    }
);

test(
    'GET /api/admin/system-summary rejects requests without a token',
    async () => {

        const response =
            await context.app.inject({
                method:
                    'GET',
                url:
                    '/api/admin/system-summary'
            });

        assert.equal(
            response.statusCode,
            401
        );

    }
);

function authHeaders() {

    return {
        authorization:
            `Bearer ${token}`
    };

}
