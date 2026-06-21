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

function authHeaders() {

    return {
        authorization:
            `Bearer ${token}`
    };

}
