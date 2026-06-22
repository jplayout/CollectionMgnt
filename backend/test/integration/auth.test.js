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
            body.user.role,
            'admin'
        );

        assert.equal(
            body.user.password_hash,
            undefined
        );

    }
);

test(
    'GET /api/auth/me returns the authenticated user role',
    async () => {

        const token =
            await context.login();

        const response =
            await context.app.inject({
                headers: {
                    authorization:
                        `Bearer ${token}`
                },
                method:
                    'GET',
                url:
                    '/api/auth/me'
            });

        assert.equal(
            response.statusCode,
            200
        );

        assert.equal(
            response.json().user.role,
            'admin'
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
    'login returns 429 after repeated invalid attempts',
    async () => {

        const rateLimitedContext =
            await createTestApp();

        try {

            for (
                let attempt = 0;
                attempt < 5;
                attempt += 1
            ) {

                const response =
                    await rateLimitedContext.app.inject({
                        method:
                            'POST',
                        payload: {
                            password:
                                'wrong-password',
                            username:
                                rateLimitedContext.admin.username
                        },
                        url:
                            '/api/auth/login'
                    });

                assert.equal(
                    response.statusCode,
                    401
                );

            }

            const response =
                await rateLimitedContext.app.inject({
                    method:
                        'POST',
                    payload: {
                        password:
                            'wrong-password',
                        username:
                            rateLimitedContext.admin.username
                    },
                    url:
                        '/api/auth/login'
                });

            assert.equal(
                response.statusCode,
                429
            );

        } finally {

            await rateLimitedContext.close();

        }

    }
);

test(
    'login still accepts valid credentials before the rate limit is exceeded',
    async () => {

        const rateLimitedContext =
            await createTestApp();

        try {

            for (
                let attempt = 0;
                attempt < 4;
                attempt += 1
            ) {

                await rateLimitedContext.app.inject({
                    method:
                        'POST',
                    payload: {
                        password:
                            'wrong-password',
                        username:
                            rateLimitedContext.admin.username
                    },
                    url:
                        '/api/auth/login'
                });

            }

            const response =
                await rateLimitedContext.app.inject({
                    method:
                        'POST',
                    payload: {
                        password:
                            rateLimitedContext.admin.password,
                        username:
                            rateLimitedContext.admin.username
                    },
                    url:
                        '/api/auth/login'
                });

            assert.equal(
                response.statusCode,
                200
            );

        } finally {

            await rateLimitedContext.close();

        }

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
