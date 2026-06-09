import {
    BackupService
} from '../services/backup-service.js';

export default async function (
    fastify
) {

    const service =
        new BackupService(
            fastify.db,
            fastify.pluginService
        );

    fastify.get(
        '/api/admin/backup.zip',
        async (
            request,
            reply
        ) => {

            const {
                archive,
                filename
            } =
                await service.createBackupArchive();

            reply
                .header(
                    'Content-Type',
                    'application/zip'
                )
                .header(
                    'Content-Disposition',
                    `attachment; filename="${filename}"`
                );

            const response =
                reply.send(
                    archive
                );

            archive.finalize();

            return response;

        }
    );

}
