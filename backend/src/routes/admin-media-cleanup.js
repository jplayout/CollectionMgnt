import {
    MediaCleanupService
} from '../services/media-cleanup-service.js';

export default async function (
    fastify
) {

    const service =
        new MediaCleanupService(
            fastify.db
        );

    fastify.post(
        '/api/admin/media-cleanup/preview',
        async () => service.preview()
    );

    fastify.post(
        '/api/admin/media-cleanup/execute',
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
