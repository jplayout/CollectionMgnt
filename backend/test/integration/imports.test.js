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

function authHeaders() {

    return {
        authorization:
            `Bearer ${token}`
    };

}
