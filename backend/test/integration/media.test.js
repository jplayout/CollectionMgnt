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

function authHeaders() {

    return {
        authorization:
            `Bearer ${token}`
    };

}
