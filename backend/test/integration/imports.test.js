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
                'regular-import-test-user'
        });

});

after(async () => {

    await context.close();

});

test(
    'POST /api/admin/imports/native-json rejects an invalid payload',
    async () => {

        const response =
            await context.app.inject({
                headers:
                    authHeaders(),
                method:
                    'POST',
                payload: {
                    invalid:
                        true
                },
                url:
                    '/api/admin/imports/native-json'
            });

        assert.equal(
            response.statusCode,
            400
        );

        assert.equal(
            typeof response.json().error,
            'string'
        );

    }
);

test(
    'POST /api/admin/imports/native-json rejects non-admin users',
    async () => {

        const response =
            await context.app.inject({
                headers: {
                    authorization:
                        `Bearer ${user.token}`
                },
                method:
                    'POST',
                payload: {
                    invalid:
                        true
                },
                url:
                    '/api/admin/imports/native-json'
            });

        assert.equal(
            response.statusCode,
            403
        );

    }
);

test(
    'POST /api/admin/imports/native-json rejects requests without a token',
    async () => {

        const response =
            await context.app.inject({
                method:
                    'POST',
                payload: {
                    invalid:
                        true
                },
                url:
                    '/api/admin/imports/native-json'
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
