import {
    UserRepository
} from '../repositories/user-repository.js';

import fastifyRateLimit from '@fastify/rate-limit';

import {
    verifyPassword
} from './password-service.js';

export default async function (
    fastify
) {

    const repository =
        new UserRepository(
            fastify.db
        );

    await fastify.register(
        fastifyRateLimit,
        {
            global:
                false
        }
    );

    fastify.post(
        '/api/auth/login',
        {
            config: {
                rateLimit: {
                    max:
                        5,
                    timeWindow:
                        '5 minutes'
                }
            }
        },
        async (
            request,
            reply
        ) => {

            const {
                username,
                password
            } = request.body ?? {};

            if (
                !username ||
                !password
            ) {

                return invalidCredentials(
                    reply
                );

            }

            const user =
                repository.findByUsername(
                    username
                );

            if (
                !user
            ) {

                return invalidCredentials(
                    reply
                );

            }

            const passwordMatches =
                await verifyPassword(
                    password,
                    user.password_hash
                );

            if (
                !passwordMatches
            ) {

                return invalidCredentials(
                    reply
                );

            }

            const safeUser =
                toSafeUser(
                    user
                );

            const token =
                fastify.jwt.sign(
                    {
                        id: user.id,
                        role: user.role,
                        username: user.username
                    },
                    {
                        expiresIn:
                            '8h'
                    }
                );

            return {
                token,
                user:
                    safeUser
            };

        }
    );

    fastify.get(
        '/api/auth/me',
        {
            preHandler:
                fastify.authenticate
        },
        async (
            request,
            reply
        ) => {

            const user =
                repository.findById(
                    request.user.id
                );

            if (
                !user
            ) {

                return reply
                    .code(401)
                    .send({
                        error:
                            'Unauthorized'
                    });

            }

            return {
                user
            };

        }
    );

    fastify.post(
        '/api/auth/logout',
        {
            preHandler:
                fastify.authenticate
        },
        async () => {

            return {
                success: true
            };

        }
    );

}

function invalidCredentials(
    reply
) {

    return reply
        .code(401)
        .send({
            error:
                'Invalid credentials'
        });

}

function toSafeUser(
    user
) {

    return {
        id:
            user.id,
        username:
            user.username,
        role:
            user.role,
        preferred_language:
            user.preferred_language,
        created_at:
            user.created_at,
        updated_at:
            user.updated_at
    };

}
