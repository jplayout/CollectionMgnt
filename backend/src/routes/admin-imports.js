import multipart from '@fastify/multipart';

import {
    NativeImportService,
    NativeImportValidationError
} from '../services/native-import-service.js';

const MAX_NATIVE_IMPORT_SIZE =
    10 * 1024 * 1024;

export default async function (
    fastify
) {

    await fastify.register(
        multipart,
        {
            limits: {
                fileSize:
                    MAX_NATIVE_IMPORT_SIZE,
                files:
                    1
            }
        }
    );

    const service =
        new NativeImportService(
            fastify.db,
            fastify.pluginService
        );

    fastify.post(
        '/api/admin/imports/native-json',
        async (
            request,
            reply
        ) => {

            try {

                const document =
                    await parseNativeJsonFile(
                        request
                    );

                return service.importDocument(
                    document
                );

            } catch (error) {

                if (
                    error instanceof NativeImportValidationError ||
                    error?.code === 'FST_REQ_FILE_TOO_LARGE'
                ) {

                    return reply
                        .code(400)
                        .send({
                            error:
                                error?.code === 'FST_REQ_FILE_TOO_LARGE'
                                    ? 'Native import file exceeds the 10 MB limit.'
                                    : error.message
                        });

                }

                throw error;

            }

        }
    );

}

async function parseNativeJsonFile(request) {

    if (
        typeof request.isMultipart === 'function' &&
        !request.isMultipart()
    ) {

        throw new NativeImportValidationError(
            'Native import file is required.'
        );

    }

    const file =
        await request.file();

    if (
        !file
    ) {

        throw new NativeImportValidationError(
            'Native import file is required.'
        );

    }

    if (
        file.fieldname !== 'file'
    ) {

        throw new NativeImportValidationError(
            'Native import file field must be file.'
        );

    }

    const buffer =
        await file.toBuffer();

    if (
        buffer.length === 0
    ) {

        throw new NativeImportValidationError(
            'Native import file is empty.'
        );

    }

    try {

        return JSON.parse(
            buffer.toString(
                'utf8'
            )
        );

    } catch {

        throw new NativeImportValidationError(
            'Native import file must contain valid JSON.'
        );

    }

}
