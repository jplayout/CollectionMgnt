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

test(
    'initial admin bootstrap does not log the admin username',
    async () => {

        const originalLog =
            console.log;

        const logs =
            [];

        console.log = (
            ...args
        ) => {

            logs.push(
                args.join(
                    ' '
                )
            );

        };

        let context;

        try {

            context =
                await createTestApp();

        } finally {

            console.log =
                originalLog;

        }

        try {

            assert.ok(
                logs.includes(
                    'Initial admin user created.'
                )
            );

            assert.equal(
                logs.some(
                    log => log.includes(
                        `Initial admin user created: ${context.admin.username}`
                    )
                ),
                false
            );

        } finally {

            await context.close();

        }

    }
);
