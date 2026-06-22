import fastifyJwt from '@fastify/jwt';

export const MIN_JWT_SECRET_LENGTH =
    32;

export async function registerJwt(
    app
) {

    const secret =
        validateJwtSecret(
            process.env.JWT_SECRET
        );

    await app.register(
        fastifyJwt,
        {
            secret
        }
    );

    app.decorate(
        'authenticate',
        async (
            request,
            reply
        ) => {

            try {

                await request.jwtVerify();

            } catch {

                return reply
                    .code(401)
                    .send({
                        error:
                            'Unauthorized'
                    });

            }

        }
    );

    app.decorate(
        'requireAdmin',
        async (
            request,
            reply
        ) => {

            if (
                request.user?.role !== 'admin'
            ) {

                return reply
                    .code(403)
                    .send({
                        error:
                            'Forbidden'
                    });

            }

        }
    );

}

export function validateJwtSecret(secret) {

    if (
        typeof secret !== 'string' ||
        secret.trim() === ''
    ) {

        throw new Error(
            'JWT_SECRET is required'
        );

    }

    const normalizedSecret =
        secret.trim();

    if (
        normalizedSecret.length < MIN_JWT_SECRET_LENGTH
    ) {

        throw new Error(
            `JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters long`
        );

    }

    return normalizedSecret;

}
