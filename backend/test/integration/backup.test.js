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
                'regular-backup-test-user'
        });

});

after(async () => {

    await context.close();

});

test(
    'GET /api/admin/backup.zip returns a ZIP backup response',
    async () => {

        const response =
            await context.app.inject({
                headers:
                    authHeaders(),
                method:
                    'GET',
                url:
                    '/api/admin/backup.zip'
            });

        assert.equal(
            response.statusCode,
            200
        );

        assert.match(
            response.headers['content-type'],
            /^application\/zip/
        );

        assert.match(
            response.headers['content-disposition'],
            /^attachment; filename="collectionmgnt-backup-/
        );

        assert.ok(
            response.rawPayload.length > 0
        );

    }
);

test(
    'GET /api/admin/backup.zip rejects non-admin users',
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
                    '/api/admin/backup.zip'
            });

        assert.equal(
            response.statusCode,
            403
        );

    }
);

test(
    'GET /api/admin/backup.zip rejects requests without a token',
    async () => {

        const response =
            await context.app.inject({
                method:
                    'GET',
                url:
                    '/api/admin/backup.zip'
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
