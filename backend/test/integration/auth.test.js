import assert from 'node:assert/strict';
import {
    after,
    before,
    test
} from 'node:test';

import { createTestApp } from '../helpers/test-app.js';

let context;

before(async () => {

    context =
        await createTestApp();

});

after(async () => {

    await context.close();

});

test(
    'login succeeds with the initial admin credentials',
    async () => {

        const response =
            await context.app.inject({
                method:
                    'POST',
                payload: {
                    password:
                        context.admin.password,
                    username:
                        context.admin.username
                },
                url:
                    '/api/auth/login'
            });

        assert.equal(
            response.statusCode,
            200
        );

        const body =
            response.json();

        assert.equal(
            typeof body.token,
            'string'
        );

        assert.equal(
            body.user.username,
            context.admin.username
        );

        assert.equal(
            body.user.password_hash,
            undefined
        );

    }
);

test(
    'login rejects invalid credentials',
    async () => {

        const response =
            await context.app.inject({
                method:
                    'POST',
                payload: {
                    password:
                        'wrong-password',
                    username:
                        context.admin.username
                },
                url:
                    '/api/auth/login'
            });

        assert.equal(
            response.statusCode,
            401
        );

        assert.equal(
            response.json().error,
            'Invalid credentials'
        );

    }
);

test(
    'protected routes reject requests without a token',
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

        assert.equal(
            response.json().error,
            'Unauthorized'
        );

    }
);
