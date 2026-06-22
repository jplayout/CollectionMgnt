import {
    ExportNotFoundError,
    ExportService
} from '../services/export-service.js';

export default async function (
    fastify
) {

    const service =
        new ExportService(
            fastify.db,
            fastify.pluginService
        );

    fastify.get(
        '/api/exports/application.json',
        {
            preHandler:
                fastify.requireAdmin
        },
        async (
            request,
            reply
        ) => {

            const payload =
                service.buildApplicationExport();

            sendJsonExport(
                reply,
                service.buildJsonFilename(),
                payload
            );

        }
    );

    fastify.get(
        '/api/exports/collections/:pluginId.json',
        async (
            request,
            reply
        ) => {

            try {

                const payload =
                    service.buildCollectionExport(
                        request.params.pluginId
                    );

                sendJsonExport(
                    reply,
                    service.buildJsonFilename(
                        request.params.pluginId
                    ),
                    payload
                );

            } catch (error) {

                return sendExportError(
                    error,
                    reply
                );

            }

        }
    );

    fastify.get(
        '/api/exports/collections/:pluginId.csv',
        async (
            request,
            reply
        ) => {

            try {

                const csv =
                    service.buildCollectionCsv(
                        request.params.pluginId
                    );

                return reply
                    .header(
                        'Content-Type',
                        'text/csv; charset=utf-8'
                    )
                    .header(
                        'Content-Disposition',
                        `attachment; filename="${service.buildCsvFilename(request.params.pluginId)}"`
                    )
                    .send(csv);

            } catch (error) {

                return sendExportError(
                    error,
                    reply
                );

            }

        }
    );

}

function sendJsonExport(
    reply,
    filename,
    payload
) {

    return reply
        .header(
            'Content-Type',
            'application/json; charset=utf-8'
        )
        .header(
            'Content-Disposition',
            `attachment; filename="${filename}"`
        )
        .send(
            JSON.stringify(
                payload,
                null,
                2
            )
        );

}

function sendExportError(
    error,
    reply
) {

    if (
        error instanceof ExportNotFoundError
    ) {

        return reply
            .code(404)
            .send({
                error:
                    error.message
            });

    }

    throw error;

}
