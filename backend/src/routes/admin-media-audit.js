import {
    MediaAuditService
} from '../services/media-audit-service.js';

export default async function (
    fastify
) {

    const service =
        new MediaAuditService(
            fastify.db
        );

    fastify.get(
        '/api/admin/media-audit',
        async () => service.runAudit()
    );

}
