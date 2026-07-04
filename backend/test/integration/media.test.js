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
                'regular-media-test-user'
        });

});

after(async () => {

    await context.close();

});

test(
    'GET /api/admin/media-audit returns an audit report',
    async () => {

        const response =
            await context.app.inject({
                headers:
                    authHeaders(),
                method:
                    'GET',
                url:
                    '/api/admin/media-audit'
            });

        assert.equal(
            response.statusCode,
            200
        );

        const body =
            response.json();

        assert.equal(
            typeof body.scan_started_at,
            'string'
        );

        assert.equal(
            typeof body.summary.filesScanned,
            'number'
        );

        assert.ok(
            Array.isArray(body.warnings)
        );

    }
);

test(
    'GET /api/admin/media-audit rejects non-admin users',
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
                    '/api/admin/media-audit'
            });

        assert.equal(
            response.statusCode,
            403
        );

    }
);

test(
    'GET /api/admin/media-audit rejects requests without a token',
    async () => {

        const response =
            await context.app.inject({
                method:
                    'GET',
                url:
                    '/api/admin/media-audit'
            });

        assert.equal(
            response.statusCode,
            401
        );

    }
);

test(
    'GET /api/admin/media-audit is rate limited',
    async () => {

        const rateLimitedContext =
            await createTestApp();

        try {

            const rateLimitedToken =
                await rateLimitedContext.login();

            for (
                let index = 0;
                index < 5;
                index += 1
            ) {

                const response =
                    await rateLimitedContext.app.inject({
                        headers:
                            authHeaders(
                                rateLimitedToken
                            ),
                        method:
                            'GET',
                        url:
                            '/api/admin/media-audit'
                    });

                assert.equal(
                    response.statusCode,
                    200
                );

            }

            const response =
                await rateLimitedContext.app.inject({
                    headers:
                        authHeaders(
                            rateLimitedToken
                        ),
                    method:
                        'GET',
                    url:
                        '/api/admin/media-audit'
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
    'POST /api/admin/media-cleanup/preview rejects non-admin users',
    async () => {

        const response =
            await context.app.inject({
                headers: {
                    authorization:
                        `Bearer ${user.token}`
                },
                method:
                    'POST',
                url:
                    '/api/admin/media-cleanup/preview'
            });

        assert.equal(
            response.statusCode,
            403
        );

    }
);

test(
    'POST /api/admin/media-cleanup/preview rejects requests without a token',
    async () => {

        const response =
            await context.app.inject({
                method:
                    'POST',
                url:
                    '/api/admin/media-cleanup/preview'
            });

        assert.equal(
            response.statusCode,
            401
        );

    }
);

test(
    'POST /api/admin/media-cleanup/preview is rate limited',
    async () => {

        const rateLimitedContext =
            await createTestApp();

        try {

            const rateLimitedToken =
                await rateLimitedContext.login();

            for (
                let index = 0;
                index < 5;
                index += 1
            ) {

                const response =
                    await rateLimitedContext.app.inject({
                        headers:
                            authHeaders(
                                rateLimitedToken
                            ),
                        method:
                            'POST',
                        url:
                            '/api/admin/media-cleanup/preview'
                    });

                assert.equal(
                    response.statusCode,
                    200
                );

            }

            const response =
                await rateLimitedContext.app.inject({
                    headers:
                        authHeaders(
                            rateLimitedToken
                        ),
                    method:
                        'POST',
                    url:
                        '/api/admin/media-cleanup/preview'
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
    'POST /api/admin/media-cleanup/execute rejects non-admin users',
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
                    candidateIds:
                        []
                },
                url:
                    '/api/admin/media-cleanup/execute'
            });

        assert.equal(
            response.statusCode,
            403
        );

    }
);

test(
    'POST /api/admin/media-cleanup/execute is rate limited',
    async () => {

        const rateLimitedContext =
            await createTestApp();

        try {

            const rateLimitedToken =
                await rateLimitedContext.login();

            for (
                let index = 0;
                index < 5;
                index += 1
            ) {

                const response =
                    await rateLimitedContext.app.inject({
                        headers:
                            authHeaders(
                                rateLimitedToken
                            ),
                        method:
                            'POST',
                        payload: {
                            candidateIds:
                                []
                        },
                        url:
                            '/api/admin/media-cleanup/execute'
                    });

                assert.equal(
                    response.statusCode,
                    200
                );

            }

            const response =
                await rateLimitedContext.app.inject({
                    headers:
                        authHeaders(
                            rateLimitedToken
                        ),
                    method:
                        'POST',
                    payload: {
                        candidateIds:
                            []
                    },
                    url:
                        '/api/admin/media-cleanup/execute'
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
    'POST /api/admin/media-cleanup/preview returns a cleanup preview',
    async () => {

        const response =
            await context.app.inject({
                headers:
                    authHeaders(),
                method:
                    'POST',
                url:
                    '/api/admin/media-cleanup/preview'
            });

        assert.equal(
            response.statusCode,
            200
        );

        const body =
            response.json();

        assert.equal(
            typeof body.summary.candidateCount,
            'number'
        );

        assert.ok(
            Array.isArray(body.candidates)
        );

    }
);

test(
    'POST /api/admin/media-cleanup/execute accepts an empty candidate list',
    async () => {

        const response =
            await context.app.inject({
                headers:
                    authHeaders(),
                method:
                    'POST',
                payload: {
                    candidateIds:
                        []
                },
                url:
                    '/api/admin/media-cleanup/execute'
            });

        assert.equal(
            response.statusCode,
            200
        );

        const body =
            response.json();

        assert.equal(
            body.summary.requested,
            0
        );

        assert.equal(
            body.summary.deleted,
            0
        );

    }
);

function authHeaders(
    authToken = token
) {

    return {
        authorization:
            `Bearer ${authToken}`
    };

}
