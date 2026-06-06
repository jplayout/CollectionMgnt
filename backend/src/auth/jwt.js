import fastifyJwt from '@fastify/jwt';

export async function registerJwt(
    app
) {

    const secret =
        process.env.JWT_SECRET;

    if (
        !secret
    ) {

        throw new Error(
            'JWT_SECRET is required'
        );

    }

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

}
