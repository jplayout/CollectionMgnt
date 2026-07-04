import {
    MediaAuditService
} from '../services/media-audit-service.js';

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
        new MediaAuditService(
            fastify.db
        );

    fastify.get(
        '/api/admin/media-audit',
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
        async () => service.runAudit()
    );

}
