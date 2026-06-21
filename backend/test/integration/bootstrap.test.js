import assert from 'node:assert/strict';
import {
    test
} from 'node:test';

import { createTestApp } from '../helpers/test-app.js';

test(
    'application bootstrap completes and the app is ready',
    async () => {

        const context =
            await createTestApp();

        try {

            assert.ok(
                context.app
            );

            assert.ok(
                context.db
            );

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

        } finally {

            await context.close();

        }

    }
);
