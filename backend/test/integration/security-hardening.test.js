import assert from 'node:assert/strict';
import {
    test
} from 'node:test';

import {
    validateJwtSecret
} from '../../src/auth/jwt.js';

import { createTestApp } from '../helpers/test-app.js';

test(
    'responses include baseline security headers',
    async () => {

        const context =
            await createTestApp();

        try {

            const response =
                await context.app.inject({
                    method:
                        'GET',
                    url:
                        '/api/admin/system-summary'
                });

            assert.equal(
                response.headers['x-frame-options'],
                'DENY'
            );

            assert.equal(
                response.headers['x-content-type-options'],
                'nosniff'
            );

            assert.equal(
                response.headers['referrer-policy'],
                'strict-origin-when-cross-origin'
            );

            assert.match(
                response.headers['permissions-policy'],
                /geolocation=\(\)/
            );

        } finally {

            await context.close();

        }

    }
);

test(
    'JWT_SECRET validation rejects missing or weak values',
    () => {

        assert.throws(
            () => validateJwtSecret(
                undefined
            ),
            /JWT_SECRET is required/
        );

        assert.throws(
            () => validateJwtSecret(
                'short-secret'
            ),
            /JWT_SECRET must be at least 32 characters long/
        );

    }
);

test(
    'JWT_SECRET validation accepts a sufficiently long value',
    () => {

        assert.equal(
            validateJwtSecret(
                'a-valid-test-secret-with-32-chars'
            ),
            'a-valid-test-secret-with-32-chars'
        );

    }
);
