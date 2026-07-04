import {
    MediaCleanupService
} from '../services/media-cleanup-service.js';

import fastifyRateLimit from '@fastify/rate-limit';

export default async function (
    fastify
) {

    await fastify.register(
        fastifyRateLimit,
        {
            global:
                false
        }
    );

    const service =
        new MediaCleanupService(
            fastify.db
        );

    fastify.post(
        '/api/admin/media-cleanup/preview',
        {
            config: {
                rateLimit: {
                    max:
                        5,
                    timeWindow:
                        '1 minute'
                }
            }
        },
        async () => service.preview()
    );

    fastify.post(
        '/api/admin/media-cleanup/execute',
        {
            config: {
                rateLimit: {
                    max:
                        5,
                    timeWindow:
                        '1 minute'
                }
            }
        },
        async (
            request,
            reply
        ) => {

            try {

                return await service.execute(
                    request.body?.candidateIds
                );

            } catch (error) {

                if (
                    error.statusCode
                ) {

                    return reply
                        .code(
                            error.statusCode
                        )
                        .send({
                            error:
                                error.message
                        });

                }

                throw error;

            }

        }
    );

}
